from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from ..models.calendario import AlocacaoBase, FuncionarioResponse
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/calendario", tags=["Calendário e Equipe"])

@router.get("/funcionarios", response_model=List[dict])
async def list_funcionarios(user: dict = Depends(get_current_user)):
    """Lista colaboradores próprios CLT."""
    return [
        {"id": "func-01", "nome": "Carlos Mendes", "cargo": "Mestre de Obras", "ativo": True},
        {"id": "func-02", "nome": "João Silva", "cargo": "Gesseiro / Drywall", "ativo": True},
        {"id": "func-03", "nome": "Antônio Prado", "cargo": "Ajudante Geral", "ativo": True}
    ]

@router.get("/alocacoes", response_model=List[dict])
async def list_alocacoes(obra_id: Optional[UUID] = Query(None), user: dict = Depends(get_current_user)):
    """Lista alocações de colaboradores em obras."""
    return [
        {
            "id": "aloc-01",
            "obra_id": str(obra_id) if obra_id else "e0a12345-6789-4321-bcde-000000000001",
            "funcionario_nome": "Carlos Mendes",
            "data_inicio": "2026-09-01",
            "data_fim": "2026-09-30",
            "periodo": "dia_inteiro"
        }
    ]
