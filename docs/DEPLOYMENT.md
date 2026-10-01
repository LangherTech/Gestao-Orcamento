# Pipeline de Deploy (Vercel + Render + Supabase)

Este documento descreve como o sistema **Edifica** é implantado em ambientes de produção.

---

## 1. Frontend (React 18 + Vite) na Vercel

### Fluxo Automático
1. `git push origin main`
2. A integração da Vercel detecta alterações no subdiretório `frontend/`
3. Executa: `npm install && npm run build`
4. Deploy automático na CDN Global (ex: `https://edifica.vercel.app`)

### Variáveis de Ambiente na Vercel
- `VITE_SUPABASE_URL`: URL do projeto Supabase (`https://<project-id>.supabase.co`)
- `VITE_SUPABASE_KEY`: Chave pública anon (`eyJhb...`)
- `VITE_API_URL`: URL base da API no Render (`https://edifica-api.onrender.com`)
- `VITE_APP_NAME`: `Edifica Soluções em Obras`

---

## 2. Backend (FastAPI) no Render.com (ou Railway)

### Configuração
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Procfile**: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **runtime.txt**: `python-3.10.13`

### Variáveis de Ambiente no Render
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_KEY`: Service Role Key (Chave secreta de backend)
- `SUPABASE_JWT_SECRET`: Secret para validação criptográfica do token JWT
- `FRONTEND_URL`: URL autorizada no CORS (ex: `https://edifica.vercel.app`)
- `ENVIRONMENT`: `production`

---

## 3. Banco de Dados e Auth no Supabase

- **Auth Provider**: Habilitado provedor nativo Email/Senha.
- **SQL Migrations**:
  - Aplicar o script `backend/app/db/migrations/001_initial_schema.sql` no SQL Editor do Supabase.
- **Armazenamento de Mídia (Bucket)**:
  - Criar o bucket `rdo-fotos` com acesso de leitura público para exibição das fotos de diário de obra.
