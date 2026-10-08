from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException, status as http_status
from ..models.gestao import (
    EmpreiteiroBase, EmpreiteiroUpdate, EmpreiteiroResponse, 
    ContratoEmpreiteiroBase, PagamentoTerceiroCreate
)
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
from pydantic import BaseModel
from datetime import datetime
import logging

logger = logging.getLogger("edifica.gestao")

router = APIRouter(prefix="/gestao", tags=["Gestão de Empreiteiros"])



@router.get("/empreiteiros", response_model=List[dict])
async def list_empreiteiros(busca: Optional[str] = Query(None), user: dict = Depends(get_current_user)):
    """Lista todos os empreiteiros cadastrados, incluindo informações de contratos."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        query = supabase.table("empreiteiros").select("*, contratos_empreiteiro(id, valor_total, status, obra_id, obras(nome))").order("nome")
        if busca and busca.strip():
            b = busca.strip()
            query = query.or_(f"nome.ilike.%{b}%,area_atuacao.ilike.%{b}%,telefone.ilike.%{b}%,cpf_cnpj.ilike.%{b}%")

        res = query.execute()
        empreiteiros = res.data or []
        for e in empreiteiros:
            contratos = e.get("contratos_empreiteiro") or []
            e["total_contratos"] = len(contratos)
            e["contratos_ativos"] = len([c for c in contratos if c.get("status") == "ativo"])
            e["valor_total_contratado"] = sum(float(c.get("valor_total") or 0) for c in contratos)
        return empreiteiros
    except Exception as e:
        logger.error(f"Erro ao listar empreiteiros: {e}")
        # Fallback para consulta simples caso o join apresente inconsistência
        res = supabase.table("empreiteiros").select("*").order("nome").execute()
        return res.data or []

@router.post("/empreiteiros", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_empreiteiro(emp: EmpreiteiroBase, user: dict = Depends(get_current_user)):
    """Cadastra um novo empreiteiro / parceiro."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    data = emp.model_dump(mode="json")
    data["created_by"] = None if user.get("is_mock") else user.get("id")

    try:
        res = supabase.table("empreiteiros").insert(data).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=400, detail="Erro ao inserir empreiteiro")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cadastrar empreiteiro: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar empreiteiro: {str(e)}")

@router.put("/empreiteiros/{id}", response_model=dict)
async def update_empreiteiro(id: UUID, emp_update: EmpreiteiroUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados de um empreiteiro existente."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    update_data = {k: v for k, v in emp_update.model_dump(mode="json").items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização")

    try:
        res = supabase.table("empreiteiros").update(update_data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Empreiteiro não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar empreiteiro {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar empreiteiro: {str(e)}")

@router.delete("/empreiteiros/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_empreiteiro(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui um empreiteiro (caso não tenha contratos vinculados impeditivos)."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        # Verifica se possui contratos
        check_contratos = supabase.table("contratos_empreiteiro").select("id").eq("empreiteiro_id", str(id)).execute()
        if check_contratos.data and len(check_contratos.data) > 0:
            raise HTTPException(
                status_code=400, 
                detail="Não é possível excluir este empreiteiro pois existem contratos vinculados a ele. Cancele ou remova os contratos primeiro."
            )

        supabase.table("empreiteiros").delete().eq("id", str(id)).execute()
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao excluir empreiteiro {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir empreiteiro: {str(e)}")

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
    data["created_by"] = None if user.get("is_mock") else user.get("id")
    if data.get("obra_id"): data["obra_id"] = str(data["obra_id"])
    if data.get("empreiteiro_id"): data["empreiteiro_id"] = str(data["empreiteiro_id"])
    if data.get("data_assinatura"): data["data_assinatura"] = data["data_assinatura"].isoformat()
    if data.get("data_termino"): data["data_termino"] = data["data_termino"].isoformat()
    
    res = supabase.table("contratos_empreiteiro").insert(data).execute()
    return res.data[0]

@router.post("/pagamentos", response_model=dict)
async def create_pagamento(pag: PagamentoTerceiroCreate, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="DB Error")
    data = pag.model_dump()
    db_data = {
        "created_by": None if user.get("is_mock") else user.get("id"),
        "contrato_id": str(data["contrato_id"]),
        "data_medicao": data["data_pagamento"],
        "valor_pagar": data["valor_pago"],
        "tipo_pagamento": data["tipo_pagamento"],
        "anexo_url": data["anexo_url"],
        "observacoes": data["observacoes"]
    }
    
    res = supabase.table("medicoes_empreiteiro").insert(db_data).execute()
    if res.data:
        medicao = res.data[0]
        
        # Injeta no fluxo de caixa pequeno (Custo da Obra)
        try:
            contrato_res = supabase.table("contratos_empreiteiro").select("obra_id, empreiteiros(nome)").eq("id", db_data["contrato_id"]).single().execute()
            if contrato_res.data:
                obra_id = contrato_res.data.get("obra_id")
                empreiteiro_nome = contrato_res.data.get("empreiteiros", {}).get("nome", "Terceiro") if contrato_res.data.get("empreiteiros") else "Terceiro"
                
                caixa_data = {
                    "obra_id": obra_id,
                    "tipo": "despesa",
                    "categoria": "Terceirizados",
                    "descricao": f"Pagamento Terceiro: {empreiteiro_nome}",
                    "valor": db_data["valor_pagar"],
                    "data_registro": db_data["data_medicao"],
                    "status": "realizado",
                    "metodo_pagamento": db_data.get("tipo_pagamento", "Transferência"),
                    "referencia_id": medicao["id"]
                }
                if not user.get("is_mock"):
                    caixa_data["created_by"] = user.get("id")
                supabase.table("caixa_pequeno").insert(caixa_data).execute()
        except Exception as e:
            pass # Apenas ignora falha silenciosa de caixa para nao falhar o pagamento base

        return medicao
    raise HTTPException(status_code=400, detail="Erro ao registrar pagamento")

@router.patch("/contratos/{id}/status", response_model=dict)
async def update_contrato_status(id: UUID, status_data: dict, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    status = status_data.get("status")
    arquivado = status_data.get("arquivado")
    
    update_data = {}
    if status is not None: update_data["status"] = status
    if arquivado is not None: update_data["arquivado"] = arquivado
    
    res = supabase.table("contratos_empreiteiro").update(update_data).eq("id", str(id)).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=404, detail="Contrato não encontrado")

@router.delete("/contratos/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_contrato(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    res = supabase.table("contratos_empreiteiro").delete().eq("id", str(id)).execute()
    return None

@router.delete("/pagamentos/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_pagamento(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    # Primeiro deleta do caixa pequeno (Estorno)
    supabase.table("caixa_pequeno").delete().eq("referencia_id", str(id)).execute()
    # Em seguida deleta a medição
    supabase.table("medicoes_empreiteiro").delete().eq("id", str(id)).execute()
    return None
