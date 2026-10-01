from typing import Optional, List, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class EtapaBase(BaseModel):
    obra_id: UUID
    nome: str = Field(..., max_length=255)
    etapa_pai_id: Optional[UUID] = None
    data_prevista_inicio: Optional[date] = None
    data_prevista_fim: Optional[date] = None
    data_real_inicio: Optional[date] = None
    data_real_fim: Optional[date] = None
    custo_previsto: float = Field(0.00, ge=0)
    custo_real: float = Field(0.00, ge=0)
    percentual_conclusao: float = Field(0.00, ge=0, le=100)

class EtapaCreate(EtapaBase):
    pass

class EtapaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    data_prevista_inicio: Optional[date] = None
    data_prevista_fim: Optional[date] = None
    data_real_inicio: Optional[date] = None
    data_real_fim: Optional[date] = None
    custo_previsto: Optional[float] = Field(None, ge=0)
    custo_real: Optional[float] = Field(None, ge=0)
    percentual_conclusao: Optional[float] = Field(None, ge=0, le=100)

class EtapaResponse(EtapaBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ChecklistItem(BaseModel):
    id: str
    descricao: str
    status: str = Field(..., description="ok|pendente")

class ChecklistBase(BaseModel):
    etapa_id: UUID
    nome: str = Field(..., max_length=255)
    items: List[ChecklistItem] = []

class ChecklistCreate(ChecklistBase):
    pass

class ChecklistUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    items: Optional[List[ChecklistItem]] = None

class ChecklistResponse(ChecklistBase):
    id: UUID
    created_at: Optional[datetime] = None
