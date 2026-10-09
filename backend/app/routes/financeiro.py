from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.financeiro import ReceitaCreate, CaixaPequenoCreate
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from datetime import datetime

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

@router.get("/fluxo", response_model=dict)
def get_fluxo(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Retorna o resumo do fluxo de caixa e centros de custo por obra."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    query_receitas = supabase.table("receitas").select("valor, status")
    query_caixa_pequeno = supabase.table("caixa_pequeno").select("valor, status, referencia_id")
    query_obras = supabase.table("obras").select("valor_aprovado")
    query_funcionarios = supabase.table("pagamentos_funcionarios").select("valor_pago")
    query_compras = supabase.table("pedidos_compra").select("valor_total, status")
    
    if obra_id:
        query_receitas = query_receitas.eq("obra_id", str(obra_id))
        query_caixa_pequeno = query_caixa_pequeno.eq("obra_id", str(obra_id))
        query_obras = query_obras.eq("id", str(obra_id))
        query_funcionarios = query_funcionarios.eq("obra_id", str(obra_id))
        query_compras = query_compras.eq("obra_id", str(obra_id))

    receitas_res = query_receitas.execute()
    caixa_res = query_caixa_pequeno.execute()
    obras_res = query_obras.execute()
    funcionarios_res = query_funcionarios.execute()
    compras_res = query_compras.execute()
    
    receita_recebida = sum(r["valor"] for r in receitas_res.data if r["status"] == "recebido")
    receita_prevista = sum(o["valor_aprovado"] or 0 for o in obras_res.data) if obras_res.data else 0
    despesa_caixa_pequeno = sum(c["valor"] for c in caixa_res.data if c["status"] == "aprovado")
    despesa_funcionarios = sum(f["valor_pago"] for f in funcionarios_res.data)
    
    # Compras de materiais e insumos (pedidos aprovados, recebidos ou pagos)
    despesa_compras = sum(c.get("valor_total") or 0 for c in compras_res.data if c.get("status") in ["aprovado", "recebido", "pago", "entregue"])
    despesa_empreiteiros = 0
    despesa_total = despesa_caixa_pequeno + despesa_compras + despesa_empreiteiros + despesa_funcionarios
    saldo_operacional = receita_recebida - despesa_total
    
    margem_atual_pct = 0
    if receita_recebida > 0:
        margem_atual_pct = (saldo_operacional / receita_recebida) * 100

    return {
        "obra_id": str(obra_id) if obra_id else None,
        "receita_prevista": receita_prevista,
        "receita_recebida": receita_recebida,
        "despesa_compras": despesa_compras,
        "despesa_empreiteiros": despesa_empreiteiros,
        "despesa_caixa_pequeno": despesa_caixa_pequeno,
        "despesa_funcionarios": despesa_funcionarios,
        "despesa_total": despesa_total,
        "saldo_operacional": saldo_operacional,
        "margem_atual_pct": round(margem_atual_pct, 2)
    }

@router.get("/receitas", response_model=List[dict])
def list_receitas(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Lista receitas e faturamentos."""
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    query = supabase.table("receitas").select("*")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    
    res = query.order("data_receita", desc=True).execute()
    return res.data

@router.post("/receitas", response_model=dict)
def create_receita(item: ReceitaCreate, user: dict = Depends(get_current_user)):
    """Lança um novo recebimento."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = item.model_dump()
    data["created_by"] = None if user.get("is_mock") else user.get("id")
    data["data_receita"] = data["data_receita"].isoformat()
    
    res = supabase.table("receitas").insert(data).execute()
    return res.data[0]

@router.get("/caixa-pequeno", response_model=List[dict])
def list_caixa_pequeno(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Lista as despesas imediatas de canteiro."""
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    query = supabase.table("caixa_pequeno").select("*")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    
    res = query.order("data", desc=True).execute()
    return res.data

@router.post("/caixa-pequeno", response_model=dict)
def create_caixa_pequeno(item: CaixaPequenoCreate, user: dict = Depends(get_current_user)):
    """Registra uma nova despesa no caixa pequeno de obra."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = item.model_dump()
    user_id = user.get("id")
    data["created_by"] = None if user.get("is_mock") else user_id
    data["data"] = data["data"].isoformat()
    
    res = supabase.table("caixa_pequeno").insert(data).execute()
    return res.data[0]

@router.put("/caixa-pequeno/{id}", response_model=dict)
def approve_caixa_pequeno(id: UUID, status: str = Query(..., description="aprovado, pendente_aprovacao"), user: dict = Depends(get_current_user)):
    """Aprova ou reprova despesa de caixa pequeno."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    data = {
        "status": status,
        "approved_by": user.get("id") if status == "aprovado" else None,
        "approved_at": datetime.now().isoformat() if status == "aprovado" else None
    }
    
    res = supabase.table("caixa_pequeno").update(data).eq("id", str(id)).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=404, detail="Despesa não encontrada")

@router.get("/orcado-x-realizado", response_model=dict)
def get_orcado_realizado(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Comparativo de orçado vs realizado."""
    return get_fluxo(obra_id=obra_id, user=user)
