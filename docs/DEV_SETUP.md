# Guia de Configuração Local (Setup de Desenvolvimento)

Siga os passos abaixo para configurar o ambiente de desenvolvimento local.

---

## 1. Clonagem e Navegação
```bash
cd /Users/guilhermelangher/Desktop/GestaoDeObra
```

## 2. Configurando o Banco de Dados (Supabase)
1. Acesse seu projeto em [app.supabase.com](https://app.supabase.com).
2. Vá até o **SQL Editor**.
3. Abra e execute todo o conteúdo de `backend/app/db/migrations/001_initial_schema.sql`.
4. Em **Project Settings > API**, copie:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

---

## 3. Configurando o Backend (Python / FastAPI)
```bash
cd backend

# Crie seu arquivo de ambiente
cp .env.example .env
# Edite o .env com as chaves copiadas do Supabase

# Crie e ative o ambiente virtual
python3 -m venv venv
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt

# Inicie o servidor com hot-reload
uvicorn app.main:app --reload --port 8000
```
API disponível em: `http://localhost:8000`  
Documentação interativa Swagger: `http://localhost:8000/docs`

---

## 4. Configurando o Frontend (React / Vite)
```bash
cd frontend

# Crie seu arquivo de ambiente
cp .env.example .env.local
# Edite o .env.local com a URL e anon key do Supabase

# Instale os pacotes npm
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```
Interface disponível em: `http://localhost:5173`
