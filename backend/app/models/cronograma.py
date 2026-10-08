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

class EtapaCreate(EtapaBase):
    pass

class EtapaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    data_prevista_inicio: Optional[date] = None
    data_prevista_fim: Optional[date] = None
    data_real_inicio: Optional[date] = None
    data_real_fim: Optional[date] = None

class EtapaResponse(EtapaBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

