from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class ProfissaoBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)

class ProfissaoCreate(ProfissaoBase):
    pass

class ProfissaoUpdate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)

class ProfissaoResponse(ProfissaoBase):
    id: UUID
    created_at: Optional[datetime] = None
    total_funcionarios: Optional[int] = 0

class FuncionarioBase(BaseModel):
    nome: str = Field(..., max_length=255)
    cargo: Optional[str] = Field(None, max_length=100)
    telefone: Optional[str] = Field(None, max_length=50)
    cpf: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=255)
    ativo: bool = True
    lider: bool = False
    cor: Optional[str] = None
    equipe_padrao_id: Optional[UUID] = None
    valor_diaria: Optional[float] = None
    profissoes_ids: Optional[List[UUID]] = None

class FuncionarioUpdate(BaseModel):
    nome: Optional[str] = None
    cargo: Optional[str] = None
    telefone: Optional[str] = None
    cpf: Optional[str] = None
    email: Optional[str] = None
    ativo: Optional[bool] = None
    lider: Optional[bool] = None
    cor: Optional[str] = None
    equipe_padrao_id: Optional[UUID] = None
    valor_diaria: Optional[float] = None
    profissoes_ids: Optional[List[UUID]] = None

class FuncionarioResponse(FuncionarioBase):
    id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class AlocacaoBase(BaseModel):
    obra_id: UUID
    funcionario_id: UUID
    data_inicio: date
    data_fim: date
    periodo: str = Field("dia_inteiro", description="dia_inteiro, manha, tarde")
    modalidade_pagamento: str = Field("diaria", description="diaria, fechado")
    valor_diaria: Optional[float] = None
    valor_fechado: Optional[float] = None

class AlocacaoUpdate(BaseModel):
    obra_id: Optional[UUID] = None
    funcionario_id: Optional[UUID] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    periodo: Optional[str] = None
    modalidade_pagamento: Optional[str] = None
    valor_diaria: Optional[float] = None
    valor_fechado: Optional[float] = None

class AlocacaoResponse(AlocacaoBase):
    id: UUID
    created_at: Optional[datetime] = None

class EquipeBase(BaseModel):
    nome: str = Field(..., max_length=255)
    lider_id: Optional[UUID] = None

class EquipeResponse(EquipeBase):
    id: UUID
    created_at: Optional[datetime] = None

class PagamentoFuncionarioBase(BaseModel):
    funcionario_id: UUID
    alocacao_id: Optional[UUID] = None
    obra_id: UUID
    modalidade: str = Field(..., description="diaria, fechado")
    data_pagamento: date
    valor_pago: float

class PagamentoFuncionarioResponse(PagamentoFuncionarioBase):
    id: UUID
    created_at: Optional[datetime] = None

class FaltaBase(BaseModel):
    funcionario_id: UUID
    obra_id: Optional[UUID] = None
    data: date
    motivo: Optional[str] = None

class FaltaCreate(FaltaBase):
    pass

class FaltaResponse(FaltaBase):
    id: UUID
    created_at: Optional[datetime] = None
