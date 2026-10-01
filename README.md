# Edifica — Gestão de Orçamentos e Obras

Sistema completo para gestão de obras, criação de orçamentos profissionais em PDF, acompanhamento físico-financeiro, diário de obra (RDO), compras e dashboards executivos.

---

## 🏗️ Estrutura do Projeto

O repositório está organizado como um monorepo dividido em:

- **`frontend/`**: Aplicação em React 18, Vite, Tailwind CSS, Recharts e cliente Supabase.
- **`backend/`**: API RESTful em Python (FastAPI), Pydantic v2 e integração Supabase / PostgreSQL.
- **`docs/`**: Especificações técnicas de arquitetura, banco de dados, API e deploy extraídas do Notion.

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
- **Node.js**: v18+ (recomendado Node 20+)
- **Python**: 3.10+ (compatível com 3.9+)
- **Projeto Supabase**: Com o schema SQL aplicado

### 2. Frontend
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```
Acesse em: `http://localhost:5173`

### 3. Backend
```bash
cd backend
cp .env.example .env
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Swagger UI disponível em: `http://localhost:8000/docs`

---

## 🗄️ Banco de Dados

O script DDL com todas as tabelas, índices e relacionamentos está localizado em:
`backend/app/db/migrations/001_initial_schema.sql`

Pode ser executado diretamente no **SQL Editor** do seu painel Supabase.

---

## 📚 Documentação Adicional

- [Documentação do Banco de Dados](docs/DATABASE.md)
- [Contratos da API REST](docs/API.md)
- [Pipeline de Deploy (Vercel + Render + Supabase)](docs/DEPLOYMENT.md)
- [Guia de Configuração Local](docs/DEV_SETUP.md)
