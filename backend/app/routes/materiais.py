from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import List, Dict, Any, Optional
from uuid import UUID
import math

from ..models.materiais import (
    MaterialCreate, MaterialUpdate, MaterialResponse,
    AssistenteDrywallInput, AssistenteDrywallItemResponse, AssistenteInsumoUpdate
)
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client
import logging

logger = logging.getLogger("edifica.materiais")

router = APIRouter(prefix="/materiais", tags=["Materiais"])

# ========================================
# MATERIAIS / INSUMOS
# ========================================
@router.get("", response_model=List[MaterialResponse])
async def list_materiais(user: dict = Depends(get_current_user)):
    """Lista todos os materiais do catálogo global."""
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("materiais").select("*").order("nome").execute()
            return res.data or []
        except Exception as e:
            logger.error(f"Erro ao buscar materiais: {e}")
            raise HTTPException(status_code=500, detail="Erro interno ao buscar catálogo de materiais.")

    # Fallback / Mock
    return [
        {
            "id": "m001",
            "nome": "Placa Drywall Standard ST 12.5mm",
            "unidade": "M²",
            "preco_medio": 22.50,
            "created_at": "2024-01-15T10:00:00Z"
        }
    ]

@router.post("", response_model=MaterialResponse, status_code=status.HTTP_201_CREATED)
async def create_material(material: MaterialCreate, user: dict = Depends(get_current_user)):
    """Cadastra um novo material no catálogo global."""
    supabase = get_supabase_client()
    data = material.model_dump()
    data["created_by"] = None if user.get("is_mock") else user.get("id")

    if supabase:
        res = supabase.table("materiais").insert(data).execute()
        return res.data[0]

    data["id"] = "m-new-001"
    return data

@router.patch("/{material_id}", response_model=MaterialResponse)
async def update_material(material_id: UUID, material: MaterialUpdate, user: dict = Depends(get_current_user)):
    """Atualiza dados de um material do catálogo."""
    supabase = get_supabase_client()
    update_data = material.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum campo para atualizar.")
    
    if supabase:
        res = supabase.table("materiais").update(update_data).eq("id", str(material_id)).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Material não encontrado.")
        return res.data[0]
    return {"id": str(material_id), **update_data}

@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_material(material_id: UUID, user: dict = Depends(get_current_user)):
    """Exclui um material do catálogo (falha se houver vínculo com algum serviço ativo)."""
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("materiais").delete().eq("id", str(material_id)).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Material não encontrado.")
        except Exception as e:
            if "violates foreign key constraint" in str(e):
                raise HTTPException(status_code=400, detail="Não é possível excluir material vinculado a orçamentos.")
            raise HTTPException(status_code=500, detail="Erro interno ao excluir material.")
    return None

# ========================================
# ASSISTENTE DRYWALL
# ========================================
@router.get("/assistentes/insumos", response_model=List[dict])
async def list_assistente_insumos(
    assistente: Optional[str] = Query(None),
    user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    if not supabase:
        return []
    query = supabase.table("assistente_insumos").select("*, materiais(*)")
    if assistente:
        query = query.eq("assistente", assistente)
    res = query.execute()
    return res.data or []

@router.put("/assistentes/insumos/{papel}", response_model=dict)
async def update_assistente_insumo(
    papel: str,
    payload: AssistenteInsumoUpdate,
    user: dict = Depends(get_current_user)
):
    supabase = get_supabase_client()
    if not supabase:
        raise HTTPException(status_code=500, detail="Database error")
    
    res = supabase.table("assistente_insumos").update({
        "material_id": str(payload.material_id),
    }).eq("papel", papel).execute()
    
    if not res.data:
        raise HTTPException(status_code=404, detail="Insumo do assistente não encontrado")
    return res.data[0]

@router.post("/assistentes/drywall/calcular", response_model=List[AssistenteDrywallItemResponse])
async def calcular_drywall(
    params: AssistenteDrywallInput,
    user: dict = Depends(get_current_user)
):
    """
    Motor de cálculo para paredes em Drywall.
    Retorna uma lista de insumos com quantidades calculadas com base nos parâmetros (exato vs rápido).
    """
    area = params.area_m2
    comprimento = params.comprimento_m
    pe_direito = params.pe_direito_m
    if params.modo == "rapido" and comprimento == 0:
        comprimento = area / pe_direito
    fator_perda = 1 + (params.perda_percentual / 100.0)
    
    supabase = get_supabase_client()
    catalogo = []
    if supabase:
        cat_res = supabase.table("materiais").select("id, nome, preco_medio, unidade").execute()
        catalogo = cat_res.data or []
        
    def find_mat(keywords):
        for c in catalogo:
            n = c["nome"].lower()
            if all(k.lower() in n for k in keywords):
                return c
        return None

    # Lógica de cálculo simplificada do Drywall...
    # Placas (2 lados)
    qtd_placas_liquida = (area * 2) / 2.88
    qtd_placas_compra = math.ceil(qtd_placas_liquida * fator_perda)
    placa_mat = find_mat(["placa", "drywall", params.tipo_placa]) or find_mat(["placa", "drywall", "st"])
    
    # Guias (piso + teto)
    qtd_guias_liquida = (comprimento * 2) / 3.0
    qtd_guias_compra = math.ceil(qtd_guias_liquida * fator_perda)
    guia_mat = find_mat(["guia", "70"])
    
    # Montantes (espaçamento 600mm ou 400mm)
    espacamento_m = params.modulacao_mm / 1000.0
    qtd_montantes_parede = math.ceil(comprimento / espacamento_m) + 1
    tamanho_montante_padrao = 3.0
    montantes_necessarios_por_perfil = math.ceil(pe_direito / tamanho_montante_padrao)
    qtd_montantes_compra = math.ceil((qtd_montantes_parede * montantes_necessarios_por_perfil) * fator_perda)
    montante_mat = find_mat(["montante", "70"])

    # Massa e Fita
    massa_mat = find_mat(["massa", "gesso"])
    fita_mat = find_mat(["fita", "telada"])
    
    # Parafusos
    t25_mat = find_mat(["t25"])
    t42_mat = find_mat(["t42"])

    itens = []
    
    itens.append({
        "papel": f"Placa {params.tipo_placa}",
        "descricao": placa_mat["nome"] if placa_mat else f"Placa Drywall {params.tipo_placa} 12.5mm (1200x2400)",
        "material_id": placa_mat["id"] if placa_mat else None,
        "unidade": placa_mat["unidade"] if placa_mat else "Un",
        "qtd_liquida_uso": round(qtd_placas_liquida, 2),
        "unidade_uso": "Placas",
        "qtd_compra": qtd_placas_compra,
        "preco_unitario": placa_mat["preco_medio"] if placa_mat else 28.00,
        "sem_vinculo": not placa_mat
    })

    itens.append({
        "papel": "Guia 70mm",
        "descricao": guia_mat["nome"] if guia_mat else "Perfil Guia 70mm (3m)",
        "material_id": guia_mat["id"] if guia_mat else None,
        "unidade": guia_mat["unidade"] if guia_mat else "Br",
        "qtd_liquida_uso": round(qtd_guias_liquida, 2),
        "unidade_uso": "Barras",
        "qtd_compra": qtd_guias_compra,
        "preco_unitario": guia_mat["preco_medio"] if guia_mat else 18.50,
        "sem_vinculo": not guia_mat
    })

    itens.append({
        "papel": "Montante 70mm",
        "descricao": montante_mat["nome"] if montante_mat else "Perfil Montante 70mm (3m)",
        "material_id": montante_mat["id"] if montante_mat else None,
        "unidade": montante_mat["unidade"] if montante_mat else "Br",
        "qtd_liquida_uso": round(qtd_montantes_parede * montantes_necessarios_por_perfil, 2),
        "unidade_uso": "Barras",
        "qtd_compra": qtd_montantes_compra,
        "preco_unitario": montante_mat["preco_medio"] if montante_mat else 21.00,
        "sem_vinculo": not montante_mat
    })
    
    # Insumos embutidos
    itens.append({
        "papel": "Massa para Tratamento de Juntas",
        "descricao": massa_mat["nome"] if massa_mat else "Massa Pronta para Drywall (Balde 28kg)",
        "material_id": massa_mat["id"] if massa_mat else None,
        "unidade": "Un",
        "qtd_liquida_uso": round(area * 0.5, 2), # 0.5kg/m2
        "unidade_uso": "Kg",
        "qtd_compra": math.ceil(area * 0.5 / 28.0), # baldes
        "preco_unitario": massa_mat["preco_medio"] if massa_mat else 85.00,
        "sem_vinculo": not massa_mat
    })

    return itens
