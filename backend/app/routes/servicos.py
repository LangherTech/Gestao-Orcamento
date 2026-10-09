from typing import List, Optional
from uuid import UUID, uuid4
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, status
from ..models.servicos import (
    ServicoCreate, ServicoUpdate, ServicoResponse, ServicoValoresUpdate,
    OrcamentoGerarRequest,
    OrcamentoCreate, OrcamentoUpdate, OrcamentoStatusUpdate, OrcamentoResponse
)
import math
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
import logging

logger = logging.getLogger("edifica.servicos")

router = APIRouter(prefix="/servicos", tags=["Serviços e Orçamento"])





# ========================================
# CATEGORIAS DE SERVIÇOS
# ========================================

@router.get("/categorias", response_model=List[str])
async def list_categorias(user: dict = Depends(get_current_user)):
    """Lista todas as categorias de serviços distintas."""
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("servicos").select("categoria").execute()
            categorias = list(set(item["categoria"] for item in res.data if item.get("categoria")))
            if categorias:
                categorias.sort()
                return categorias
        except Exception as e:
            logger.warning(f"Erro ao buscar categorias no Supabase: {e}")

    return [
        "Alvenaria",
        "Elétrica",
        "Gesso e Drywall",
        "Hidráulica",
        "Pintura e Acabamento",
        "Pisos e Revestimentos",
    ]


# ========================================
# ORÇAMENTOS (Simulação e Gestão de Propostas)
# ========================================

MOCK_ORCAMENTOS = [
    {
        "id": "orc-001",
        "obra_id": "e0a12345-6789-4321-bcde-000000000001",
        "numero": "ORC-2026-001",
        "cliente_nome": "Família Albuquerque",
        "cliente_contato": "(11) 98765-4321 - albuquerque@email.com",
        "subtotal": 68500.00,
        "desconto_total": 3500.00,
        "valor_total": 65000.00,
        "validade_dias": 30,
        "status": "aprovado",
        "observacoes": "Pagamento em 3x sem juros (Entrada + 30 + 60 dias). Inclui entrega e montagem.",
        "created_at": "2026-09-12T14:30:00Z",
        "updated_at": "2026-09-14T10:00:00Z",
        "itens": [
            {
                "id": "item-001",
                "orcamento_id": "orc-001",
                "servico_id": "s001",
                "descricao": "Parede Drywall Standard (120mm)",
                "quantidade": 180.0,
                "preco_unitario": 145.00,
                "desconto_percentual": 5.0,
                "subtotal": 24795.00
            },
            {
                "id": "item-002",
                "orcamento_id": "orc-001",
                "servico_id": "s003",
                "descricao": "Instalação de Forro de Gesso Tabicado",
                "quantidade": 220.0,
                "preco_unitario": 85.00,
                "desconto_percentual": 5.0,
                "subtotal": 17765.00
            },
            {
                "id": "item-003",
                "orcamento_id": "orc-001",
                "servico_id": "s002",
                "descricao": "Pintura Acrílica Fosca 3 Demãos",
                "quantidade": 600.0,
                "preco_unitario": 38.00,
                "desconto_percentual": 4.0,
                "subtotal": 21888.00
            }
        ]
    },
    {
        "id": "orc-002",
        "obra_id": "e0a12345-6789-4321-bcde-000000000002",
        "numero": "ORC-2026-002",
        "cliente_nome": "Tech Consultoria Ltda",
        "cliente_contato": "contato@techconsultoria.com.br",
        "subtotal": 42000.00,
        "desconto_total": 0.00,
        "valor_total": 42000.00,
        "validade_dias": 15,
        "status": "enviado",
        "observacoes": "Aguardando aprovação da diretoria até sexta-feira.",
        "created_at": "2026-09-25T09:00:00Z",
        "updated_at": "2026-09-25T09:00:00Z",
        "itens": [
            {
                "id": "item-004",
                "orcamento_id": "orc-002",
                "servico_id": "s001",
                "descricao": "Parede Drywall Standard (120mm)",
                "quantidade": 200.0,
                "preco_unitario": 145.00,
                "desconto_percentual": 0.0,
                "subtotal": 29000.00
            },
            {
                "id": "item-005",
                "orcamento_id": "orc-002",
                "servico_id": "s005",
                "descricao": "Instalação Elétrica - Ponto Completo",
                "quantidade": 100.0,
                "preco_unitario": 120.00,
                "desconto_percentual": 0.0,
                "subtotal": 12000.00
            }
        ]
    }
]


@router.post("/orcamento/gerar", response_model=dict)
async def gerar_orcamento(req: OrcamentoGerarRequest, user: dict = Depends(get_current_user)):
    """Gera um resumo de orçamento com base nos serviços selecionados."""
    supabase = get_supabase_client()

    itens_orcamento = []
    subtotal_geral = 0.0

    for item in req.itens:
        servico_data = None
        if item.tipo == "servico" and item.servico_id:
            if supabase:
                res = supabase.table("servicos").select("*").eq("id", str(item.servico_id)).execute()
                if res.data:
                    servico_data = res.data[0]
            if not servico_data:
                servico_data = {"id": str(item.servico_id), "nome": "Serviço", "preco_total": 0}
            preco_unit = servico_data.get("preco_total", 0)
        elif item.tipo == "insumo" and item.material_id:
            if supabase:
                res = supabase.table("materiais").select("*").eq("id", str(item.material_id)).execute()
                if res.data:
                    servico_data = res.data[0]
            if not servico_data:
                servico_data = {"id": str(item.material_id), "nome": "Insumo", "preco_medio": 0}
            preco_unit = servico_data.get("preco_medio", 0)
            servico_data["nome"] = servico_data.get("nome", "")
        else:
            preco_unit = 0
            servico_data = {"nome": item.descricao or "Item"}

        if item.fornecido_por == "Cliente":
            total_item = 0.0
        else:
            total_item = preco_unit * item.quantidade

        subtotal_geral += total_item

        itens_orcamento.append({
            "servico_id": str(item.servico_id) if item.servico_id else None,
            "material_id": str(item.material_id) if item.material_id else None,
            "tipo": item.tipo,
            "fornecido_por": item.fornecido_por,
            "unidade": item.unidade,
            "preco_catalogo": item.preco_catalogo,
            "servico_nome": servico_data.get("nome", ""),
            "quantidade": item.quantidade,
            "preco_unitario": preco_unit,
            "subtotal": round(total_item, 2),
            "total": round(total_item, 2)
        })

    total_liquido = subtotal_geral
    fator_acrescimo = 1 + ((req.margem_bdi_percentual + req.impostos_percentual) / 100)
    valor_total_final = round(total_liquido * fator_acrescimo, 2)

    return {
        "obra_id": str(req.obra_id) if req.obra_id else None,
        "cliente_nome": req.cliente_nome,
        "cliente_contato": req.cliente_contato,
        "itens": itens_orcamento,
        "subtotal": round(subtotal_geral, 2),
        "valor_total": valor_total_final,
        "observacoes": req.observacoes,
        "validade_dias": req.validade_dias,
        "gerado_por": user.get("email", "sistema")
    }


@router.get("/orcamentos", response_model=List[dict])
async def list_orcamentos(
    obra_id: Optional[UUID] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lista todos os orçamentos persistidos."""
    supabase = get_supabase_client()
    if supabase:
        try:
            query = supabase.table("orcamentos").select("*")
            if obra_id:
                query = query.eq("obra_id", str(obra_id))
            if status:
                query = query.eq("status", status)
            if search:
                query = query.or_(f"cliente_nome.ilike.%{search}%,numero.ilike.%{search}%")
            res = query.order("created_at", desc=True).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.warning(f"Erro ao consultar orcamentos no Supabase: {e}")

    # Retorna do mock caso tabela não exista ou offline
    results = list(MOCK_ORCAMENTOS)
    if obra_id:
        results = [o for o in results if o.get("obra_id") == str(obra_id)]
    if status:
        results = [o for o in results if o.get("status") == status]
    if search:
        s = search.lower()
        results = [o for o in results if s in o.get("cliente_nome", "").lower() or s in o.get("numero", "").lower()]
    return results


@router.get("/orcamentos/{orcamento_id}", response_model=dict)
async def get_orcamento(orcamento_id: str, user: dict = Depends(get_current_user)):
    """Retorna detalhes de um orçamento específico."""
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("orcamentos").select("*, orcamento_itens(*)").eq("id", str(orcamento_id)).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            logger.warning(f"Erro ao buscar orcamento {orcamento_id}: {e}")

    for o in MOCK_ORCAMENTOS:
        if o["id"] == str(orcamento_id):
            return o
    raise HTTPException(status_code=404, detail="Orçamento não encontrado.")


def calcular_totais_orcamento(itens: List[dict], bdi: float, impostos: float, fornecimento_materiais: str) -> tuple[float, float]:
    subtotal = 0.0
    for item in itens:
        preco = float(item.get("preco_unitario") or 0.0)
        qtd = float(item.get("quantidade") or 0.0)
        if item.get("fornecido_por") == "Cliente" or (item.get("tipo") == "insumo" and fornecimento_materiais == "cliente"):
            sub_liquido = 0.0
        else:
            sub_liquido = preco * qtd
        subtotal += sub_liquido
        item["subtotal"] = round(sub_liquido, 2)
        
        custo_unit = float(item.get("custo_unitario") or 0.0)
        # If client provides, maybe there is no cost? Let's assume if sub_liquido is 0 due to client provision, cost is also 0
        if item.get("fornecido_por") == "Cliente" or (item.get("tipo") == "insumo" and fornecimento_materiais == "cliente"):
            custo_tot = 0.0
        else:
            custo_tot = custo_unit * qtd
            
        item["custo_total"] = round(custo_tot, 2)
        item["lucro"] = round(sub_liquido - custo_tot, 2)

    total_liquido = subtotal
    fator = 1 + ((bdi + impostos) / 100.0)
    valor_total = round(total_liquido * fator, 2)
    return round(subtotal, 2), valor_total


@router.post("/orcamentos", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_orcamento(orcamento: OrcamentoCreate, user: dict = Depends(get_current_user)):
    """Cria e persiste um novo orçamento com seus itens."""
    supabase = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()
    orc_id = str(uuid4())
    numero = orcamento.numero or f"ORC-2026-{len(MOCK_ORCAMENTOS) + 1:03d}"

    # Calcular subtotais
    subtotal_geral = 0.0
    desconto_total = 0.0
    itens_processados = []

    for item in orcamento.itens:
        preco_unit = item.preco_unitario or 0.0
        descricao = item.descricao or "Item de Serviço"
        
        # Se preco_unitario for 0 e tiver servico_id/material_id, buscar preço
        if (preco_unit == 0.0 or not item.descricao):
            if item.tipo == "servico" and item.servico_id:
                if supabase:
                    try:
                        s_res = supabase.table("servicos").select("preco_total, nome").eq("id", str(item.servico_id)).execute()
                        if s_res.data:
                            if preco_unit == 0.0:
                                preco_unit = s_res.data[0].get("preco_total", 0.0)
                            if not item.descricao:
                                descricao = s_res.data[0].get("nome", "Serviço")
                    except Exception:
                        pass
            elif item.tipo == "insumo" and item.material_id:
                if supabase:
                    try:
                        m_res = supabase.table("materiais").select("preco_medio, nome").eq("id", str(item.material_id)).execute()
                        if m_res.data:
                            if preco_unit == 0.0:
                                preco_unit = m_res.data[0].get("preco_medio", 0.0)
                            if not item.descricao:
                                descricao = m_res.data[0].get("nome", "Insumo")
                    except Exception:
                        pass

        itens_processados.append({
            "id": f"item-{uuid4().hex[:8]}",
            "orcamento_id": orc_id,
            "servico_id": str(item.servico_id) if item.servico_id else None,
            "material_id": str(item.material_id) if item.material_id else None,
            "tipo": item.tipo,
            "fornecido_por": item.fornecido_por,
            "unidade": item.unidade,
            "preco_catalogo": item.preco_catalogo,
            "embalagem_id": str(item.embalagem_id) if item.embalagem_id else None,
            "origem_assistente": item.origem_assistente,
            "assistente_execucao_id": item.assistente_execucao_id,
            "descricao": descricao,
            "quantidade": item.quantidade,
            "preco_unitario": preco_unit,
            "custo_unitario": item.custo_unitario or 0.0,
            "executor": item.executor or "Próprio",
        })

    fornecimento = getattr(orcamento, 'fornecimento_materiais', 'edifica')
    subtotal_geral, valor_total = calcular_totais_orcamento(
        itens_processados, 
        orcamento.margem_bdi_percentual, 
        orcamento.impostos_percentual, 
        fornecimento
    )

    orcamento_dict = {
        "id": orc_id,
        "obra_id": str(orcamento.obra_id) if orcamento.obra_id else None,
        "numero": numero,
        "cliente_nome": orcamento.cliente_nome,
        "cliente_contato": orcamento.cliente_contato,
        "cliente_telefone": orcamento.cliente_telefone,
        "cliente_email": orcamento.cliente_email,
        "cliente_endereco": orcamento.cliente_endereco,
        "prazo_dias": orcamento.prazo_dias,
        "prazo_garantia": orcamento.prazo_garantia,
        "objetivo": orcamento.objetivo,
        "subtotal": subtotal_geral,
        "valor_total": valor_total,
        "validade_dias": orcamento.validade_dias,
        "status": orcamento.status,
        "observacoes": orcamento.observacoes,
        "notas": orcamento.notas,
        "impostos_percentual": orcamento.impostos_percentual,
        "margem_bdi_percentual": orcamento.margem_bdi_percentual,
        "condicao_pagamento": orcamento.condicao_pagamento,
        "modo_exibicao": orcamento.modo_exibicao,
        "fornecimento_materiais": getattr(orcamento, 'fornecimento_materiais', 'edifica'),
        "created_by": None if user.get("is_mock") else user.get("id"),
        "created_at": now_iso,
        "updated_at": now_iso,
        "itens": itens_processados
    }

    if supabase:
        try:
            head_data = {k: v for k, v in orcamento_dict.items() if k != "itens"}
            res = supabase.table("orcamentos").insert(head_data).execute()
            if res.data:
                created_head = res.data[0]
                itens_to_insert = []
                for it in itens_processados:
                    it_data = dict(it)
                    it_data["orcamento_id"] = created_head["id"]
                    if "id" in it_data and str(it_data["id"]).startswith("item-"):
                        del it_data["id"]
                    if "subtotal" in it_data:
                        del it_data["subtotal"]
                    itens_to_insert.append(it_data)
                if itens_to_insert:
                    supabase.table("orcamento_itens").insert(itens_to_insert).execute()
                # Se aprovado e tem obra_id, trigger atualiza obra automaticamente
                orcamento_dict["id"] = created_head["id"]
        except Exception as e:
            logger.warning(f"Erro ao salvar orcamento no Supabase: {e}")

    # Atualiza também no mock se aplicável
    MOCK_ORCAMENTOS.insert(0, orcamento_dict)
    return orcamento_dict


@router.put("/orcamentos/{orcamento_id}", response_model=dict)
async def update_orcamento(
    orcamento_id: str,
    orcamento: OrcamentoUpdate,
    user: dict = Depends(get_current_user)
):
    """Atualiza um orçamento completo."""
    supabase = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()

    # Busca orcamento atual para verificar congelamento e preencher dados ausentes
    curr_orc = None
    if supabase:
        res = supabase.table("orcamentos").select("status, margem_bdi_percentual, impostos_percentual, fornecimento_materiais").eq("id", str(orcamento_id)).execute()
        if res.data:
            curr_orc = res.data[0]
            
    if curr_orc and curr_orc.get("status") == "aprovado":
        if orcamento.status != "rascunho" and orcamento.status != "enviado":
            # O backend recusa a alteração desses campos ignorando-os na requisição
            orcamento.itens = None
            orcamento.margem_bdi_percentual = None
            orcamento.impostos_percentual = None
            orcamento.fornecimento_materiais = None

    # Valores base
    bdi = orcamento.margem_bdi_percentual if orcamento.margem_bdi_percentual is not None else (curr_orc.get("margem_bdi_percentual", 0.0) if curr_orc else 0.0)
    imp = orcamento.impostos_percentual if orcamento.impostos_percentual is not None else (curr_orc.get("impostos_percentual", 0.0) if curr_orc else 0.0)
    forn = getattr(orcamento, 'fornecimento_materiais', None) or (curr_orc.get("fornecimento_materiais", "edifica") if curr_orc else "edifica")

    itens_processados = []

    if orcamento.itens is not None:
        for item in orcamento.itens:
            preco_unit = item.preco_unitario or 0.0
            descricao = item.descricao or "Item"
            
            itens_processados.append({
                "id": item.id if hasattr(item, "id") and item.id else f"item-{uuid4().hex[:8]}",
                "orcamento_id": orcamento_id,
                "servico_id": str(item.servico_id) if item.servico_id else None,
                "material_id": str(item.material_id) if hasattr(item, "material_id") and item.material_id else None,
                "tipo": item.tipo,
                "fornecido_por": item.fornecido_por,
                "unidade": item.unidade,
                "preco_catalogo": item.preco_catalogo,
                "embalagem_id": str(item.embalagem_id) if item.embalagem_id else None,
                "origem_assistente": item.origem_assistente,
                "assistente_execucao_id": item.assistente_execucao_id,
                "descricao": descricao,
                "quantidade": item.quantidade,
                "preco_unitario": preco_unit,
                "custo_unitario": item.custo_unitario or 0.0,
                "executor": item.executor or "Próprio",
            })
            
        subtotal_geral, valor_total = calcular_totais_orcamento(itens_processados, bdi, imp, forn)
    else:
        # Se não enviou itens, mas mudou BDI/Impostos, precisa recalcular os itens atuais do BD?
        # Para isso, precisamos buscar os itens.
        if orcamento.margem_bdi_percentual is not None or orcamento.impostos_percentual is not None or getattr(orcamento, 'fornecimento_materiais', None) is not None:
            if supabase:
                it_res = supabase.table("orcamento_itens").select("*").eq("orcamento_id", str(orcamento_id)).execute()
                itens_bd = it_res.data or []
                subtotal_geral, valor_total = calcular_totais_orcamento(itens_bd, bdi, imp, forn)
            else:
                subtotal_geral = 0.0
                valor_total = 0.0
        else:
            subtotal_geral = None
            valor_total = None

    update_dict = {
        "updated_at": now_iso
    }
    
    # Preenche apenas os campos fornecidos
    for key in ["obra_id", "cliente_nome", "cliente_contato", "cliente_telefone", "cliente_email", 
                "cliente_endereco", "prazo_dias", "prazo_garantia", "objetivo", "validade_dias", 
                "status", "observacoes", "notas", "impostos_percentual", "margem_bdi_percentual",
                "condicao_pagamento", "modo_exibicao", "fornecimento_materiais"]:
        if getattr(orcamento, key) is not None:
            update_dict[key] = str(getattr(orcamento, key)) if key == "obra_id" else getattr(orcamento, key)

    if subtotal_geral is not None:
        update_dict["subtotal"] = subtotal_geral
        update_dict["valor_total"] = valor_total

    if supabase:
        try:
            # Update head
            supabase.table("orcamentos").update(update_dict).eq("id", str(orcamento_id)).execute()
            # If itens provided, rewrite items
            if orcamento.itens is not None:
                supabase.table("orcamento_itens").delete().eq("orcamento_id", str(orcamento_id)).execute()
                itens_to_insert = []
                for it_data_ref in itens_processados:
                    it_data = dict(it_data_ref)
                    if "id" in it_data and str(it_data["id"]).startswith("item-"):
                        del it_data["id"]
                    if "subtotal" in it_data:
                        del it_data["subtotal"]
                    itens_to_insert.append(it_data)
                if itens_to_insert:
                    supabase.table("orcamento_itens").insert(itens_to_insert).execute()
        except Exception as e:
            logger.warning(f"Erro ao atualizar orcamento no Supabase: {e}")

    # Atualiza mock
    target_orc = None
    for o in MOCK_ORCAMENTOS:
        if o["id"] == str(orcamento_id):
            o.update(update_dict)
            if orcamento.itens is not None:
                o["itens"] = itens_processados
            target_orc = o
            break

    if not target_orc:
        # Se não existe no mock mas a requisição foi feita (ex: db first), a gente pode mockar o fetch ou apenas retornar
        update_dict["id"] = orcamento_id
        if orcamento.itens is not None:
            update_dict["itens"] = itens_processados
        target_orc = update_dict

    return target_orc


@router.patch("/orcamentos/{orcamento_id}/status", response_model=dict)
async def update_orcamento_status(
    orcamento_id: str,
    status_update: OrcamentoStatusUpdate,
    user: dict = Depends(get_current_user)
):
    """Atualiza o status de um orçamento (rascunho, enviado, aprovado, recusado)."""
    novo_status = status_update.status
    supabase = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()

    target_orc = None
    for o in MOCK_ORCAMENTOS:
        if o["id"] == str(orcamento_id):
            o["status"] = novo_status
            o["updated_at"] = now_iso
            target_orc = o
            break

    if supabase:
        try:
            res = supabase.table("orcamentos").update({
                "status": novo_status,
                "updated_at": now_iso
            }).eq("id", str(orcamento_id)).execute()
            if res.data:
                target_orc = res.data[0]
                # Trigger do BD atualiza a obra automaticamente
        except Exception as e:
            logger.warning(f"Erro ao atualizar status no Supabase: {e}")

    if not target_orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado.")

    return target_orc


@router.delete("/orcamentos/{orcamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_orcamento(orcamento_id: str, user: dict = Depends(get_current_user)):
    """Exclui um orçamento e seus itens vinculados."""
    global MOCK_ORCAMENTOS
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("orcamentos").delete().eq("id", str(orcamento_id)).execute()
        except Exception as e:
            logger.warning(f"Erro ao excluir orcamento no Supabase: {e}")

    MOCK_ORCAMENTOS = [o for o in MOCK_ORCAMENTOS if o["id"] != str(orcamento_id)]
    return None


# ========================================
# SERVIÇOS (Composição com Materiais)
# ========================================

@router.get("", response_model=List[dict])
async def list_servicos(
    obra_id: Optional[UUID] = Query(None),
    categoria: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    """Lista todos os serviços, opcionalmente filtrados por obra e categoria."""
    supabase = get_supabase_client()
    if supabase:
        try:
            query = supabase.table("servicos").select("*").order("created_at", desc=True)
            if obra_id:
                query = query.eq("obra_id", str(obra_id))
            if categoria:
                query = query.eq("categoria", categoria)
            if search:
                query = query.ilike("nome", f"%{search}%")
            res = query.execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            logger.warning(f"Erro ao listar serviços no Supabase: {e}")

    # Mock data para desenvolvimento
    return [
        {
            "id": "s001",
            "obra_id": None,
            "nome": "Parede Drywall Standard (120mm)",
            "descricao": "Parede em drywall com estrutura metálica 70mm e placa ST 12.5mm em ambos os lados. Inclui tratamento de juntas.",
            "categoria": "Alvenaria",
            "preco_total": 145.00,
            "margem_lucro": 25.00,
            "mao_de_obra": 45.00,
        }
    ]


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_servico(servico: ServicoCreate, user: dict = Depends(get_current_user)):
    """Cadastra um novo serviço com materiais vinculados e cálculo bidirecional de margem."""
    supabase = get_supabase_client()
    # Converter UUID obra_id para string se presente
    if data.get("obra_id"):
        data["obra_id"] = str(data["obra_id"])
    data["created_by"] = None if user.get("is_mock") else user.get("id")

    # Recalcula margem sobre venda se preco_total > 0 e margem_lucro não calculada
    custo_tot = float(data.get("mao_de_obra", 0))
    preco_venda = float(data.get("preco_total", 0))
    if preco_venda > 0 and (data.get("margem_lucro") is None or data.get("margem_lucro") == 0.0):
        data["margem_lucro"] = round(((preco_venda - custo_tot) / preco_venda) * 100, 2)

    if supabase:
        try:
            res = supabase.table("servicos").insert(data).execute()
            created = res.data[0]
            return created
        except Exception as e:
            logger.error(f"Erro ao inserir serviço no Supabase: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao criar serviço: {str(e)}")

    data["id"] = "s-new-001"
    return data


@router.get("/{servico_id}", response_model=dict)
async def get_servico(servico_id: UUID, user: dict = Depends(get_current_user)):
    """Retorna detalhes completos de um serviço com seus materiais."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("servicos").select("*").eq("id", str(servico_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        return res.data[0]
    raise HTTPException(status_code=404, detail="Serviço não encontrado.")


@router.put("/{servico_id}", response_model=dict)
async def update_servico(servico_id: UUID, servico: ServicoUpdate, user: dict = Depends(get_current_user)):
    """Atualiza os dados de um serviço e sua composição de insumos."""
    supabase = get_supabase_client()
    update_data = servico.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
    
    materiais = update_data.pop("materiais", None)
    if "obra_id" in update_data and update_data["obra_id"]:
        update_data["obra_id"] = str(update_data["obra_id"])
        
    update_data["updated_at"] = datetime.utcnow().isoformat()

    if supabase:
        # Se materiais fornecidos, atualiza a relação de insumos
        if materiais is not None:
            try:
                supabase.table("servico_materiais").delete().eq("servico_id", str(servico_id)).execute()
                for m in materiais:
                    m_data = {
                        "servico_id": str(servico_id),
                        "material_id": str(m["material_id"]),
                        "quantidade": m["quantidade"],
                        "rendimento": m["rendimento"],
                        "preco_unitario": m["preco_unitario"]
                    }
                    supabase.table("servico_materiais").insert(m_data).execute()
            except Exception as e:
                logger.warning(f"Erro ao sincronizar materiais do serviço {servico_id}: {e}")

        # Se margem não foi especificada, calcula automaticamente
        if "margem_lucro" not in update_data:
            try:
                curr_sm = supabase.table("servico_materiais").select("quantidade, preco_unitario").eq("servico_id", str(servico_id)).execute()
                custo_mat = sum(float(it.get("quantidade", 0)) * float(it.get("preco_unitario", 0)) for it in (curr_sm.data or []))
                
                # Preço e Mão de Obra atuais ou novos
                curr_srv = supabase.table("servicos").select("preco_total, mao_de_obra").eq("id", str(servico_id)).execute()
                base_srv = curr_srv.data[0] if curr_srv.data else {}
                
                pv = float(update_data.get("preco_total", base_srv.get("preco_total", 0)))
                mo = float(update_data.get("mao_de_obra", base_srv.get("mao_de_obra", 0)))
                ct = custo_mat + mo
                if pv > 0:
                    update_data["margem_lucro"] = round(((pv - ct) / pv) * 100, 2)
            except Exception as e:
                logger.warning(f"Erro no cálculo de margem ao atualizar serviço: {e}")

        if update_data:
            res = supabase.table("servicos").update(update_data).eq("id", str(servico_id)).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        
        full = supabase.table("servicos").select("*").eq("id", str(servico_id)).execute()
        return full.data[0] if full.data else {"id": str(servico_id), **update_data}

    return {"id": str(servico_id), **update_data}


@router.patch("/{servico_id}/valores", response_model=dict)
async def update_servico_valores(
    servico_id: UUID,
    valores: ServicoValoresUpdate,
    user: dict = Depends(get_current_user)
):
    """Atualização rápida de preço de venda (preco_total) e/ou custo de terceiro (mao_de_obra) para a Tabela de Valores."""
    supabase = get_supabase_client()
    update_data = valores.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum valor para atualizar.")
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    if supabase:
        current = supabase.table("servicos").select("*").eq("id", str(servico_id)).execute()
        if not current.data:
            raise HTTPException(status_code=404, detail="Serviço não encontrado.")
        
        curr_servico = current.data[0]
        
        preco_venda = float(update_data.get("preco_total", curr_servico.get("preco_total", 0)))
        custo_terceiro = float(update_data.get("mao_de_obra", curr_servico.get("mao_de_obra", 0)))
        custo_total = custo_terceiro
        
        if "margem_lucro" not in update_data:
            if preco_venda > 0:
                update_data["margem_lucro"] = round(((preco_venda - custo_total) / preco_venda) * 100, 2)
            else:
                update_data["margem_lucro"] = 0.0
                
        res = supabase.table("servicos").update(update_data).eq("id", str(servico_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Erro ao atualizar valores do serviço.")
            
        return res.data[0]
        
    return {"id": str(servico_id), **update_data}


@router.delete("/{servico_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_servico(servico_id: UUID, user: dict = Depends(get_current_user)):
    """Remove um serviço e todos os seus materiais vinculados (CASCADE)."""
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("servicos").delete().eq("id", str(servico_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    return None




