from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from ..models.obras import (
    ObraCreate, ObraUpdate, ObraResponse,
    ObraStatusUpdate, ObraArquivarUpdate
)
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/obras", tags=["Obras"])

@router.get("", response_model=List[dict])
async def list_obras(
    busca: Optional[str] = Query(None, description="Busca unificada por nome da obra, cliente ou endereço"),
    search: Optional[str] = Query(None, description="Alias para busca"),
    status: Optional[str] = Query(None, description="Filtrar por status: ativa ou concluida"),
    arquivada: Optional[str] = Query(None, description="Filtro de arquivamento: 'true', 'false', 'todas'/'all'. Padrão 'false' na listagem padrão."),
    user: dict = Depends(get_current_user)
):
    """
    Lista e busca obras cadastradas.
    - Se houver termo de busca, a pesquisa é global (busca sobre todas as obras, sem excluir arquivadas).
    - Se não houver busca, por padrão filtra obras não arquivadas (arquivada=false).
    """
    supabase = get_supabase_client()
    if not supabase:
        return []

    query = supabase.table("obras").select("*")
    termo = (busca or search or "").strip()

    # REGRA CRÍTICA DE BUSCA:
    # A pesquisa por texto SEMPRE retorna a obra, esteja ela arquivada ou não.
    if termo:
        query = query.or_(f"nome.ilike.%{termo}%,cliente.ilike.%{termo}%,endereco.ilike.%{termo}%")
        # Se na busca foi explicitado um filtro específico de arquivamento
        if arquivada is not None:
            arq_clean = arquivada.lower().strip()
            if arq_clean in ("true", "1", "sim", "arquivadas"):
                query = query.eq("arquivada", True)
            elif arq_clean in ("false", "0", "nao", "não", "ativas"):
                query = query.eq("arquivada", False)
            # se for 'all' ou 'todas', não filtra arquivada
    else:
        # Listagem padrão (sem termo de busca):
        if arquivada is not None:
            arq_clean = arquivada.lower().strip()
            if arq_clean in ("true", "1", "sim", "arquivadas"):
                query = query.eq("arquivada", True)
            elif arq_clean in ("all", "todas"):
                pass  # Não filtra por arquivada
            else:
                query = query.eq("arquivada", False)
        else:
            # Padrão: apenas obras não arquivadas
            query = query.eq("arquivada", False)

    # Filtro de status (se informado)
    if status:
        st_clean = status.lower().strip()
        if st_clean in ("ativa", "concluida"):
            query = query.eq("status", st_clean)

    res = query.order("created_at", desc=True).execute()
    return res.data or []

@router.post("", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_obra(obra: ObraCreate, user: dict = Depends(get_current_user)):
    """Cadastra uma nova obra."""
    supabase = get_supabase_client()
    data = obra.model_dump()
    
    # Validação do status: obra iniciada só pode ser ativa ou concluida
    if data.get("status") not in ("ativa", "concluida"):
        data["status"] = "ativa"
    data["arquivada"] = bool(data.get("arquivada", False))

    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)

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
        if res.data:
            return res.data[0]
    raise HTTPException(status_code=500, detail="Database connection unavailable")

@router.put("/{id}", response_model=dict)
async def update_obra(id: UUID, obra_update: ObraUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados e orçamentos de uma obra."""
    supabase = get_supabase_client()
    update_data = {k: v for k, v in obra_update.model_dump().items() if v is not None}
    
    if "status" in update_data:
        st = update_data["status"].lower().strip()
        if st not in ("ativa", "concluida"):
            raise HTTPException(status_code=400, detail="Status inválido. Permitidos: 'ativa' ou 'concluida'.")
        update_data["status"] = st
        if st == "concluida" and not update_data.get("data_real_fim"):
            update_data["data_real_fim"] = date.today().isoformat()
        elif st == "ativa" and "data_real_fim" not in update_data:
            update_data["data_real_fim"] = None

    update_data["updated_at"] = datetime.utcnow().isoformat()

    if supabase:
        res = supabase.table("obras").update(update_data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    raise HTTPException(status_code=500, detail="Database connection unavailable")

@router.patch("/{id}/status", response_model=dict)
async def update_obra_status(id: UUID, payload: ObraStatusUpdate, user: dict = Depends(get_current_user)):
    """
    Alterna o status da obra entre 'ativa' e 'concluida'.
    Ao concluir: preenche data_real_fim automaticamente com a data de hoje.
    Ao reabrir: limpa data_real_fim.
    """
    supabase = get_supabase_client()
    st = payload.status.lower().strip()
    if st not in ("ativa", "concluida"):
        raise HTTPException(status_code=400, detail="Status inválido. Permitidos apenas 'ativa' ou 'concluida'.")

    update_data = {
        "status": st,
        "updated_at": datetime.utcnow().isoformat()
    }
    if st == "concluida":
        update_data["data_real_fim"] = date.today().isoformat()
    else:
        update_data["data_real_fim"] = None

    if supabase:
        res = supabase.table("obras").update(update_data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    raise HTTPException(status_code=500, detail="Database connection unavailable")

@router.patch("/{id}/arquivar", response_model=dict)
async def toggle_arquivar_obra(
    id: UUID, 
    payload: Optional[ObraArquivarUpdate] = None, 
    user: dict = Depends(get_current_user)
):
    """
    Ação rápida para arquivar ou desarquivar uma obra (com 1 clique).
    Se payload.arquivada for omitido, inverte o status atual de arquivamento.
    """
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    # Busca valor atual se não especificado no payload
    if payload is None or payload.arquivada is None:
        curr = supabase.table("obras").select("arquivada").eq("id", str(id)).execute()
        if not curr.data:
            raise HTTPException(status_code=404, detail="Obra não encontrada")
        novo_arquivada = not bool(curr.data[0].get("arquivada", False))
    else:
        novo_arquivada = bool(payload.arquivada)

    update_data = {
        "arquivada": novo_arquivada,
        "updated_at": datetime.utcnow().isoformat()
    }

    res = supabase.table("obras").update(update_data).eq("id", str(id)).execute()
    if res.data:
        return res.data[0]
    raise HTTPException(status_code=404, detail="Obra não encontrada")

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

@router.delete("/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_obra(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui uma obra."""
    supabase = get_supabase_client()
    if supabase:
        supabase.table("obras").delete().eq("id", str(id)).execute()
        return None
    raise HTTPException(status_code=500, detail="Database connection unavailable")
