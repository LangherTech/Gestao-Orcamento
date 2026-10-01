from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.gestao import EmpreiteiroBase, EmpreiteiroResponse, ContratoEmpreiteiroBase
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/gestao", tags=["Gestão de Empreiteiros"])

class MedicaoCreate(BaseModel):
    contrato_id: UUID
    data_medicao: str
    quantidade_executada: float
    preco_unitario: float

@router.get("/empreiteiros", response_model=List[dict])
async def list_empreiteiros(user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    res = supabase.table("empreiteiros").select("*").order("nome").execute()
    return res.data

@router.post("/empreiteiros", response_model=dict)
async def create_empreiteiro(emp: EmpreiteiroBase, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    data = emp.model_dump()
    data["created_by"] = user.get("id")
    res = supabase.table("empreiteiros").insert(data).execute()
    return res.data[0]

@router.get("/contratos", response_model=List[dict])
async def list_contratos(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    query = supabase.table("contratos_empreiteiro").select("*, empreiteiros(nome, telefone, area_atuacao), obras(nome)")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    res = query.order("created_at", desc=True).execute()
    
    contratos = res.data
    for c in contratos:
        c["empreiteiro_nome"] = c.get("empreiteiros", {}).get("nome") if c.get("empreiteiros") else ""
        c["telefone"] = c.get("empreiteiros", {}).get("telefone") if c.get("empreiteiros") else ""
        c["area"] = c.get("empreiteiros", {}).get("area_atuacao") if c.get("empreiteiros") else ""
        c["obra_nome"] = c.get("obras", {}).get("nome") if c.get("obras") else ""
        
        # Obter medições
        med_res = supabase.table("medicoes_empreiteiro").select("valor_pagar").eq("contrato_id", c["id"]).execute()
        medido = sum(m["valor_pagar"] for m in med_res.data) if med_res.data else 0
        c["medido_ate_agora"] = medido
        
    return contratos

@router.post("/contratos", response_model=dict)
async def create_contrato(contrato: ContratoEmpreiteiroBase, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    data = contrato.model_dump()
    data["created_by"] = user.get("id")
    if data.get("obra_id"): data["obra_id"] = str(data["obra_id"])
    if data.get("empreiteiro_id"): data["empreiteiro_id"] = str(data["empreiteiro_id"])
    if data.get("data_assinatura"): data["data_assinatura"] = data["data_assinatura"].isoformat()
    if data.get("data_termino"): data["data_termino"] = data["data_termino"].isoformat()
    
    res = supabase.table("contratos_empreiteiro").insert(data).execute()
    return res.data[0]

@router.post("/medicoes", response_model=dict)
async def create_medicao(med: MedicaoCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    data = med.model_dump()
    data["created_by"] = user.get("id")
    data["contrato_id"] = str(data["contrato_id"])
    data["valor_pagar"] = data["quantidade_executada"] * data["preco_unitario"]
    
    res = supabase.table("medicoes_empreiteiro").insert(data).execute()
    return res.data[0]
