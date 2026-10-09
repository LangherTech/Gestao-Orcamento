from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status as http_status
from ..models.calendario import (
    FuncionarioBase, FuncionarioUpdate, FuncionarioResponse,
    ProfissaoCreate, ProfissaoUpdate, ProfissaoResponse,
    AlocacaoBase, AlocacaoUpdate, AlocacaoResponse,
    EquipeBase, EquipeResponse,
    PagamentoFuncionarioBase, PagamentoFuncionarioResponse,
    FaltaCreate, FaltaResponse
)
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
import logging

logger = logging.getLogger("edifica.calendario")

router = APIRouter(prefix="/calendario", tags=["Calendário e Equipe"])

DEFAULT_PROFISSOES = [
    "Mestre de Obras",
    "Encarregado de Obras",
    "Pedreiro",
    "Servente / Ajudante de Obras",
    "Eletricista",
    "Encanador / Bombeiro Hidráulico",
    "Gesseiro / Montador de Drywall",
    "Pintor",
    "Azulejista / Revestidor",
    "Carpinteiro / Armador",
    "Telhadista / Calheiro",
    "Impermeabilizador",
    "Serralheiro",
    "Marceneiro",
    "Soldador"
]

# ========================================================
# CRUD: CATÁLOGO DE PROFISSÕES
# ========================================================
@router.get("/profissoes", response_model=List[dict])
async def list_profissoes(user: dict = Depends(get_current_user)):
    """Lista catálogo de profissões padronizadas com total de funcionários vinculados."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        res = supabase.table("profissoes").select("*, funcionario_profissoes(funcionario_id)").order("nome").execute()
        profissoes = res.data or []
        
        # Se a tabela estiver vazia, auto-popula com as profissões padrão da construção civil
        if not profissoes:
            try:
                seed_data = [{"nome": nome} for nome in DEFAULT_PROFISSOES]
                supabase.table("profissoes").insert(seed_data).execute()
                res = supabase.table("profissoes").select("*, funcionario_profissoes(funcionario_id)").order("nome").execute()
                profissoes = res.data or []
            except Exception as e_seed:
                logger.warning(f"Aviso ao auto-popular profissões padrão: {e_seed}")

        for p in profissoes:
            fps = p.get("funcionario_profissoes") or []
            p["total_funcionarios"] = len(fps)
        return profissoes
    except Exception as e:
        logger.error(f"Erro ao listar profissoes com contagem: {e}")
        res = supabase.table("profissoes").select("*").order("nome").execute()
        profissoes = res.data or []
        for p in profissoes:
            p["total_funcionarios"] = 0
        return profissoes

@router.post("/profissoes", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_profissao(profissao: ProfissaoCreate, user: dict = Depends(get_current_user)):
    """Adiciona nova profissão ao catálogo com validação case-insensitive."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    nome_clean = profissao.nome.strip()
    if not nome_clean:
        raise HTTPException(status_code=400, detail="Nome da profissão não pode ser vazio.")

    # Validação case-insensitive
    try:
        existing = supabase.table("profissoes").select("id, nome").ilike("nome", nome_clean).execute()
        for row in (existing.data or []):
            if row.get("nome", "").strip().lower() == nome_clean.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"A profissão '{row.get('nome')}' já existe no catálogo."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Aviso na checagem de duplicidade: {e}")

    insert_data = {"nome": nome_clean}
    if not user.get("is_mock"):
        insert_data["created_by"] = user.get("id")

    try:
        res = supabase.table("profissoes").insert(insert_data).execute()
        if res.data:
            data = res.data[0]
            data["total_funcionarios"] = 0
            return data
        raise HTTPException(status_code=400, detail="Erro ao inserir profissão.")
    except HTTPException:
        raise
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"A profissão '{nome_clean}' já existe no catálogo.")
        logger.error(f"Erro ao criar profissão: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao criar profissão: {str(e)}")

@router.put("/profissoes/{id}", response_model=dict)
async def update_profissao(id: UUID, profissao_update: ProfissaoUpdate, user: dict = Depends(get_current_user)):
    """Atualiza nome da profissão com validação case-insensitive contra duplicidade."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    nome_clean = profissao_update.nome.strip()
    if not nome_clean:
        raise HTTPException(status_code=400, detail="Nome da profissão não pode ser vazio.")

    # Validação case-insensitive
    try:
        existing = supabase.table("profissoes").select("id, nome").ilike("nome", nome_clean).execute()
        for row in (existing.data or []):
            if str(row.get("id")) != str(id) and row.get("nome", "").strip().lower() == nome_clean.lower():
                raise HTTPException(
                    status_code=400,
                    detail=f"Outra profissão com o nome '{row.get('nome')}' já existe no catálogo."
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Aviso na checagem de duplicidade na edição: {e}")

    try:
        res = supabase.table("profissoes").update({"nome": nome_clean}).eq("id", str(id)).execute()
        if res.data:
            data = res.data[0]
            fps = supabase.table("funcionario_profissoes").select("funcionario_id").eq("profissao_id", str(id)).execute()
            data["total_funcionarios"] = len(fps.data or [])
            return data
        raise HTTPException(status_code=404, detail="Profissão não encontrada.")
    except HTTPException:
        raise
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail=f"A profissão '{nome_clean}' já existe no catálogo.")
        logger.error(f"Erro ao atualizar profissão {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar profissão: {str(e)}")

@router.delete("/profissoes/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_profissao(id: UUID, user: dict = Depends(get_current_user)):
    """Remove profissão do catálogo desvinculando colaboradores com total segurança."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        # Desvincula de funcionários (relação N:N)
        supabase.table("funcionario_profissoes").delete().eq("profissao_id", str(id)).execute()
        # Remove do catálogo
        supabase.table("profissoes").delete().eq("id", str(id)).execute()
        return None
    except Exception as e:
        logger.error(f"Erro ao excluir profissão {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir profissão: {str(e)}")


# ========================================================
# CRUD: FUNCIONÁRIOS / COLABORADORES
# ========================================================
@router.get("/funcionarios", response_model=List[dict])
async def list_funcionarios(
    busca: Optional[str] = Query(None, description="Busca por nome, cargo, telefone ou CPF"),
    user: dict = Depends(get_current_user)
):
    """Lista colaboradores próprios CLT com resumo de alocações e especializações."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        query = supabase.table("funcionarios").select(
            "*, calendario_alocacoes(id, obra_id, data_inicio, data_fim, periodo, obras(nome)), funcionario_profissoes(profissao_id, profissoes(id, nome))"
        ).order("nome")

        if busca and busca.strip():
            b = busca.strip()
            query = query.or_(f"nome.ilike.%{b}%,cargo.ilike.%{b}%,telefone.ilike.%{b}%,cpf.ilike.%{b}%")

        res = query.execute()
        funcionarios = res.data or []
        today_str = date.today().isoformat()

        for f in funcionarios:
            alocs = f.get("calendario_alocacoes") or []
            f["total_alocacoes"] = len(alocs)

            # Processa especializações N:N
            fps = f.get("funcionario_profissoes") or []
            profissoes_list = []
            profissoes_ids = []
            for fp in fps:
                prof_data = fp.get("profissoes")
                if prof_data and isinstance(prof_data, dict):
                    profissoes_list.append(prof_data)
                    profissoes_ids.append(prof_data.get("id"))
                elif fp.get("profissao_id"):
                    profissoes_ids.append(fp.get("profissao_id"))
            f["profissoes"] = profissoes_list
            f["profissoes_ids"] = profissoes_ids

            if not f.get("cargo") and profissoes_list:
                f["cargo"] = ", ".join([p.get("nome", "") for p in profissoes_list if p.get("nome")])
            
            # Identifica alocação atual (data_inicio <= hoje <= data_fim ou a mais recente)
            aloc_atual = None
            alocs_sorted = sorted(alocs, key=lambda x: x.get("data_fim") or "", reverse=True)
            for a in alocs_sorted:
                d_ini = a.get("data_inicio") or ""
                d_fim = a.get("data_fim") or ""
                if d_ini <= today_str <= d_fim:
                    aloc_atual = a
                    break
            
            if not aloc_atual and alocs_sorted:
                # Se não tem alocação ativa exatamente hoje, pega a última registrada
                aloc_atual = alocs_sorted[0]

            if aloc_atual:
                f["alocacao_atual"] = {
                    "id": aloc_atual.get("id"),
                    "obra_id": aloc_atual.get("obra_id"),
                    "obra_nome": aloc_atual.get("obras", {}).get("nome", "Obra") if aloc_atual.get("obras") else "Obra",
                    "data_inicio": aloc_atual.get("data_inicio"),
                    "data_fim": aloc_atual.get("data_fim"),
                    "periodo": aloc_atual.get("periodo"),
                    "em_andamento": (aloc_atual.get("data_inicio") or "") <= today_str <= (aloc_atual.get("data_fim") or "")
                }
            else:
                f["alocacao_atual"] = None

        return funcionarios
    except Exception as e:
        logger.error(f"Erro ao listar funcionarios com alocacoes e profissoes: {e}")
        # Fallback para consulta simples
        res = supabase.table("funcionarios").select("*").order("nome").execute()
        return res.data or []

@router.post("/funcionarios", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_funcionario(funcionario: FuncionarioBase, user: dict = Depends(get_current_user)):
    """Adiciona novo colaborador com vínculo de profissões."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    data = funcionario.model_dump(mode="json")
    profissoes_ids = data.pop("profissoes_ids", None)

    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)

    # Se cargo nao foi enviado mas profissoes_ids foi enviado, sincroniza nome do cargo
    if profissoes_ids and not data.get("cargo"):
        try:
            res_p = supabase.table("profissoes").select("id, nome").in_("id", [str(pid) for pid in profissoes_ids]).execute()
            nomes = [p["nome"] for p in (res_p.data or []) if p.get("nome")]
            if nomes:
                data["cargo"] = ", ".join(nomes)
        except Exception as e:
            logger.warning(f"Erro ao buscar nomes das profissoes: {e}")

    try:
        res = supabase.table("funcionarios").insert(data).execute()
        if res.data:
            func = res.data[0]
            f_id = func["id"]
            if profissoes_ids:
                vinculos = [{"funcionario_id": str(f_id), "profissao_id": str(pid)} for pid in profissoes_ids]
                try:
                    supabase.table("funcionario_profissoes").insert(vinculos).execute()
                except Exception as ve:
                    logger.warning(f"Erro ao vincular especializações: {ve}")
            func["profissoes_ids"] = [str(pid) for pid in (profissoes_ids or [])]
            return func
        raise HTTPException(status_code=400, detail="Erro ao inserir funcionário: retorno vazio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cadastrar funcionário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar funcionário: {str(e)}")

@router.put("/funcionarios/{id}", response_model=dict)
async def update_funcionario(id: UUID, funcionario_update: FuncionarioUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados de um colaborador e suas especializações."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    update_data = {k: v for k, v in funcionario_update.model_dump(mode="json").items() if v is not None}
    if not update_data and funcionario_update.profissoes_ids is None:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização")

    profissoes_ids = update_data.pop("profissoes_ids", None)

    # Se profissoes_ids foi fornecido, sincroniza o texto do cargo se cargo nao foi explicitamente atualizado
    if profissoes_ids is not None:
        try:
            if not update_data.get("cargo"):
                if profissoes_ids:
                    res_p = supabase.table("profissoes").select("id, nome").in_("id", [str(pid) for pid in profissoes_ids]).execute()
                    nomes = [p["nome"] for p in (res_p.data or []) if p.get("nome")]
                    if nomes:
                        update_data["cargo"] = ", ".join(nomes)
                else:
                    update_data["cargo"] = None

            # Sincroniza funcionario_profissoes
            supabase.table("funcionario_profissoes").delete().eq("funcionario_id", str(id)).execute()
            if profissoes_ids:
                vinculos = [{"funcionario_id": str(id), "profissao_id": str(pid)} for pid in profissoes_ids]
                supabase.table("funcionario_profissoes").insert(vinculos).execute()
        except Exception as ve:
            logger.warning(f"Erro ao sincronizar funcionario_profissoes: {ve}")

    update_data["updated_at"] = datetime.utcnow().isoformat()

    try:
        res = supabase.table("funcionarios").update(update_data).eq("id", str(id)).execute()
        if res.data:
            func = res.data[0]
            if profissoes_ids is not None:
                func["profissoes_ids"] = [str(pid) for pid in profissoes_ids]
            return func
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar funcionário {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar funcionário: {str(e)}")

@router.delete("/funcionarios/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_funcionario(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui um colaborador, suas especializações e alocações associadas."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        # Remove vínculos primeiro para manter integridade
        supabase.table("funcionario_profissoes").delete().eq("funcionario_id", str(id)).execute()
        supabase.table("calendario_alocacoes").delete().eq("funcionario_id", str(id)).execute()
        supabase.table("funcionarios").delete().eq("id", str(id)).execute()
        return None
    except Exception as e:
        logger.error(f"Erro ao excluir funcionário {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir funcionário: {str(e)}")

@router.get("/alocacoes", response_model=List[dict])
async def list_alocacoes(
    obra_id: Optional[UUID] = Query(None), 
    funcionario_id: Optional[UUID] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lista alocações de colaboradores em obras."""
    supabase = get_supabase_client()
    if not supabase:
        return []

    try:
        query = supabase.table("calendario_alocacoes").select(
            "*, funcionarios(nome, cargo, telefone, cor, equipe_padrao_id, lider), obras(nome)"
        )
        if obra_id:
            query = query.eq("obra_id", str(obra_id))
        if funcionario_id:
            query = query.eq("funcionario_id", str(funcionario_id))

        res = query.order("data_inicio", desc=True).execute()
        
        formatted = []
        for item in res.data or []:
            func_data = item.get("funcionarios") or {}
            formatted.append({
                "id": item["id"],
                "obra_id": item["obra_id"],
                "obra": item.get("obras", {}).get("nome", "Obra Desconhecida") if item.get("obras") else "Obra Desconhecida",
                "funcionario_id": item["funcionario_id"],
                "funcionario_nome": func_data.get("nome", "Desconhecido"),
                "funcionario_cargo": func_data.get("cargo", ""),
                "funcionario_telefone": func_data.get("telefone", ""),
                "funcionario_cor": func_data.get("cor"),
                "funcionario_equipe_id": func_data.get("equipe_padrao_id"),
                "funcionario_lider": func_data.get("lider", False),
                "data_inicio": item["data_inicio"],
                "data_fim": item["data_fim"],
                "periodo": item["periodo"],
                "modalidade_pagamento": item.get("modalidade_pagamento"),
                "valor_diaria": item.get("valor_diaria"),
                "valor_fechado": item.get("valor_fechado"),
                "created_by": item.get("created_by"),
                "created_at": item.get("created_at")
            })
        return formatted
    except Exception as e:
        logger.error(f"Erro ao listar alocações: {e}")
        return []

@router.post("/alocacoes", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_alocacao(alocacao: AlocacaoBase, user: dict = Depends(get_current_user)):
    """Cria nova alocação."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    data = alocacao.model_dump(mode="json")
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)

    # Converte tipos UUID e dates para strings JSON
    data["data_inicio"] = str(data["data_inicio"])
    data["data_fim"] = str(data["data_fim"])
    data["obra_id"] = str(data["obra_id"])
    data["funcionario_id"] = str(data["funcionario_id"])
    
    # Verificação informativa de conflito de alocação (não bloqueia)
    conflict_warning = None
    try:
        conflicts = supabase.table("calendario_alocacoes").select(
            "id, data_inicio, data_fim, periodo, obras(nome)"
        ).eq("funcionario_id", data["funcionario_id"]).lte("data_inicio", data["data_fim"]).gte("data_fim", data["data_inicio"]).execute()
        
        overlapping = [c for c in (conflicts.data or []) if c.get("periodo") == "dia_inteiro" or data.get("periodo") == "dia_inteiro" or c.get("periodo") == data.get("periodo")]
        if overlapping:
            c = overlapping[0]
            obra_nome = c.get("obras", {}).get("nome", "Outra Obra") if c.get("obras") else "Outra Obra"
            conflict_warning = f"Aviso de sobreposição: Colaborador já possui alocação na obra '{obra_nome}' ({c.get('data_inicio')} a {c.get('data_fim')}). Alocação salva com sucesso."
    except Exception as ce:
        logger.warning(f"Erro ao verificar conflito de alocação: {ce}")

    # Se valor_diaria não foi informado e modalidade é diária, usa valor cadastrado do colaborador
    if data.get("modalidade_pagamento") == "diaria" and not data.get("valor_diaria"):
        try:
            func = supabase.table("funcionarios").select("valor_diaria").eq("id", data["funcionario_id"]).single().execute()
            if func.data and func.data.get("valor_diaria") is not None:
                data["valor_diaria"] = func.data["valor_diaria"]
        except Exception as fe:
            logger.warning(f"Não foi possível buscar valor_diaria padrão do funcionário: {fe}")

    try:
        res = supabase.table("calendario_alocacoes").insert(data).execute()
        if res.data:
            res_data = res.data[0]
            if conflict_warning:
                res_data["warning"] = conflict_warning
            return res_data
        raise HTTPException(status_code=400, detail="Erro ao inserir alocação")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao criar alocação: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao criar alocação: {str(e)}")

@router.delete("/alocacoes/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_alocacao(id: UUID, user: dict = Depends(get_current_user)):
    """Remove uma alocação."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        supabase.table("calendario_alocacoes").delete().eq("id", str(id)).execute()
        return None
    except Exception as e:
        logger.error(f"Erro ao remover alocação {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao remover alocação: {str(e)}")

# ================================
# EQUIPES
# ================================

@router.get("/equipes", response_model=List[dict])
async def list_equipes(user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    if not supabase:
        return []
    res = supabase.table("equipes").select("*, funcionarios!fk_equipes_lider(nome, cor, id)").execute()
    equipes = res.data or []
    
    res_func = supabase.table("funcionarios").select("id, nome, cargo, telefone, equipe_padrao_id").not_.is_("equipe_padrao_id", "null").execute()
    funcs = res_func.data or []
    
    for eq in equipes:
        eq["membros"] = [f for f in funcs if str(f.get("equipe_padrao_id")) == str(eq.get("id"))]
        
    return equipes

@router.post("/equipes", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_equipe(equipe: EquipeBase, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    data = equipe.model_dump(mode="json")
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)
    
    if data.get("lider_id"):
        data["lider_id"] = str(data["lider_id"])
        
    membros = data.pop("membros", [])
        
    res = supabase.table("equipes").insert(data).execute()
    if res.data:
        equipe_created = res.data[0]
        equipe_id = equipe_created["id"]
        if membros:
            supabase.table("funcionarios").update({"equipe_padrao_id": equipe_id}).in_("id", [str(m) for m in membros]).execute()
            
        return equipe_created
    return {}

@router.delete("/equipes/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_equipe(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    # Atualiza funcionarios vinculados para remover a equipe
    supabase.table("funcionarios").update({"equipe_padrao_id": None}).eq("equipe_padrao_id", str(id)).execute()
    supabase.table("equipes").delete().eq("id", str(id)).execute()
    return None

# ================================
# PAGAMENTOS
# ================================

@router.get("/pagamentos", response_model=List[dict])
async def list_pagamentos(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    query = supabase.table("pagamentos_funcionarios").select("*, funcionarios(nome, cargo)")
    if obra_id:
        query = query.eq("obra_id", str(obra_id))
    res = query.order("data_pagamento", desc=True).execute()
    return res.data or []

@router.post("/pagamentos", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_pagamento(pag: PagamentoFuncionarioBase, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    data = pag.model_dump(mode="json")
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)
        
    data["funcionario_id"] = str(data["funcionario_id"])
    data["obra_id"] = str(data["obra_id"])
    if data.get("alocacao_id"):
        data["alocacao_id"] = str(data["alocacao_id"])
    data["data_pagamento"] = str(data["data_pagamento"])
    
    res = supabase.table("pagamentos_funcionarios").insert(data).execute()
        
    return res.data[0] if res.data else {}

@router.delete("/pagamentos/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_pagamento(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    supabase.table("pagamentos_funcionarios").delete().eq("id", str(id)).execute()
    return None

# ================================
# FALTAS / AUSÊNCIAS NO CALENDÁRIO
# ================================

@router.get("/faltas", response_model=List[dict])
async def list_faltas(
    funcionario_id: Optional[UUID] = Query(None),
    obra_id: Optional[UUID] = Query(None),
    data_inicio: Optional[date] = Query(None),
    data_fim: Optional[date] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lista faltas registradas com dados do funcionário e da obra."""
    supabase = get_supabase_client()
    if not supabase:
        return []

    try:
        query = supabase.table("calendario_faltas").select(
            "*, funcionarios(nome, cargo), obras(nome)"
        )
        if funcionario_id:
            query = query.eq("funcionario_id", str(funcionario_id))
        if obra_id:
            query = query.eq("obra_id", str(obra_id))
        if data_inicio:
            query = query.gte("data", str(data_inicio))
        if data_fim:
            query = query.lte("data", str(data_fim))

        res = query.order("data", desc=True).execute()
        formatted = []
        for row in res.data or []:
            f_data = row.get("funcionarios") or {}
            o_data = row.get("obras") or {}
            formatted.append({
                "id": row["id"],
                "funcionario_id": row["funcionario_id"],
                "funcionario_nome": f_data.get("nome", "Colaborador"),
                "funcionario_cargo": f_data.get("cargo", ""),
                "obra_id": row.get("obra_id"),
                "obra_nome": o_data.get("nome", "Obra") if o_data else None,
                "data": row["data"],
                "motivo": row.get("motivo"),
                "created_at": row.get("created_at")
            })
        return formatted
    except Exception as e:
        logger.error(f"Erro ao listar faltas: {e}")
        return []

@router.post("/faltas/toggle", response_model=dict)
async def toggle_falta(falta: FaltaCreate, user: dict = Depends(get_current_user)):
    """Alterna (marca ou desmarca) a falta de um colaborador em uma data."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    f_id = str(falta.funcionario_id)
    d_str = str(falta.data)
    o_id = str(falta.obra_id) if falta.obra_id else None

    try:
        existing = supabase.table("calendario_faltas").select("id").eq("funcionario_id", f_id).eq("data", d_str).execute()
        if existing.data and len(existing.data) > 0:
            del_id = existing.data[0]["id"]
            supabase.table("calendario_faltas").delete().eq("id", del_id).execute()
            return {"action": "removed", "id": del_id, "data": d_str, "funcionario_id": f_id}
        else:
            insert_data = {
                "funcionario_id": f_id,
                "data": d_str,
                "motivo": falta.motivo or "Falta registrada no calendário"
            }
            if o_id:
                insert_data["obra_id"] = o_id
            if not user.get("is_mock"):
                insert_data["created_by"] = user.get("id")

            res = supabase.table("calendario_faltas").insert(insert_data).execute()
            if res.data:
                res_data = res.data[0]
                res_data["action"] = "created"
                return res_data
            raise HTTPException(status_code=400, detail="Erro ao registrar falta")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao alternar falta: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao alternar falta: {str(e)}")

@router.delete("/faltas/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_falta(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui registro de falta."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        supabase.table("calendario_faltas").delete().eq("id", str(id)).execute()
        return None
    except Exception as e:
        logger.error(f"Erro ao excluir falta {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao excluir falta: {str(e)}")

# ================================
# FECHAMENTO SEMANAL DE EQUIPE
# ================================

@router.get("/fechamento-semanal", response_model=List[dict])
async def get_fechamento_semanal(
    data_inicio: date = Query(..., description="Data de início da semana"),
    data_fim: date = Query(..., description="Data de fim da semana"),
    user: dict = Depends(get_current_user)
):
    """Calcula automaticamente o valor de cada colaborador na semana (dias trabalhados x diária - faltas) ou parcelas de valor fechado."""
    supabase = get_supabase_client()
    if not supabase:
        return []

    d_ini_str = str(data_inicio)
    d_fim_str = str(data_fim)

    try:
        # Busca todas as alocações que interceptam essa semana
        alocs_res = supabase.table("calendario_alocacoes").select(
            "*, funcionarios(id, nome, cargo, valor_diaria), obras(id, nome)"
        ).lte("data_inicio", d_fim_str).gte("data_fim", d_ini_str).execute()
        
        alocacoes_semana = alocs_res.data or []

        # Busca todas as faltas no intervalo
        faltas_res = supabase.table("calendario_faltas").select(
            "funcionario_id, data, obra_id"
        ).gte("data", d_ini_str).lte("data", d_fim_str).execute()
        faltas_semana = faltas_res.data or []

        faltas_por_func = {}
        for f in faltas_semana:
            fid = f["funcionario_id"]
            if fid not in faltas_por_func:
                faltas_por_func[fid] = []
            faltas_por_func[fid].append(f["data"])

        # Busca pagamentos já realizados para calcular saldo
        pags_res = supabase.table("pagamentos_funcionarios").select("funcionario_id, obra_id, valor_pago, data_pagamento").execute()
        pags_totais = {}
        pags_semana = {}
        for p in pags_res.data or []:
            key = f"{p['funcionario_id']}_{p['obra_id']}"
            val = float(p.get("valor_pago") or 0.0)
            pags_totais[key] = pags_totais.get(key, 0.0) + val
            
            p_data = p.get("data_pagamento")
            if p_data and d_ini_str <= p_data <= d_fim_str:
                pags_semana[key] = pags_semana.get(key, 0.0) + val

        resumo = []
        import datetime as dt

        d_ini = dt.date.fromisoformat(d_ini_str)
        d_fim = dt.date.fromisoformat(d_fim_str)

        for a in alocacoes_semana:
            func = a.get("funcionarios") or {}
            obra = a.get("obras") or {}
            fid = a.get("funcionario_id")
            oid = a.get("obra_id")

            a_ini = dt.date.fromisoformat(a["data_inicio"])
            a_fim = dt.date.fromisoformat(a["data_fim"])
            
            inter_ini = max(d_ini, a_ini)
            inter_fim = min(d_fim, a_fim)
            dias_escalados = max(0, (inter_fim - inter_ini).days + 1)

            func_faltas = faltas_por_func.get(fid, [])
            dias_faltas = 0
            cur = inter_ini
            while cur <= inter_fim:
                if cur.isoformat() in func_faltas:
                    dias_faltas += 1
                cur += dt.timedelta(days=1)

            dias_trabalhados = max(0, dias_escalados - dias_faltas)
            modalidade = a.get("modalidade_pagamento") or "diaria"
            
            valor_diaria = float(a.get("valor_diaria") or func.get("valor_diaria") or 0.0)
            valor_fechado_total = float(a.get("valor_fechado") or 0.0)
            
            pago_total = pags_totais.get(f"{fid}_{oid}", 0.0)
            pago_semana = pags_semana.get(f"{fid}_{oid}", 0.0)
            
            saldo_restante = max(0.0, valor_fechado_total - pago_total) if modalidade == "fechado" else 0.0

            if modalidade == "diaria":
                bruto = dias_trabalhados * valor_diaria
                valor_sugerido = round(max(0.0, bruto - pago_semana), 2)
            else:
                valor_sugerido = round(saldo_restante, 2)

            if valor_sugerido > 0:
                resumo.append({
                    "alocacao_id": a["id"],
                    "funcionario_id": fid,
                    "funcionario_nome": func.get("nome", "Desconhecido"),
                    "funcionario_cargo": func.get("cargo", ""),
                    "obra_id": oid,
                    "obra_nome": obra.get("nome", "Obra"),
                    "modalidade": modalidade,
                    "periodo": a.get("periodo", "dia_inteiro"),
                    "valor_diaria": valor_diaria,
                    "valor_fechado_total": valor_fechado_total,
                    "total_pago": pago_total,
                    "saldo_restante": saldo_restante,
                    "dias_escalados": dias_escalados,
                    "dias_faltas": dias_faltas,
                    "dias_trabalhados": dias_trabalhados,
                    "valor_sugerido": valor_sugerido
                })

        return resumo
    except Exception as e:
        logger.error(f"Erro ao gerar fechamento semanal: {e}", exc_info=True)
        return []
