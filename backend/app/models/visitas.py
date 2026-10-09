from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class VisitaBase(BaseModel):
    nome: str = Field(..., max_length=255)
    pessoa_contato: Optional[str] = Field(None, max_length=255)
    telefone: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    endereco: Optional[str] = None
    contato: Optional[str] = Field(None, max_length=100)
    classificacao: str = Field("Normal", description="Potencial, Normal")
    observacao: Optional[str] = None
    data_visita: date
    data_retorno: Optional[date] = None
    retorno_realizado: bool = False
    visitado_por: Optional[UUID] = None
    foto_url: Optional[str] = None

class VisitaCreate(VisitaBase):
    pass

class VisitaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    pessoa_contato: Optional[str] = Field(None, max_length=255)
    telefone: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    endereco: Optional[str] = None
    contato: Optional[str] = Field(None, max_length=100)
    classificacao: Optional[str] = None
    observacao: Optional[str] = None
    data_visita: Optional[date] = None
    data_retorno: Optional[date] = None
    retorno_realizado: Optional[bool] = None
    visitado_por: Optional[UUID] = None
    foto_url: Optional[str] = None

class VisitaResponse(VisitaBase):
    id: UUID
    cadastrado_por: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
