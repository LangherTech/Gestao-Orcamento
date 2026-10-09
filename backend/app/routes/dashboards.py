from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/dashboards", tags=["Dashboards Executivos"])

@router.get("/kpis")
async def get_kpis(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Retorna os 4 cards de KPIs principais com dados reais do banco."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database error")

    # Filtros de obras
    obras_query = supabase.table("obras").select("id, valor_aprovado, valor_pendente_aprovacao, status")
    if obra_id:
        obras_query = obras_query.eq("id", str(obra_id))
    obras_res = obras_query.execute()
    obras = obras_res.data
    
    obras_ids = [str(o["id"]) for o in obras]
    obras_ativas_count = sum(1 for o in obras if o.get("status") == "ativa")
    
    receita_total = sum(float(o.get("valor_aprovado") or 0) for o in obras)
    
    despesas_totais = 0
    if obras_ids:
        # Caixa Pequeno
        caixa_query = supabase.table("caixa_pequeno").select("valor").in_("obra_id", obras_ids).eq("status", "aprovado").execute()
        despesas_totais += sum(float(c.get("valor") or 0) for c in caixa_query.data)
        
        # Pedidos Compra (assumindo que se aprovado/recebido/pago entra como despesa executada/projetada)
        compras_query = supabase.table("pedidos_compra").select("valor_total").in_("obra_id", obras_ids).in_("status", ["aprovado", "recebido", "pago"]).execute()
        despesas_totais += sum(float(c.get("valor_total") or 0) for c in compras_query.data)
        
        # Contratos (para pegar as medições)
        contratos_query = supabase.table("contratos_empreiteiro").select("id").in_("obra_id", obras_ids).execute()
        contratos_ids = [str(c["id"]) for c in contratos_query.data]
        if contratos_ids:
            medicoes_query = supabase.table("medicoes_empreiteiro").select("valor_pagar").in_("contrato_id", contratos_ids).execute()
            despesas_totais += sum(float(m.get("valor_pagar") or 0) for m in medicoes_query.data)
            
        # Funcionários
        funcionarios_query = supabase.table("pagamentos_funcionarios").select("valor_pago").in_("obra_id", obras_ids).execute()
        despesas_totais += sum(float(f.get("valor_pago") or 0) for f in funcionarios_query.data)
            
    lucro_projetado = receita_total - despesas_totais
    margem_media_pct = 0
    if receita_total > 0:
        margem_media_pct = (lucro_projetado / receita_total) * 100
        
    return {
        "obra_id": str(obra_id) if obra_id else None,
        "receita_total": round(receita_total, 2),
        "despesas_totais": round(despesas_totais, 2),
        "lucro_projetado": round(lucro_projetado, 2),
        "margem_media_pct": round(margem_media_pct, 2),
        "obras_ativas": obras_ativas_count,
        "percentual_geral_conclusao": 0 # Temporariamente 0 se não tivermos etapas no banco local
    }

@router.get("/lucratividade-por-obra")
async def get_lucratividade_por_obra(user: dict = Depends(get_current_user)):
    """Retorna o ranking de lucratividade e margem das obras ativas."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database error")

    obras_res = supabase.table("obras").select("id, nome, valor_aprovado").eq("status", "ativa").execute()
    obras = obras_res.data
    
    resultados = []
    
    for obra in obras:
        obra_id = str(obra["id"])
        receita = float(obra.get("valor_aprovado") or 0)
        
        despesa_caixa = 0
        caixa_query = supabase.table("caixa_pequeno").select("valor").eq("obra_id", obra_id).eq("status", "aprovado").execute()
        despesa_caixa = sum(float(c.get("valor") or 0) for c in caixa_query.data)
        
        despesa_compras = 0
        compras_query = supabase.table("pedidos_compra").select("valor_total").eq("obra_id", obra_id).in_("status", ["aprovado", "recebido", "pago"]).execute()
        despesa_compras = sum(float(c.get("valor_total") or 0) for c in compras_query.data)
        
        despesa_medicoes = 0
        contratos_query = supabase.table("contratos_empreiteiro").select("id").eq("obra_id", obra_id).execute()
        contratos_ids = [str(c["id"]) for c in contratos_query.data]
        if contratos_ids:
            medicoes_query = supabase.table("medicoes_empreiteiro").select("valor_pagar").in_("contrato_id", contratos_ids).execute()
            despesa_medicoes = sum(float(m.get("valor_pagar") or 0) for m in medicoes_query.data)
            
        despesa_funcionarios = 0
        funcionarios_query = supabase.table("pagamentos_funcionarios").select("valor_pago").eq("obra_id", obra_id).execute()
        despesa_funcionarios = sum(float(f.get("valor_pago") or 0) for f in funcionarios_query.data)
            
        despesa_total = despesa_caixa + despesa_compras + despesa_medicoes + despesa_funcionarios
        lucro = receita - despesa_total
        margem = (lucro / receita * 100) if receita > 0 else 0
        
        resultados.append({
            "obra_nome": obra["nome"],
            "receita": round(receita, 2),
            "despesa": round(despesa_total, 2),
            "lucro": round(lucro, 2),
            "margem_pct": round(margem, 2)
        })
        
    return sorted(resultados, key=lambda x: x["margem_pct"], reverse=True)

@router.get("/orcado-vs-realizado")
async def get_orcado_vs_realizado(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Retorna os valores orçados vs realizados por categoria (Materiais, Empreiteiros, Caixa Pequeno)."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database error")

    obras_query = supabase.table("obras").select("id, valor_aprovado, orcamento_materiais, orcamento_empreiteiros, orcamento_caixa")
    if obra_id:
        obras_query = obras_query.eq("id", str(obra_id))
    obras_res = obras_query.execute()
    obras = obras_res.data or []

    obras_ids = [str(o["id"]) for o in obras]

    orcado_materiais = 0.0
    orcado_empreiteiros = 0.0
    orcado_caixa = 0.0

    for o in obras:
        total = float(o.get("valor_aprovado") or 0)
        mat = float(o.get("orcamento_materiais") or 0)
        emp = float(o.get("orcamento_empreiteiros") or 0)
        cax = float(o.get("orcamento_caixa") or 0)

        # Se as categorias não foram preenchidas mas existe orçamento total, faz fallback proporcional
        if mat == 0 and emp == 0 and cax == 0 and total > 0:
            mat = round(total * 0.55, 2)
            emp = round(total * 0.40, 2)
            cax = round(total * 0.05, 2)

        orcado_materiais += mat
        orcado_empreiteiros += emp
        orcado_caixa += cax

    realizado_materiais = 0.0
    realizado_empreiteiros = 0.0
    realizado_caixa = 0.0
    realizado_funcionarios = 0.0
    orcado_funcionarios = 0.0

    if obras_ids:
        # Caixa Pequeno
        caixa_query = supabase.table("caixa_pequeno").select("valor").in_("obra_id", obras_ids).eq("status", "aprovado").execute()
        realizado_caixa = sum(float(c.get("valor") or 0) for c in (caixa_query.data or []))

        # Pedidos Compra (Materiais)
        compras_query = supabase.table("pedidos_compra").select("valor_total").in_("obra_id", obras_ids).in_("status", ["aprovado", "recebido", "pago"]).execute()
        realizado_materiais = sum(float(c.get("valor_total") or 0) for c in (compras_query.data or []))

        # Empreiteiros
        contratos_query = supabase.table("contratos_empreiteiro").select("id").in_("obra_id", obras_ids).execute()
        contratos_ids = [str(c["id"]) for c in (contratos_query.data or [])]
        if contratos_ids:
            medicoes_query = supabase.table("medicoes_empreiteiro").select("valor_pagar").in_("contrato_id", contratos_ids).execute()
            realizado_empreiteiros = sum(float(m.get("valor_pagar") or 0) for m in (medicoes_query.data or []))

        # Funcionários (Mão de Obra Própria)
        funcionarios_query = supabase.table("pagamentos_funcionarios").select("valor_pago").in_("obra_id", obras_ids).execute()
        realizado_funcionarios = sum(float(f.get("valor_pago") or 0) for f in (funcionarios_query.data or []))

    def calc_pct(real, orc):
        if orc <= 0:
            return 100.0 if real > 0 else 0.0
        return round((real / orc) * 100, 1)

    return [
        {
            "id": "materiais",
            "categoria": "Materiais & Compras",
            "realizado": round(realizado_materiais, 2),
            "orcado": round(orcado_materiais, 2),
            "pct": calc_pct(realizado_materiais, orcado_materiais),
            "cor": "bg-blue-500",
            "excedeu": realizado_materiais > orcado_materiais
        },
        {
            "id": "empreiteiros",
            "categoria": "Empreiteiros & Terceirizados",
            "realizado": round(realizado_empreiteiros, 2),
            "orcado": round(orcado_empreiteiros, 2),
            "pct": calc_pct(realizado_empreiteiros, orcado_empreiteiros),
            "cor": "bg-amber-500",
            "excedeu": realizado_empreiteiros > orcado_empreiteiros
        },
        {
            "id": "funcionarios",
            "categoria": "Mão de Obra Própria (Funcionários)",
            "realizado": round(realizado_funcionarios, 2),
            "orcado": round(orcado_funcionarios, 2),
            "pct": calc_pct(realizado_funcionarios, orcado_funcionarios),
            "cor": "bg-purple-500",
            "excedeu": realizado_funcionarios > orcado_funcionarios
        },
        {
            "id": "caixa",
            "categoria": "Caixa Pequeno do Canteiro",
            "realizado": round(realizado_caixa, 2),
            "orcado": round(orcado_caixa, 2),
            "pct": calc_pct(realizado_caixa, orcado_caixa),
            "cor": "bg-emerald-500",
            "excedeu": realizado_caixa > orcado_caixa
        }
    ]

