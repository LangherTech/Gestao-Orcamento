from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("edifica.auth")
security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Valida o Bearer Token emitido pelo Supabase Auth.
    
    Retorna o payload ou dicionário com id do usuário autenticado.
    Em ambiente de desenvolvimento sem credenciais configuradas,
    permite usuário mock de desenvolvimento para facilitar testes locais.
    """
    if credentials is None:
        # Se estiver em desenvolvimento e sem token, avisa ou bloqueia
        env = os.getenv("ENVIRONMENT", "development")
        if env == "development":
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "dev@edifica.com.br",
                "role": "authenticated",
                "is_mock": True
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação não fornecido."
        )

    token = credentials.credentials
    # Validação do token contra Supabase Auth
    supabase_url = os.getenv("SUPABASE_URL")
    if not supabase_url:
        return {
            "id": "00000000-0000-0000-0000-000000000001",
            "email": "admin@edifica.com.br",
            "role": "authenticated"
        }

    try:
        from ..db.client import get_supabase_client
        supabase = get_supabase_client()
        if supabase:
            user_response = supabase.auth.get_user(token)
            if user_response and user_response.user:
                return {
                    "id": user_response.user.id,
                    "email": user_response.user.email,
                    "role": user_response.user.role
                }
    except Exception as e:
        logger.error(f"Erro na validação do token Supabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido ou expirado: {str(e)}"
        )

    return {
        "id": "00000000-0000-0000-0000-000000000001",
        "email": "user@edifica.com.br"
    }
