from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


# ========================================
# Materiais (Catálogo de Insumos)
# ========================================
class MaterialBase(BaseModel):
    nome: str = Field(..., max_length=255)
    unidade: str = Field(..., max_length=20, description="ML, M², M³, Unidade")
    preco_medio: float = Field(0.00, ge=0)

class MaterialCreate(MaterialBase):
    pass

class MaterialUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    unidade: Optional[str] = Field(None, max_length=20)
    preco_medio: Optional[float] = Field(None, ge=0)

class MaterialResponse(MaterialBase):
    id: UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========================================
# Composição de Insumos do Serviço
# ========================================
class ServicoMaterialInput(BaseModel):
    material_id: UUID
    quantidade: float = Field(1.0, gt=0)
    rendimento: float = Field(1.0, gt=0)
    preco_unitario: float = Field(0.0, ge=0)

class ServicoMaterialResponse(BaseModel):
    id: UUID
    servico_id: UUID
    material_id: UUID
    quantidade: float
    rendimento: float
    preco_unitario: float
    subtotal: Optional[float] = None
    # Dados do material via join
    material_nome: Optional[str] = None
    material_unidade: Optional[str] = None

    class Config:
        from_attributes = True


# ========================================
# Serviços
# ========================================
class ServicoBase(BaseModel):
    obra_id: Optional[UUID] = None
    nome: str = Field(..., max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=100)
    unidade: str = Field("Unidade", max_length=50)
    preco_total: float = Field(0.00, ge=0)
    margem_lucro: float = Field(0.00, ge=0)
    mao_de_obra: float = Field(0.00, ge=0)

class ServicoCreate(ServicoBase):
    materiais: Optional[List[ServicoMaterialInput]] = []

class ServicoUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=100)
    unidade: Optional[str] = Field(None, max_length=50)
    preco_total: Optional[float] = Field(None, ge=0)
    margem_lucro: Optional[float] = Field(None, ge=0)
    mao_de_obra: Optional[float] = Field(None, ge=0)

class ServicoResponse(ServicoBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ========================================
# Orçamento (Persistência e Geração)
# ========================================
class OrcamentoItemInput(BaseModel):
    servico_id: Optional[UUID] = None
    material_id: Optional[UUID] = None
    descricao: Optional[str] = None
    quantidade: float = Field(1.0, gt=0)
    preco_unitario: Optional[float] = Field(0.0, ge=0)
    desconto_percentual: float = Field(0.0, ge=0, le=100)

class OrcamentoItemResponse(BaseModel):
    id: Optional[str] = None
    orcamento_id: Optional[str] = None
    servico_id: Optional[str] = None
    material_id: Optional[str] = None
    descricao: str
    quantidade: float
    preco_unitario: float
    desconto_percentual: float
    subtotal: float

class OrcamentoCreate(BaseModel):
    obra_id: Optional[UUID] = None
    numero: Optional[str] = None
    cliente_nome: str = Field(..., max_length=255)
    cliente_contato: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_endereco: Optional[str] = None
    prazo_dias: Optional[int] = 10
    prazo_garantia: Optional[str] = "12 (doze) meses"
    objetivo: Optional[str] = None
    validade_dias: int = Field(15, ge=1)
    status: str = Field("rascunho", description="rascunho, enviado, aprovado, recusado")
    observacoes: Optional[str] = None
    notas: Optional[str] = None
    impostos_percentual: float = Field(0.0, ge=0)
    margem_bdi_percentual: float = Field(0.0, ge=0)
    itens: List[OrcamentoItemInput] = []

class OrcamentoUpdate(BaseModel):
    obra_id: Optional[UUID] = None
    cliente_nome: Optional[str] = None
    cliente_contato: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_endereco: Optional[str] = None
    prazo_dias: Optional[int] = None
    prazo_garantia: Optional[str] = None
    objetivo: Optional[str] = None
    validade_dias: Optional[int] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    notas: Optional[str] = None
    impostos_percentual: Optional[float] = None
    margem_bdi_percentual: Optional[float] = None
    itens: Optional[List[OrcamentoItemInput]] = None

class OrcamentoStatusUpdate(BaseModel):
    status: str = Field(..., description="rascunho, enviado, aprovado, recusado")

class OrcamentoResponse(BaseModel):
    id: str
    obra_id: Optional[str] = None
    numero: str
    cliente_nome: str
    cliente_contato: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_endereco: Optional[str] = None
    prazo_dias: Optional[int] = None
    prazo_garantia: Optional[str] = None
    objetivo: Optional[str] = None
    subtotal: float
    desconto_total: float
    valor_total: float
    validade_dias: int
    status: str
    observacoes: Optional[str] = None
    notas: Optional[str] = None
    impostos_percentual: float = 0.0
    margem_bdi_percentual: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    itens: List[OrcamentoItemResponse] = []

    class Config:
        from_attributes = True

class OrcamentoGerarRequest(BaseModel):
    obra_id: Optional[UUID] = None
    cliente_nome: str = Field(..., max_length=255)
    cliente_contato: Optional[str] = None
    itens: List[OrcamentoItemInput]
    observacoes: Optional[str] = None
    notas: Optional[str] = None
    impostos_percentual: float = Field(0.0, ge=0)
    margem_bdi_percentual: float = Field(0.0, ge=0)
    validade_dias: int = Field(30, ge=1)

