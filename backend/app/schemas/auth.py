from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: Optional[str] = None

class UserResponse(UserBase):
    """Schéma de réponse utilisateur - DOIT être défini avant AuthResponse"""
    id: int
    is_active: bool
    is_superuser: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserCreate(UserBase):
    """Schéma pour la création d'utilisateur"""
    password: str = Field(..., min_length=6)

class UserRegister(UserBase):
    """Schéma pour l'inscription"""
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None

class UserLogin(BaseModel):
    """Schéma pour la connexion"""
    username: str
    password: str

class AuthResponse(BaseModel):
    """Schéma pour la réponse d'authentification"""
    access_token: str
    token_type: str
    user: Optional[UserResponse] = None

class Token(BaseModel):
    """Schéma pour le token JWT"""
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """Données du token"""
    user_id: Optional[int] = None

class PasswordChange(BaseModel):
    """Schéma pour le changement de mot de passe"""
    old_password: str
    new_password: str = Field(..., min_length=6)
    confirm_new_password: str

class UserUpdate(BaseModel):
    """Schéma pour la mise à jour utilisateur"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
