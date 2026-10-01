from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class RDOFotoBase(BaseModel):
    url: str
    descricao: Optional[str] = None

class RDOFotoCreate(RDOFotoBase):
    pass

class RDOFotoResponse(RDOFotoBase):
    id: UUID
    rdo_id: UUID
    uploaded_at: Optional[datetime] = None

class RDOBase(BaseModel):
    obra_id: Optional[UUID] = None
    data: date = Field(default_factory=date.today)
    equipe_presente: Optional[List[str]] = Field(default=[], description="Nomes e funções dos profissionais no canteiro")
    total_trabalhadores: Optional[int] = Field(default=0, description="Total de operários no dia")
    atividades_realizadas: str = Field(..., description="Descrição detalhada das atividades do dia")
    materiais_utilizados: Optional[str] = Field(default=None, description="Insumos consumidos e entregas recebidas")
    equipamentos: Optional[str] = Field(default=None, description="Maquinário e ferramentas utilizadas")
    condicoes_climaticas: Optional[str] = Field("Ensolarado", max_length=100)
    clima_manha: Optional[str] = Field("Ensolarado", max_length=50)
    clima_tarde: Optional[str] = Field("Ensolarado", max_length=50)
    status_trabalho: Optional[str] = Field("praticavel", max_length=50, description="praticavel, impraticavel_chuva, parcial")
    dds_tema: Optional[str] = Field(default=None, description="Tema do Diálogo Diário de Segurança e EPIs")
    ocorrencias: Optional[str] = Field(default=None, description="Imprevistos, acidentes ou paralisações")
    observacoes: Optional[str] = Field(default=None, description="Comentários adicionais da fiscalização/mestre")

class RDOCreate(RDOBase):
    fotos: Optional[List[RDOFotoCreate]] = Field(default=[], description="Lista de fotos anexadas")

class RDOUpdate(BaseModel):
    obra_id: Optional[UUID] = None
    data: Optional[date] = None
    equipe_presente: Optional[List[str]] = None
    total_trabalhadores: Optional[int] = None
    atividades_realizadas: Optional[str] = None
    materiais_utilizados: Optional[str] = None
    equipamentos: Optional[str] = None
    condicoes_climaticas: Optional[str] = None
    clima_manha: Optional[str] = None
    clima_tarde: Optional[str] = None
    status_trabalho: Optional[str] = None
    dds_tema: Optional[str] = None
    ocorrencias: Optional[str] = None
    observacoes: Optional[str] = None
    fotos: Optional[List[RDOFotoCreate]] = None

class RDOResponse(RDOBase):
    id: UUID
    obra_nome: Optional[str] = None
    obra_cliente: Optional[str] = None
    fotos: Optional[List[dict]] = []
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
