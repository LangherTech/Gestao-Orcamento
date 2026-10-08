from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

# ========================================
# Materiais / Insumos
# ========================================
class MaterialBase(BaseModel):
    nome: str = Field(..., max_length=255)
    unidade: Optional[str] = Field(None, max_length=50)
    preco_medio: float = Field(0.00, ge=0)
    fornecedor_padrao: Optional[str] = Field(None, max_length=255)

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    unidade: Optional[str] = Field(None, max_length=50)
    preco_medio: Optional[float] = Field(None, ge=0)
    fornecedor_padrao: Optional[str] = Field(None, max_length=255)

class MaterialResponse(MaterialBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# ========================================
# Assistente de Cálculo
# ========================================
class AssistenteDrywallInput(BaseModel):
    modo: str = Field("rapido", description="rapido ou exato")
    area_m2: float
    comprimento_m: float
    pe_direito_m: float = 2.70
    n_vaos: int = 0
    n_quinas_t: int = 0
    modulacao_mm: int = 600
    formato_placa: str
    tipo_placa: str = Field("ST", description="ST, RU, ou RF")
    perda_percentual: float = 10.0

class AssistenteDrywallItemResponse(BaseModel):
    papel: str
    descricao: str
    material_id: Optional[UUID] = None
    unidade: Optional[str] = None
    qtd_liquida_uso: float
    unidade_uso: str
    qtd_compra: float
    preco_unitario: Optional[float] = None
    fornecido_por: str = "Edifica"
    sem_vinculo: bool = False
    embalagens_recomendadas: List[dict] = []
    embalagem_id: Optional[UUID] = None
    sobra_unidades: Optional[float] = 0.0

class AssistenteInsumoUpdate(BaseModel):
    material_id: UUID

