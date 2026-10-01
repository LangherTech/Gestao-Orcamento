from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from ..models.obras import ObraCreate, ObraUpdate, ObraResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/obras", tags=["Obras"])

@router.get("", response_model=List[dict])
async def list_obras(
    status: Optional[str] = Query(None, description="Filtrar por status: ativa, concluida, cancelada"),
    user: dict = Depends(get_current_user)
):
    """Lista todas as obras cadastradas."""
    supabase = get_supabase_client()
    if supabase:
        query = supabase.table("obras").select("*")
        if status:
            query = query.eq("status", status)
        res = query.order("created_at", desc=True).execute()
        return res.data
    return []

@router.post("", response_model=dict)
async def create_obra(obra: ObraCreate, user: dict = Depends(get_current_user)):
    """Cadastra uma nova obra."""
    supabase = get_supabase_client()
    data = obra.model_dump()
    data["created_by"] = user.get("id")
    # Se o total foi informado mas as categorias não, distribuímos automaticamente
    total = float(data.get("valor_aprovado") or 0)
    mat = float(data.get("orcamento_materiais") or 0)
    emp = float(data.get("orcamento_empreiteiros") or 0)
    cax = float(data.get("orcamento_caixa") or 0)
    if total > 0 and mat == 0 and emp == 0 and cax == 0:
        data["orcamento_materiais"] = round(total * 0.55, 2)
        data["orcamento_empreiteiros"] = round(total * 0.40, 2)
        data["orcamento_caixa"] = round(total * 0.05, 2)
        
    if supabase:
        res = supabase.table("obras").insert(data).execute()
        return res.data[0]
    raise HTTPException(status_code=500, detail="Database connection unavailable")

@router.put("/{id}", response_model=dict)
async def update_obra(id: UUID, obra_update: ObraUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados e orçamentos de uma obra."""
    supabase = get_supabase_client()
    update_data = {k: v for k, v in obra_update.model_dump().items() if v is not None}
    
    if supabase:
        res = supabase.table("obras").update(update_data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    raise HTTPException(status_code=500, detail="Database connection unavailable")

@router.get("/{id}", response_model=dict)
async def get_obra(id: UUID, user: dict = Depends(get_current_user)):
    """Obtém detalhes de uma obra."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("obras").select("*").eq("id", str(id)).single().execute()
        if res.data:
            return res.data
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    raise HTTPException(status_code=404, detail="Obra não encontrada")
