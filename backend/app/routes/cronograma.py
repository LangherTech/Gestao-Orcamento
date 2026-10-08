from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.cronograma import EtapaCreate, EtapaUpdate, EtapaResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from datetime import datetime

router = APIRouter(prefix="/cronograma", tags=["Cronograma"])

@router.get("/etapas", response_model=List[dict])
async def list_etapas(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Retorna as etapas hierárquicas e percentual de avanço."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    query = supabase.table("etapas").select("*")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    
    res = query.order("data_prevista_inicio", desc=False).execute()
    return res.data

@router.get("/etapas/{id}", response_model=dict)
async def get_etapa(id: UUID, user: dict = Depends(get_current_user)):
    """Detalhe de uma etapa."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    res = supabase.table("etapas").select("*").eq("id", str(id)).single().execute()
    if res.data:
        return res.data
    raise HTTPException(status_code=404, detail="Etapa não encontrada")

@router.post("/etapas", response_model=dict)
async def create_etapa(etapa: EtapaCreate, user: dict = Depends(get_current_user)):
    """Cria uma nova etapa."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = etapa.model_dump(mode="json")
    user_id = user.get("id")
    data["created_by"] = None if user.get("is_mock") else (str(user_id) if user_id else None)
    
    try:
        res = supabase.table("etapas").insert(data).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=400, detail="Falha ao criar etapa no banco de dados.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar etapa: {str(e)}")

@router.put("/etapas/{id}", response_model=dict)
async def update_etapa(id: UUID, etapa: EtapaUpdate, user: dict = Depends(get_current_user)):
    """Atualiza progresso e datas de uma etapa."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = etapa.model_dump(mode="json", exclude_unset=True)
    data["updated_at"] = datetime.now().isoformat()

    try:
        res = supabase.table("etapas").update(data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar etapa: {str(e)}")

@router.delete("/etapas/{id}")
async def delete_etapa(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui uma etapa."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    try:
        supabase.table("etapas").delete().eq("id", str(id)).execute()
        return {"message": "Etapa excluída com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir etapa: {str(e)}")

