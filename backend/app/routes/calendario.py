from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status as http_status
from ..models.calendario import (
    FuncionarioBase, FuncionarioUpdate, FuncionarioResponse,
    AlocacaoBase, AlocacaoUpdate, AlocacaoResponse,
    EquipeBase, EquipeResponse,
    PagamentoFuncionarioBase, PagamentoFuncionarioResponse
)
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
import logging

logger = logging.getLogger("edifica.calendario")

router = APIRouter(prefix="/calendario", tags=["Calendário e Equipe"])

@router.get("/funcionarios", response_model=List[dict])
async def list_funcionarios(
    busca: Optional[str] = Query(None, description="Busca por nome, cargo, telefone ou CPF"),
    user: dict = Depends(get_current_user)
):
    """Lista colaboradores próprios CLT com resumo de alocações."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        query = supabase.table("funcionarios").select(
            "*, calendario_alocacoes(id, obra_id, data_inicio, data_fim, periodo, obras(nome))"
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
        logger.error(f"Erro ao listar funcionarios com alocacoes: {e}")
        # Fallback para consulta simples
        res = supabase.table("funcionarios").select("*").order("nome").execute()
        return res.data or []

@router.post("/funcionarios", response_model=dict, status_code=http_status.HTTP_201_CREATED)
async def create_funcionario(funcionario: FuncionarioBase, user: dict = Depends(get_current_user)):
    """Adiciona novo colaborador."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    data = funcionario.model_dump(mode="json")
    if not user.get("is_mock"):
        data["created_by"] = user.get("id")
    else:
        data.pop("created_by", None)

    try:
        res = supabase.table("funcionarios").insert(data).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=400, detail="Erro ao inserir funcionário: retorno vazio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao cadastrar funcionário: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar funcionário: {str(e)}")

@router.put("/funcionarios/{id}", response_model=dict)
async def update_funcionario(id: UUID, funcionario_update: FuncionarioUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados de um colaborador."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    update_data = {k: v for k, v in funcionario_update.model_dump(mode="json").items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado informado para atualização")

    update_data["updated_at"] = datetime.utcnow().isoformat()

    try:
        res = supabase.table("funcionarios").update(update_data).eq("id", str(id)).execute()
        if res.data:
            return res.data[0]
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar funcionário {id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar funcionário: {str(e)}")

@router.delete("/funcionarios/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_funcionario(id: UUID, user: dict = Depends(get_current_user)):
    """Exclui um colaborador e suas alocações associadas."""
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable")

    try:
        # Remove primeiro as alocações vinculadas para manter integridade
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
            "*, funcionarios(nome, cargo, telefone), obras(nome)"
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
    
    try:
        res = supabase.table("calendario_alocacoes").insert(data).execute()
        if res.data:
            return res.data[0]
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
    res = supabase.table("equipes").select("*, funcionarios!fk_equipes_lider(nome, cor)").execute()
    return res.data or []

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
        
    res = supabase.table("equipes").insert(data).execute()
    return res.data[0] if res.data else {}

@router.delete("/equipes/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_equipe(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
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
    
    # Injeta no fluxo de caixa
    if res.data:
        caixa_data = {
            "obra_id": data["obra_id"],
            "tipo": "despesa",
            "categoria": "Mão de Obra Própria",
            "descricao": f"Pagamento Funcionário: {data.get('funcionario_id')}",
            "valor": data["valor_pago"],
            "data_registro": data["data_pagamento"],
            "status": "realizado",
            "metodo_pagamento": "Transferência",
            "referencia_id": res.data[0]["id"]
        }
        if not user.get("is_mock"):
            caixa_data["created_by"] = user.get("id")
        supabase.table("caixa_pequeno").insert(caixa_data).execute()
        
    return res.data[0] if res.data else {}

@router.delete("/pagamentos/{id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_pagamento(id: UUID, user: dict = Depends(get_current_user)):
    supabase = get_supabase_client()
    # Primeiro deleta do caixa pequeno
    supabase.table("caixa_pequeno").delete().eq("referencia_id", str(id)).execute()
    supabase.table("pagamentos_funcionarios").delete().eq("id", str(id)).execute()
    return None
