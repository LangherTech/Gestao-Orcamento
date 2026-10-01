from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from ..models.compras import PedidoCompraCreate, PedidoCompraResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/compras", tags=["Compras"])

class FornecedorCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None

@router.get("/fornecedores", response_model=List[dict])
async def list_fornecedores(user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    res = supabase.table("fornecedores").select("*").order("nome").execute()
    return res.data

@router.post("/fornecedores", response_model=dict)
async def create_fornecedor(forn: FornecedorCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    data = forn.model_dump()
    data["created_by"] = user.get("id")
    res = supabase.table("fornecedores").insert(data).execute()
    return res.data[0]

@router.get("/pedidos", response_model=List[dict])
async def list_pedidos(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    query = supabase.table("pedidos_compra").select("*, fornecedores(nome), obras(nome)")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    res = query.order("data_pedido", desc=True).execute()
    
    pedidos = res.data
    for p in pedidos:
        p["fornecedor_nome"] = p.get("fornecedores", {}).get("nome") if p.get("fornecedores") else "Não informado"
        p["obra_nome"] = p.get("obras", {}).get("nome") if p.get("obras") else "Não informado"
        
        itens_res = supabase.table("pedido_itens").select("*").eq("pedido_id", p["id"]).execute()
        p["itens_lista"] = itens_res.data
        
    return pedidos

@router.post("/pedidos", response_model=dict)
async def create_pedido(pedido: PedidoCompraCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    
    data = pedido.model_dump(exclude={"itens"})
    data["created_by"] = user.get("id")
    if data.get("obra_id"): data["obra_id"] = str(data["obra_id"])
    if data.get("fornecedor_id"): data["fornecedor_id"] = str(data["fornecedor_id"])
    
    if not data.get("numero"):
        import random
        data["numero"] = f"PC-{datetime.now().year}-{random.randint(1000, 9999)}"
        
    data["data_pedido"] = data["data_pedido"].isoformat()
    if data.get("data_entrega_prevista"):
        data["data_entrega_prevista"] = data["data_entrega_prevista"].isoformat()
        
    res = supabase.table("pedidos_compra").insert(data).execute()
    novo_pedido = res.data[0]
    
    itens = pedido.itens
    if itens:
        itens_data = []
        for i in itens:
            i_dict = i.model_dump()
            i_dict["pedido_id"] = novo_pedido["id"]
            itens_data.append(i_dict)
        supabase.table("pedido_itens").insert(itens_data).execute()
        
    return novo_pedido

@router.put("/pedidos/{id}/status")
async def update_pedido_status(id: UUID, status: str = Query(...), user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    
    data = {"status": status, "updated_at": datetime.now().isoformat()}
    res = supabase.table("pedidos_compra").update(data).eq("id", str(id)).execute()
    return res.data[0]
