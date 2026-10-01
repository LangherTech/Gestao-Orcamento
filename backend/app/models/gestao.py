from typing import Optional
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class EmpreiteiroBase(BaseModel):
    nome: str = Field(..., max_length=255)
    cpf_cnpj: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    area_atuacao: Optional[str] = Field(None, max_length=100)
    ativo: bool = True

class EmpreiteiroResponse(EmpreiteiroBase):
    id: UUID
    created_at: Optional[datetime] = None

class ContratoEmpreiteiroBase(BaseModel):
    obra_id: UUID
    empreiteiro_id: UUID
    tipo_contrato: str = Field(..., description="valor_fechado, por_medicao")
    valor_total: float = Field(0.00, ge=0)
    data_assinatura: Optional[date] = None
    data_termino: Optional[date] = None
    escopo: Optional[str] = None
    condicoes_pagamento: Optional[str] = None
    status: str = Field("ativo")

class ContratoEmpreiteiroResponse(ContratoEmpreiteiroBase):
    id: UUID
    created_at: Optional[datetime] = None
