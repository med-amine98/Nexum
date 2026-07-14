# app/core/dependencies.py
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.models.auth import User, UserStatus
import logging

logger = logging.getLogger(__name__)

# ============================================
# FONCTIONS DE BASE
# ============================================

async def get_user_from_token(
    authorization: Optional[str],
    db: Session
) -> Optional[User]:
    """Interne: décode le token et récupère l'utilisateur sans lever d'exception"""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if payload:
            user_id = payload.get("sub")
            if user_id:
                return db.query(User).filter(User.id == int(user_id)).first()
    except Exception as e:
        logger.error(f"Erreur décodage token: {e}")
    
    return None


async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur actuel. Lève une exception 401 si non authentifié.
    C'est maintenant le comportement par défaut pour sécuriser l'API.
    """
    user = await get_user_from_token(authorization, db)
    
    if not user:
        logger.error(f"❌ Authentification échouée - Header: {authorization[:20] if authorization else 'None'}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


async def get_current_active_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur actuel et vérifie qu'il est actif.
    """
    user = await get_current_user(authorization, db)
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Account is {user.status.value}"
        )
    
    return user


async def get_optional_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Retourne l'utilisateur si authentifié, sinon None. À utiliser pour les routes publiques/mixtes."""
    return await get_user_from_token(authorization, db)


async def get_current_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur actuel et vérifie qu'il est administrateur
    """
    user = await get_current_active_user(authorization, db)
    
    # Vérifier si l'utilisateur est admin ou super admin
    is_admin = user.is_superuser or (hasattr(user, 'role') and user.role.value in ["admin", "super_admin"])
    
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    
    return user


async def get_current_super_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Récupère l'utilisateur actuel et vérifie qu'il est super administrateur
    """
    user = await get_current_active_user(authorization, db)
    
    if not user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Super admin access required."
        )
    
    return user


# ============================================
# ALIAS POUR COMPATIBILITÉ AVEC VOTRE CODE
# ============================================

async def get_current_superuser(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Alias pour get_current_admin - Vérifie que l'utilisateur a des droits administrateur
    Utilisé par les endpoints admin
    """
    return await get_current_admin(authorization, db)


async def get_superuser(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Alias pour get_current_super_admin - Vérifie que l'utilisateur est super admin
    """
    return await get_current_super_admin(authorization, db)


# ============================================
# NOUVELLES FONCTIONS POUR LES ENDPOINTS ADMIN
# ============================================

async def require_admin(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Vérifie que l'utilisateur a des droits administrateur
    À utiliser pour les endpoints admin
    """
    user = await get_current_active_user(authorization, db)
    
    # Vérifier si l'utilisateur est admin
    is_admin = False
    
    # Vérifier par flag is_superuser
    if hasattr(user, 'is_superuser') and user.is_superuser:
        is_admin = True
    
    # Vérifier par rôle
    if hasattr(user, 'role'):
        role_value = user.role.value if hasattr(user.role, 'value') else str(user.role)
        if role_value in ["admin", "super_admin", "administrator"]:
            is_admin = True
    
    if not is_admin:
        logger.warning(f"❌ Accès refusé - Utilisateur {user.email} n'a pas les droits admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    
    return user


async def require_superuser(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
) -> User:
    """
    Vérifie que l'utilisateur est super admin
    À utiliser pour les endpoints sensibles
    """
    user = await get_current_active_user(authorization, db)
    
    if not user.is_superuser:
        logger.warning(f"❌ Accès refusé - Utilisateur {user.email} n'est pas super admin")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Super admin access required."
        )
    
    return user


# ============================================
# FONCTIONS POUR LE DÉVELOPPEMENT (SANS AUTH)
# ============================================

async def get_current_user_dev(
    db: Session = Depends(get_db)
) -> User:
    """
    VERSION DÉVELOPPEMENT UNIQUEMENT - Retourne le premier admin sans authentification
    À utiliser uniquement en développement
    """
    # Récupérer le premier administrateur
    admin = db.query(User).filter(
        (User.role == "admin") | (User.is_superuser == True)
    ).first()
    
    if not admin:
        admin = db.query(User).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No user found"
        )
    
    return admin


async def get_current_superuser_dev(
    db: Session = Depends(get_db)
) -> User:
    """
    VERSION DÉVELOPPEMENT UNIQUEMENT - Retourne le premier super admin sans authentification
    """
    super_admin = db.query(User).filter(User.is_superuser == True).first()
    
    if not super_admin:
        super_admin = db.query(User).first()
    
    if not super_admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No user found"
        )
    
    return super_admin


# ============================================
# EXPORTS PAR DÉFAUT
# ============================================

# Pour une utilisation en développement (sans token)
# get_current_user = get_current_user_dev
# get_current_superuser = get_current_superuser_dev

# Pour une utilisation en production (avec token)
# get_current_user = get_current_user
# get_current_superuser = require_admin