from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.visitas import VisitaCreate, VisitaUpdate, VisitaResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from datetime import date
from uuid import UUID

router = APIRouter(prefix="/visitas", tags=["Visitas / Prospecção"])

@router.get("", response_model=List[dict])
async def list_visitas(
    socio_id: Optional[str] = None,
    classificacao: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    busca: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Lista todas as visitas cadastradas com suporte a filtros combinados."""
    supabase = get_supabase_client()
    if supabase:
        query = supabase.table("visitas").select("*").order("data_visita", desc=True)
        if socio_id and socio_id.lower() not in ["todos", "all"]:
            query = query.eq("visitado_por", socio_id)
        if classificacao and classificacao.lower() not in ["todas", "all"]:
            query = query.eq("classificacao", classificacao)
        if data_inicio:
            query = query.gte("data_visita", data_inicio)
        if data_fim:
            query = query.lte("data_visita", data_fim)
        if busca:
            query = query.ilike("nome", f"%{busca}%")
            
        res = query.execute()
        return res.data
    return []

@router.get("/{id}", response_model=dict)
async def get_visita(id: UUID, user: dict = Depends(get_current_user)):
    """Retorna detalhes de uma visita específica."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("visitas").select("*").eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Visita não encontrada")
    raise HTTPException(status_code=500, detail="Database unavailable")

@router.post("", response_model=dict)
async def create_visita(visita: VisitaCreate, user: dict = Depends(get_current_user)):
    """Cadastra uma nova visita (prospecção)."""
    supabase = get_supabase_client()
    data = visita.model_dump(exclude_unset=True)
    
    # Preenche cadastrado_por
    if not user.get("is_mock"):
        data["cadastrado_por"] = user.get("id")
        # Se visitado_por não informado, assume quem está logado
        if not data.get("visitado_por"):
            data["visitado_por"] = user.get("id")
            
    if "data_visita" in data and data["data_visita"]:
        data["data_visita"] = data["data_visita"].isoformat() if hasattr(data["data_visita"], "isoformat") else str(data["data_visita"])
    if "data_retorno" in data and data["data_retorno"]:
        data["data_retorno"] = data["data_retorno"].isoformat() if hasattr(data["data_retorno"], "isoformat") else str(data["data_retorno"])
    if data.get("visitado_por"):
        data["visitado_por"] = str(data["visitado_por"])
        
    if not data.get("telefone") and data.get("contato"):
        data["telefone"] = data["contato"]
    elif not data.get("contato") and data.get("telefone"):
        data["contato"] = data["telefone"]
        
    if supabase:
        res = supabase.table("visitas").insert(data).execute()
        return res.data[0]
    raise HTTPException(status_code=500, detail="Database unavailable")

@router.put("/{id}", response_model=dict)
async def update_visita(id: UUID, visita: VisitaUpdate, user: dict = Depends(get_current_user)):
    """Atualiza os dados de uma visita/cliente."""
    supabase = get_supabase_client()
    data = visita.model_dump(exclude_unset=True)
    
    if "data_visita" in data and data["data_visita"]:
        data["data_visita"] = data["data_visita"].isoformat() if hasattr(data["data_visita"], "isoformat") else str(data["data_visita"])
    if "data_retorno" in data and data["data_retorno"]:
        data["data_retorno"] = data["data_retorno"].isoformat() if hasattr(data["data_retorno"], "isoformat") else str(data["data_retorno"])
    if data.get("visitado_por"):
        data["visitado_por"] = str(data["visitado_por"])
        
    if "telefone" in data and not data.get("contato"):
        data["contato"] = data["telefone"]
        
    if supabase:
        res = supabase.table("visitas").update(data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Visita não encontrada para atualização")
    raise HTTPException(status_code=500, detail="Database unavailable")

@router.delete("/{id}")
async def delete_visita(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui definitivamente o registro de uma visita/cliente."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("visitas").delete().eq("id", str(id)).execute()
        return {"message": "Visita excluída com sucesso", "id": str(id)}
    raise HTTPException(status_code=500, detail="Database unavailable")
