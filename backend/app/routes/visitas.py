from typing import List
from fastapi import APIRouter, Depends, HTTPException
from ..models.visitas import VisitaCreate, VisitaResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from datetime import date

router = APIRouter(prefix="/visitas", tags=["Visitas / Prospecção"])

@router.get("", response_model=List[dict])
async def list_visitas(user: dict = Depends(get_current_user)):
    """Lista todas as visitas cadastradas (com o nome de quem visitou se houver)."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("visitas").select("*").order("data_visita", desc=True).execute()
        return res.data
    return []

@router.post("", response_model=dict)
async def create_visita(visita: VisitaCreate, user: dict = Depends(get_current_user)):
    """Cadastra uma nova visita (prospecção)."""
    supabase = get_supabase_client()
    data = visita.model_dump()
    
    # Preenche cadastrado_por
    if not user.get("is_mock"):
        data["cadastrado_por"] = user.get("id")
        
        # Se 'visitado_por' não foi preenchido explicitamente na interface, 
        # assume quem está logado como visitador padrão (Regra de Negócio)
        if not data.get("visitado_por"):
            data["visitado_por"] = user.get("id")
            
    # Converte datas e UUIDs para string
    data["data_visita"] = data["data_visita"].isoformat()
    if data.get("visitado_por"):
        data["visitado_por"] = str(data["visitado_por"])
        
    if supabase:
        res = supabase.table("visitas").insert(data).execute()
        return res.data[0]
    raise HTTPException(status_code=500, detail="Database unavailable")
