from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, Field
from uuid import UUID

class PedidoItemInput(BaseModel):
    descricao: str = Field(..., max_length=255)
    quantidade: float = Field(..., gt=0)
    preco_unitario: float = Field(..., ge=0)

class PedidoCompraBase(BaseModel):
    obra_id: UUID
    fornecedor_id: Optional[UUID] = None
    numero: Optional[str] = Field(None, max_length=50)
    data_pedido: date = Field(default_factory=date.today)
    data_entrega_prevista: Optional[date] = None
    valor_total: float = Field(0.0, ge=0)
    status: str = Field("cotacao", description="cotacao, aprovado, recebido, pago")

class PedidoCompraCreate(PedidoCompraBase):
    itens: Optional[List[PedidoItemInput]] = []

class PedidoCompraResponse(PedidoCompraBase):
    id: UUID
    created_by: Optional[UUID] = None
    created_at: Optional[datetime] = None
