from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.calendario import AlocacaoBase, FuncionarioResponse, FuncionarioBase
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/calendario", tags=["Calendário e Equipe"])

@router.get("/funcionarios", response_model=List[dict])
async def list_funcionarios(user: dict = Depends(get_current_user)):
    """Lista colaboradores próprios CLT."""
    supabase = get_supabase_client()
    if supabase:
        # Pega funcionários e junta com profissões se possível, ou apenas os dados base
        res = supabase.table("funcionarios").select("*").order("nome").execute()
        return res.data
    return []

@router.post("/funcionarios", response_model=dict)
async def create_funcionario(funcionario: FuncionarioBase, user: dict = Depends(get_current_user)):
    """Adiciona novo colaborador."""
    supabase = get_supabase_client()
    data = funcionario.model_dump()
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    if supabase:
        res = supabase.table("funcionarios").insert(data).execute()
        return res.data[0]
    raise HTTPException(status_code=500, detail="Database unavailable")

@router.get("/alocacoes", response_model=List[dict])
async def list_alocacoes(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Lista alocações de colaboradores em obras."""
    supabase = get_supabase_client()
    if supabase:
        query = supabase.table("calendario_alocacoes").select(
            "*, funcionarios(nome), obras(nome)"
        )
        if obra_id:
            query = query.eq("obra_id", str(obra_id))
        res = query.order("data_inicio").execute()
        
        # Mapeando a resposta para facilitar no front-end
        formatted = []
        for item in res.data:
            formatted.append({
                "id": item["id"],
                "obra_id": item["obra_id"],
                "obra": item.get("obras", {}).get("nome", "Obra Desconhecida") if item.get("obras") else "Obra Desconhecida",
                "funcionario_id": item["funcionario_id"],
                "funcionario_nome": item.get("funcionarios", {}).get("nome", "Desconhecido") if item.get("funcionarios") else "Desconhecido",
                "data_inicio": item["data_inicio"],
                "data_fim": item["data_fim"],
                "periodo": item["periodo"]
            })
        return formatted
    return []

@router.post("/alocacoes", response_model=dict)
async def create_alocacao(alocacao: AlocacaoBase, user: dict = Depends(get_current_user)):
    """Cria nova alocação."""
    supabase = get_supabase_client()
    data = alocacao.model_dump()
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    # converte datas para string
    data["data_inicio"] = data["data_inicio"].isoformat()
    data["data_fim"] = data["data_fim"].isoformat()
    data["obra_id"] = str(data["obra_id"])
    data["funcionario_id"] = str(data["funcionario_id"])
    
    if supabase:
        res = supabase.table("calendario_alocacoes").insert(data).execute()
        return res.data[0]
    raise HTTPException(status_code=500, detail="Database unavailable")
