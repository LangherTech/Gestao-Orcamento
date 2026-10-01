from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class FuncionarioBase(BaseModel):
    nome: str = Field(..., max_length=255)
    ativo: bool = True

class FuncionarioResponse(FuncionarioBase):
    id: UUID
    created_at: Optional[datetime] = None

class AlocacaoBase(BaseModel):
    obra_id: UUID
    funcionario_id: UUID
    data_inicio: date
    data_fim: date
    periodo: str = Field("dia_inteiro", description="dia_inteiro, manha, tarde")

class AlocacaoResponse(AlocacaoBase):
    id: UUID
    created_at: Optional[datetime] = None
