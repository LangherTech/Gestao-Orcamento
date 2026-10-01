import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .routes import (
    auth_router,
    obras_router,
    servicos_router,
    financeiro_router,
    rdo_router,
    cronograma_router,
    compras_router,
    gestao_router,
    calendario_router,
    dashboards_router,
    visitas_router,
)

load_dotenv()

app = FastAPI(
    title="Edifica — API de Gestão de Orçamentos e Obras",
    description="API RESTful para controle de obras, orçamentos em PDF, cronograma, RDO, compras e financeiro.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuração de CORS
allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:5173",
    "http://localhost:3000",
    "https://edifica.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos roteadores com prefixo /api/v1
API_PREFIX = "/api/v1"
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(obras_router, prefix=API_PREFIX)
app.include_router(servicos_router, prefix=API_PREFIX)
app.include_router(financeiro_router, prefix=API_PREFIX)
app.include_router(rdo_router, prefix=API_PREFIX)
app.include_router(cronograma_router, prefix=API_PREFIX)
app.include_router(compras_router, prefix=API_PREFIX)
app.include_router(gestao_router, prefix=API_PREFIX)
app.include_router(calendario_router, prefix=API_PREFIX)
app.include_router(dashboards_router, prefix=API_PREFIX)
app.include_router(visitas_router, prefix=API_PREFIX)

@app.get("/", tags=["Health Check"])
async def root():
    return {
        "status": "online",
        "app": "Edifica — API de Gestão de Obras",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health", tags=["Health Check"])
async def health_check():
    return {"status": "healthy"}
