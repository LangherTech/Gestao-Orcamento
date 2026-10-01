from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class ReceitaBase(BaseModel):
    obra_id: UUID
    descricao: str = Field(..., max_length=255)
    data_receita: date = Field(default_factory=date.today)
    valor: float = Field(..., gt=0)
    status: str = Field("pendente", description="pendente, recebido")

class ReceitaCreate(ReceitaBase):
    pass

class ReceitaResponse(ReceitaBase):
    id: UUID
    created_at: Optional[datetime] = None

class CaixaPequenoBase(BaseModel):
    obra_id: UUID
    data: date = Field(default_factory=date.today)
    descricao: str = Field(..., max_length=255)
    valor: float = Field(..., gt=0)
    categoria: str = Field(..., max_length=100, description="Material, Alimentação, Frete, Outro")
    status: str = Field("pendente_aprovacao", description="pendente_aprovacao, aprovado")

class CaixaPequenoCreate(CaixaPequenoBase):
    pass

class CaixaPequenoResponse(CaixaPequenoBase):
    id: UUID
    created_by: Optional[UUID] = None
    approved_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
