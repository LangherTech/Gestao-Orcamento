from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class ObraBase(BaseModel):
    nome: str = Field(..., max_length=255, description="Nome identificador da obra")
    cliente: Optional[str] = Field(None, max_length=255, description="Nome do cliente/contratante")
    endereco: Optional[str] = Field(None, description="Endereço físico do canteiro")
    data_inicio: Optional[date] = None
    data_prevista_fim: Optional[date] = None
    data_real_fim: Optional[date] = None
    valor_aprovado: float = Field(0.00, ge=0)
    valor_pendente_aprovacao: float = Field(0.00, ge=0)
    orcamento_materiais: float = Field(0.00, ge=0)
    orcamento_empreiteiros: float = Field(0.00, ge=0)
    orcamento_caixa: float = Field(0.00, ge=0)
    status: str = Field("ativa", description="ativa ou concluida (obra iniciada não é cancelada)")
    arquivada: bool = Field(False, description="Flag visual para não poluir a tela principal")
    latitude: Optional[float] = Field(None, description="Latitude para geolocalização")
    longitude: Optional[float] = Field(None, description="Longitude para geolocalização")

class ObraCreate(ObraBase):
    pass

class ObraUpdate(BaseModel):
    nome: Optional[str] = None
    cliente: Optional[str] = None
    endereco: Optional[str] = None
    data_inicio: Optional[date] = None
    data_prevista_fim: Optional[date] = None
    data_real_fim: Optional[date] = None
    valor_aprovado: Optional[float] = None
    valor_pendente_aprovacao: Optional[float] = None
    orcamento_materiais: Optional[float] = None
    orcamento_empreiteiros: Optional[float] = None
    orcamento_caixa: Optional[float] = None
    status: Optional[str] = None
    arquivada: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ObraStatusUpdate(BaseModel):
    status: str = Field(..., description="Status da obra: 'ativa' ou 'concluida'")

class ObraArquivarUpdate(BaseModel):
    arquivada: Optional[bool] = Field(None, description="Flag de arquivamento. Se nulo, inverte o valor atual")

class ObraResponse(ObraBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

