import os
import ssl
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("edifica.db")

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

DB_USER = os.getenv("DB_USER", "postgres.iaanhxhsdvcxvqlocmgs")
DB_HOST = os.getenv("DB_HOST", "aws-0-us-east-2.pooler.supabase.com")
DB_PORT = int(os.getenv("DB_PORT", "6543"))
DB_NAME = os.getenv("DB_NAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

_supabase_client = None

def get_supabase_client():
    """Retorna a instância do cliente Supabase."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("SUPABASE_URL ou SUPABASE_KEY não configuradas.")
        return None

    try:
        from supabase import create_client
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return _supabase_client
    except Exception as e:
        logger.error(f"Erro ao inicializar cliente Supabase: {e}")
        return None

def get_db_connection():
    """Retorna uma conexão direta ao PostgreSQL do Supabase via pooler pg8000."""
    if not DB_PASSWORD:
        return None

    try:
        import pg8000.native
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        conn = pg8000.native.Connection(
            user=DB_USER,
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            password=DB_PASSWORD,
            ssl_context=ssl_context,
            timeout=10
        )
        return conn
    except Exception as e:
        logger.error(f"Erro ao conectar diretamente ao PostgreSQL: {e}")
        return None
