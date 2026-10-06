from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.cronograma import EtapaCreate, EtapaUpdate, EtapaResponse, ChecklistCreate, ChecklistUpdate, ChecklistResponse
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

@router.get("/checklists", response_model=List[dict])
async def list_checklists(etapa_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Lista checklists de qualidade."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    query = supabase.table("checklists").select("*")
    if etapa_id:
        query = query.eq("etapa_id", str(etapa_id))
    
    res = query.order("created_at", desc=False).execute()
    return res.data

@router.post("/checklists", response_model=dict)
async def create_checklist(checklist: ChecklistCreate, user: dict = Depends(get_current_user)):
    """Cria um novo checklist."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = checklist.model_dump(mode="json")
    user_id = user.get("id")
    data["created_by"] = None if user.get("is_mock") else (str(user_id) if user_id else None)
    
    try:
        res = supabase.table("checklists").insert(data).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=400, detail="Falha ao criar checklist.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar checklist: {str(e)}")

@router.put("/checklists/{id}", response_model=dict)
async def update_checklist(id: UUID, checklist: ChecklistUpdate, user: dict = Depends(get_current_user)):
    """Atualiza itens de um checklist."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = checklist.model_dump(mode="json", exclude_unset=True)
    try:
        res = supabase.table("checklists").update(data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Checklist não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar checklist: {str(e)}")

@router.delete("/checklists/{id}")
async def delete_checklist(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui um checklist."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    try:
        supabase.table("checklists").delete().eq("id", str(id)).execute()
        return {"message": "Checklist excluído com sucesso"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao excluir checklist: {str(e)}")
