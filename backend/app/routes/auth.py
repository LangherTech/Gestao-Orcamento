from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from ..middleware.auth import get_current_user
from ..db.client import get_supabase_client

router = APIRouter(prefix="/auth", tags=["Autenticação"])

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Autentica o usuário via Supabase Auth ou emite mock para desenvolvimento."""
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.auth.sign_in_with_password({
                "email": credentials.email,
                "password": credentials.password
            })
            if res.session:
                return TokenResponse(
                    access_token=res.session.access_token,
                    user={"id": res.user.id, "email": res.user.email}
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Falha na autenticação: {str(e)}"
            )

    # Fallback para desenvolvimento local
    return TokenResponse(
        access_token="mock_dev_jwt_token_edifica",
        user={"id": "00000000-0000-0000-0000-000000000001", "email": credentials.email}
    )

@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Retorna o perfil do usuário logado."""
    return user

@router.post("/logout")
async def logout(user: dict = Depends(get_current_user)):
    """Encerra a sessão ativa."""
    return {"message": "Sessão encerrada com sucesso"}
