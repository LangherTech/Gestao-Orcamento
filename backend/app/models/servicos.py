from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID




# ========================================
# Serviços
# ========================================
class ServicoBase(BaseModel):
    obra_id: Optional[UUID] = None
    nome: str = Field(..., max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=100)
    unidade: str = Field("Unidade", max_length=50)
    preco_total: float = Field(0.00, ge=0, description="Preço final de venda ao cliente por unidade (ex: R$ 70,00)")
    margem_lucro: float = Field(0.00, description="% de margem de lucro sobre a venda calculada automaticamente")
    mao_de_obra: float = Field(0.00, ge=0, description="Custo da mão de obra do terceiro/empreiteiro por unidade (ex: R$ 50,00)")

class ServicoCreate(ServicoBase):
    pass

class ServicoUpdate(BaseModel):
    obra_id: Optional[UUID] = None
    nome: Optional[str] = Field(None, max_length=255)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=100)
    unidade: Optional[str] = Field(None, max_length=50)
    preco_total: Optional[float] = Field(None, ge=0)
    margem_lucro: Optional[float] = None
    mao_de_obra: Optional[float] = Field(None, ge=0)

class ServicoValoresUpdate(BaseModel):
    preco_total: Optional[float] = Field(None, ge=0, description="Preço de venda ao cliente")
    mao_de_obra: Optional[float] = Field(None, ge=0, description="Custo da mão de obra do terceiro")
    margem_lucro: Optional[float] = Field(None, description="% margem de lucro")

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
    tipo: str = Field("servico", description="servico ou insumo")
    descricao: Optional[str] = None
    quantidade: float = Field(1.0, ge=0)
    preco_unitario: Optional[float] = Field(0.0, ge=0)
    unidade: Optional[str] = None
    preco_catalogo: Optional[float] = None
    embalagem_id: Optional[UUID] = None
    origem_assistente: Optional[bool] = False
    assistente_execucao_id: Optional[str] = None
    fornecido_por: Optional[str] = Field("Edifica", description="Edifica ou Cliente")

class OrcamentoItemResponse(BaseModel):
    id: Optional[str] = None
    orcamento_id: Optional[str] = None
    servico_id: Optional[str] = None
    material_id: Optional[str] = None
    tipo: str = "servico"
    descricao: str
    quantidade: float
    preco_unitario: float
    unidade: Optional[str] = None
    preco_catalogo: Optional[float] = None
    embalagem_id: Optional[str] = None
    origem_assistente: Optional[bool] = False
    assistente_execucao_id: Optional[str] = None
    fornecido_por: Optional[str] = "Edifica"
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
    condicao_pagamento: Optional[str] = None
    modo_exibicao: Optional[str] = Field("resumido", description="resumido ou detalhado")
    fornecimento_materiais: str = Field("edifica", description="edifica ou cliente")
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
    condicao_pagamento: Optional[str] = None
    modo_exibicao: Optional[str] = None
    fornecimento_materiais: Optional[str] = None
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
    valor_total: float
    validade_dias: int
    status: str
    observacoes: Optional[str] = None
    notas: Optional[str] = None
    impostos_percentual: float = 0.0
    margem_bdi_percentual: float = 0.0
    condicao_pagamento: Optional[str] = None
    modo_exibicao: Optional[str] = "resumido"
    fornecimento_materiais: str = "edifica"

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
    fornecimento_materiais: str = Field("edifica", description="edifica ou cliente")


