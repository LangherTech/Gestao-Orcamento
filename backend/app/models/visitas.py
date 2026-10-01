from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class VisitaBase(BaseModel):
    nome: str = Field(..., max_length=255)
    endereco: Optional[str] = None
    contato: Optional[str] = Field(None, max_length=100)
    classificacao: str = Field("Normal", description="Potencial, Normal")
    observacao: Optional[str] = None
    data_visita: date
    visitado_por: Optional[UUID] = None
    foto_url: Optional[str] = None

class VisitaCreate(VisitaBase):
    pass

class VisitaResponse(VisitaBase):
    id: UUID
    cadastrado_por: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
