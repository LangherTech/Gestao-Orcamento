from typing import List, Optional
from uuid import UUID, uuid4
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from ..models.rdo import RDOCreate, RDOUpdate, RDOResponse, RDOFotoCreate, RDOFotoResponse
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client, get_db_connection
import logging

logger = logging.getLogger("edifica.rdo")

router = APIRouter(prefix="/rdo", tags=["Diário de Obra (RDO)"])


def _serialize_rdo_row(rdo: dict, fotos: list = None, obras_map: dict = None) -> dict:
    """Helper para formatar o objeto RDO com dados da obra e fotos."""
    obra_id = rdo.get("obra_id")
    obra_info = (obras_map or {}).get(str(obra_id)) if obra_id else None

    # Garante que equipe_presente seja sempre uma lista
    equipe = rdo.get("equipe_presente") or []
    if isinstance(equipe, str):
        equipe = [item.strip() for item in equipe.split(",") if item.strip()]

    return {
        "id": rdo.get("id"),
        "obra_id": obra_id,
        "obra_nome": obra_info.get("nome") if obra_info else "Obra Avulsa / Geral",
        "obra_cliente": obra_info.get("cliente") if obra_info else None,
        "data": rdo.get("data"),
        "equipe_presente": equipe,
        "total_trabalhadores": rdo.get("total_trabalhadores") or len(equipe) or 0,
        "atividades_realizadas": rdo.get("atividades_realizadas") or "",
        "materiais_utilizados": rdo.get("materiais_utilizados") or "",
        "equipamentos": rdo.get("equipamentos") or "",
        "condicoes_climaticas": rdo.get("condicoes_climaticas") or "Ensolarado",
        "clima_manha": rdo.get("clima_manha") or "Ensolarado",
        "clima_tarde": rdo.get("clima_tarde") or "Ensolarado",
        "status_trabalho": rdo.get("status_trabalho") or "praticavel",
        "dds_tema": rdo.get("dds_tema") or "",
        "ocorrencias": rdo.get("ocorrencias") or "",
        "observacoes": rdo.get("observacoes") or "",
        "fotos": fotos or [],
        "created_by": rdo.get("created_by"),
        "created_at": rdo.get("created_at"),
        "updated_at": rdo.get("updated_at"),
    }


@router.get("", response_model=List[dict])
async def list_rdos(
    obra_id: Optional[UUID] = Query(None, description="Filtrar por obra"),
    data_inicio: Optional[date] = Query(None, description="Data inicial do apontamento"),
    data_fim: Optional[date] = Query(None, description="Data final do apontamento"),
    search: Optional[str] = Query(None, description="Busca textual em atividades ou materiais"),
    user: dict = Depends(get_current_user)
):
    """Lista todos os Diários de Obra registrados com filtros."""
    supabase = get_supabase_client()
    if not supabase:
        return []

    try:
        # 1. Mapa de obras para enriquecimento rápido
        obras_res = supabase.table("obras").select("id, nome, cliente").execute()
        obras_map = {str(o["id"]): o for o in (obras_res.data or [])}

        # 2. Query de RDOs
        query = supabase.table("rdo").select("*").order("data", desc=True).order("created_at", desc=True)

        if obra_id:
            query = query.eq("obra_id", str(obra_id))
        if data_inicio:
            query = query.gte("data", str(data_inicio))
        if data_fim:
            query = query.lte("data", str(data_fim))

        res = query.execute()
        rdos_data = res.data or []

        if not rdos_data:
            return []

        # 3. Buscar fotos vinculadas
        rdo_ids = [str(r["id"]) for r in rdos_data]
        fotos_res = supabase.table("rdo_fotos").select("*").in_("rdo_id", rdo_ids).order("uploaded_at", desc=False).execute()
        fotos_data = fotos_res.data or []

        fotos_by_rdo = {}
        for f in fotos_data:
            r_id = str(f["rdo_id"])
            if r_id not in fotos_by_rdo:
                fotos_by_rdo[r_id] = []
            fotos_by_rdo[r_id].append(f)

        # 4. Filtro em memória de search (se aplicável)
        resultado = []
        for r in rdos_data:
            serialized = _serialize_rdo_row(r, fotos=fotos_by_rdo.get(str(r["id"]), []), obras_map=obras_map)
            if search:
                s_lower = search.lower()
                matches = (
                    s_lower in (serialized["atividades_realizadas"] or "").lower() or
                    s_lower in (serialized["materiais_utilizados"] or "").lower() or
                    s_lower in (serialized["equipamentos"] or "").lower() or
                    s_lower in (serialized["ocorrencias"] or "").lower() or
                    s_lower in (serialized["obra_nome"] or "").lower()
                )
                if not matches:
                    continue
            resultado.append(serialized)

        return resultado
    except Exception as e:
        logger.error(f"Erro ao listar RDOs: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao consultar Diários de Obra: {str(e)}")


@router.get("/{rdo_id}", response_model=dict)
async def get_rdo(rdo_id: UUID, user: dict = Depends(get_current_user)):
    """Retorna detalhes completos de um Diário de Obra."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    try:
        res = supabase.table("rdo").select("*").eq("id", str(rdo_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Diário de Obra não encontrado.")

        rdo = res.data[0]

        # Obter obras e fotos
        obras_res = supabase.table("obras").select("id, nome, cliente").execute()
        obras_map = {str(o["id"]): o for o in (obras_res.data or [])}

        fotos_res = supabase.table("rdo_fotos").select("*").eq("rdo_id", str(rdo_id)).order("uploaded_at").execute()

        return _serialize_rdo_row(rdo, fotos=fotos_res.data or [], obras_map=obras_map)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar RDO {rdo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar RDO: {str(e)}")


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_rdo(payload: RDOCreate, user: dict = Depends(get_current_user)):
    """Cria um novo Diário de Obra (RDO) com suporte a fotos."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    data = payload.model_dump()
    fotos = data.pop("fotos", [])

    # Trata obra_id: se fornecido, valida se existe; senão define como None
    if data.get("obra_id"):
        try:
            check_obra = supabase.table("obras").select("id").eq("id", str(data["obra_id"])).execute()
            if not check_obra.data:
                data["obra_id"] = None
            else:
                data["obra_id"] = str(data["obra_id"])
        except Exception:
            data["obra_id"] = None
    else:
        data["obra_id"] = None

    data["data"] = str(data["data"])
    data["created_by"] = None if user.get("is_mock") else user.get("id")

    # Calcula total_trabalhadores se não informado
    if not data.get("total_trabalhadores") and data.get("equipe_presente"):
        data["total_trabalhadores"] = len(data["equipe_presente"])

    try:
        # Inserção do RDO
        res = supabase.table("rdo").insert(data).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Falha ao inserir Diário de Obra.")

        created_rdo = res.data[0]
        rdo_id = created_rdo["id"]

        # Inserção das fotos
        inserted_fotos = []
        if fotos:
            for f in fotos:
                foto_record = {
                    "rdo_id": rdo_id,
                    "url": f["url"],
                    "descricao": f.get("descricao") or None
                }
                f_res = supabase.table("rdo_fotos").insert(foto_record).execute()
                if f_res.data:
                    inserted_fotos.append(f_res.data[0])

        # Enriquecimento com obra
        obras_res = supabase.table("obras").select("id, nome, cliente").execute()
        obras_map = {str(o["id"]): o for o in (obras_res.data or [])}

        return _serialize_rdo_row(created_rdo, fotos=inserted_fotos, obras_map=obras_map)

    except Exception as e:
        logger.error(f"Erro ao criar RDO no Supabase: {e}")
        # Tratamento de chave única (obra_id, data)
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=409,
                detail="Já existe um Diário de Obra cadastrado para esta obra nesta mesma data."
            )
        raise HTTPException(status_code=500, detail=f"Erro ao salvar RDO: {str(e)}")


@router.put("/{rdo_id}", response_model=dict)
async def update_rdo(rdo_id: UUID, payload: RDOUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados e fotos de um Diário de Obra existente."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    data = payload.model_dump(exclude_unset=True)
    fotos = data.pop("fotos", None)

    if not data and fotos is None:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização.")

    if "obra_id" in data and data["obra_id"]:
        try:
            check_obra = supabase.table("obras").select("id").eq("id", str(data["obra_id"])).execute()
            if not check_obra.data:
                data["obra_id"] = None
            else:
                data["obra_id"] = str(data["obra_id"])
        except Exception:
            data["obra_id"] = None

    if "data" in data and data["data"]:
        data["data"] = str(data["data"])

    data["updated_at"] = datetime.utcnow().isoformat()

    try:
        if data:
            res = supabase.table("rdo").update(data).eq("id", str(rdo_id)).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Diário de Obra não encontrado.")
            updated_rdo = res.data[0]
        else:
            current = supabase.table("rdo").select("*").eq("id", str(rdo_id)).execute()
            if not current.data:
                raise HTTPException(status_code=404, detail="Diário de Obra não encontrado.")
            updated_rdo = current.data[0]

        # Sincronização de fotos se fornecido
        if fotos is not None:
            # Remove fotos antigas e insere as novas da lista
            supabase.table("rdo_fotos").delete().eq("rdo_id", str(rdo_id)).execute()
            for f in fotos:
                supabase.table("rdo_fotos").insert({
                    "rdo_id": str(rdo_id),
                    "url": f["url"],
                    "descricao": f.get("descricao") or None
                }).execute()

        # Busca fotos atuais
        fotos_res = supabase.table("rdo_fotos").select("*").eq("rdo_id", str(rdo_id)).order("uploaded_at").execute()

        obras_res = supabase.table("obras").select("id, nome, cliente").execute()
        obras_map = {str(o["id"]): o for o in (obras_res.data or [])}

        return _serialize_rdo_row(updated_rdo, fotos=fotos_res.data or [], obras_map=obras_map)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar RDO {rdo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar RDO: {str(e)}")


@router.delete("/{rdo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rdo(rdo_id: UUID, user: dict = Depends(get_current_user)):
    """Remove um Diário de Obra e todas as fotos vinculadas."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    try:
        # A remoção em cascata no Postgres já remove rdo_fotos
        res = supabase.table("rdo").delete().eq("id", str(rdo_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Diário de Obra não encontrado.")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao excluir RDO {rdo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao excluir RDO: {str(e)}")


@router.post("/{rdo_id}/fotos", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_foto_to_rdo(rdo_id: UUID, foto: RDOFotoCreate, user: dict = Depends(get_current_user)):
    """Adiciona uma foto avulsa ao Diário de Obra."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    try:
        # Verifica se o RDO existe
        check = supabase.table("rdo").select("id").eq("id", str(rdo_id)).execute()
        if not check.data:
            raise HTTPException(status_code=404, detail="Diário de Obra não encontrado.")

        record = {
            "rdo_id": str(rdo_id),
            "url": foto.url,
            "descricao": foto.descricao
        }
        res = supabase.table("rdo_fotos").insert(record).execute()
        return res.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao adicionar foto ao RDO {rdo_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao adicionar foto: {str(e)}")


@router.delete("/{rdo_id}/fotos/{foto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_foto_from_rdo(rdo_id: UUID, foto_id: UUID, user: dict = Depends(get_current_user)):
    """Remove uma foto específica de um Diário de Obra."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase indisponível.")

    try:
        res = supabase.table("rdo_fotos").delete().eq("id", str(foto_id)).eq("rdo_id", str(rdo_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Foto não encontrada neste Diário de Obra.")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao remover foto {foto_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao remover foto: {str(e)}")
