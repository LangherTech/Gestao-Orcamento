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
        
    data = etapa.model_dump()
    data["created_by"] = user.get("id")
    
    # Format dates
    for field in ["data_prevista_inicio", "data_prevista_fim", "data_real_inicio", "data_real_fim"]:
        if data.get(field):
            data[field] = data[field].isoformat()
            
    if data.get("etapa_pai_id"):
        data["etapa_pai_id"] = str(data["etapa_pai_id"])

    res = supabase.table("etapas").insert(data).execute()
    return res.data[0]

@router.put("/etapas/{id}", response_model=dict)
async def update_etapa(id: UUID, etapa: EtapaUpdate, user: dict = Depends(get_current_user)):
    """Atualiza progresso e datas de uma etapa."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    data = etapa.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.now().isoformat()
    
    for field in ["data_prevista_inicio", "data_prevista_fim", "data_real_inicio", "data_real_fim"]:
        if field in data and data[field]:
            data[field] = data[field].isoformat()

    res = supabase.table("etapas").update(data).eq("id", str(id)).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=404, detail="Etapa não encontrada")

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
        
    data = checklist.model_dump()
    data["created_by"] = user.get("id")
    # Pydantic models parse nested lists of models to dicts, but let's ensure it's serializable to JSON
    # Supabase python client handles it well if it's a list of dicts.
    
    res = supabase.table("checklists").insert(data).execute()
    return res.data[0]
