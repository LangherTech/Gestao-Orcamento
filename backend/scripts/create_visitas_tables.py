import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def create_tables():
    if not url or not key:
        print("Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.")
        return

    supabase: Client = create_client(url, key)

    sql = """
    CREATE TABLE IF NOT EXISTS visitas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        endereco TEXT,
        contato VARCHAR(100),
        classificacao VARCHAR(50) DEFAULT 'Normal',
        observacao TEXT,
        data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
        visitado_por UUID REFERENCES auth.users(id),
        cadastrado_por UUID REFERENCES auth.users(id),
        data_retorno DATE,
        coordenadas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    """
    
    # Supabase Python client doesn't expose raw SQL execution natively for DDL 
    # except via RPC or the postgres rest interface. If RPC is not available,
    # we usually have to run this manually in SQL editor. We'll try RPC or provide instructions.
    try:
        # Tenta executar uma função RPC genérica se existir
        response = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print("Tabelas de visitas verificadas/criadas.")
    except Exception as e:
        print(f"Não foi possível criar tabelas via script. Por favor, execute o SQL manualmente no Supabase SQL Editor:\n{sql}\nErro: {str(e)}")

if __name__ == "__main__":
    create_tables()
