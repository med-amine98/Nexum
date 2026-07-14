from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from typing import Optional

from app.models.auth import User
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse

class AuthService:
    @staticmethod
    def register(db: Session, user_data: UserRegister) -> UserResponse:
        """Inscription d'un nouvel utilisateur"""
        # Vérifier si l'utilisateur existe déjà
        existing_user = db.query(User).filter(
            (User.username == user_data.username) | (User.email == user_data.email)
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        # Créer le nouvel utilisateur
        hashed_password = get_password_hash(user_data.password)
        db_user = User(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_active=True
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return UserResponse.model_validate(db_user)
    
    @staticmethod
    def login(db: Session, login_data: UserLogin) -> Token:
        """Connexion utilisateur"""
        user = db.query(User).filter(
            (User.username == login_data.username) | (User.email == login_data.username)
        ).first()
        
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        # Créer le token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return Token(access_token=access_token, token_type="bearer")
    
    @staticmethod
    def get_current_user(db: Session, user_id: int) -> Optional[User]:
        """Récupère l'utilisateur courant"""
        return db.query(User).filter(User.id == user_id).first()
