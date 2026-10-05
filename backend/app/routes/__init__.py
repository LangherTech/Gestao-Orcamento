from .auth import router as auth_router
from .obras import router as obras_router
from .servicos import router as servicos_router
from .financeiro import router as financeiro_router
from .rdo import router as rdo_router
from .cronograma import router as cronograma_router
from .compras import router as compras_router
from .gestao import router as gestao_router
from .calendario import router as calendario_router
from .dashboards import router as dashboards_router
from .visitas import router as visitas_router
from .audit import router as audit_router

__all__ = [
    "auth_router",
    "obras_router",
    "servicos_router",
    "financeiro_router",
    "rdo_router",
    "cronograma_router",
    "compras_router",
    "gestao_router",
    "calendario_router",
    "dashboards_router",
    "visitas_router",
    "audit_router"
]
