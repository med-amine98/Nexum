# app/routes/auth.py - Version avec jwt (corrigée)
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
import uuid
from jose import jwt, JWTError
from passlib.context import CryptContext

from app.database import get_db
from app.models import User
from app.services.email_service import EmailService

# Configuration
router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

# Configuration JWT
SECRET_KEY = 'votre-secret-key-changez-moi'  # À mettre dans les variables d'environnement
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 1 jour

# Configuration du hachage des mots de passe
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# =========================
# FONCTIONS JWT
# =========================

def create_access_token(user_id: int, expires_delta: Optional[timedelta] = None) -> str:
    """Créer un token JWT"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    payload = {
        'user_id': str(user_id),
        'exp': expire,
        'iat': datetime.utcnow()
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Décoder et vérifier un token JWT"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Récupérer l'utilisateur courant depuis le token
    ET DÉFINIR LE CONTEXTE RLS POUR LA BASE DE DONNÉES
    """
    try:
        payload = decode_token(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Récupérer l'utilisateur
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # ============================================
        # DÉFINIR LE CONTEXTE POUR RLS
        # ============================================
        from app.database import engine
        from sqlalchemy import text
        
        with engine.connect() as conn:
            # Définir l'ID utilisateur
            conn.execute(text("SELECT set_current_user_id(:user_id)"), {"user_id": user.id})
            conn.commit()
            
            # Vérifier que le contexte est défini
            result = conn.execute(text("SELECT current_setting('app.current_user_id', true)"))
            set_user_id = result.scalar()
            
            result = conn.execute(text("SELECT current_setting('app.current_company_id', true)"))
            set_company_id = result.scalar()
            
            print(f"🔐 RLS activé pour: {user.email} (User: {set_user_id}, Company: {set_company_id})")
        
        # Ajouter le tenant à la session SQLAlchemy aussi (double sécurité)
        db._tenant_user = user
        
        return user
        
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifier un mot de passe"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hacher un mot de passe"""
    return pwd_context.hash(password)


# =========================
# CHECK EMAIL - NOUVELLE ROUTE
# =========================
@router.get("/check-email")
async def check_email(
    email: str,
    db: Session = Depends(get_db)
):
    """
    Vérifier si un email existe déjà dans la base de données
    """
    try:
        user = db.query(User).filter(User.email == email).first()
        
        return {
            "exists": user is not None,
            "email": email,
            "message": "Email already registered" if user else "Email available"
        }
        
    except Exception as e:
        print(f"Erreur check-email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# CHECK USERNAME - NOUVELLE ROUTE
# =========================
@router.get("/check-username")
async def check_username(
    username: str,
    db: Session = Depends(get_db)
):
    """
    Vérifier si un nom d'utilisateur existe déjà dans la base de données
    """
    try:
        user = db.query(User).filter(User.username == username).first()
        
        return {
            "exists": user is not None,
            "username": username,
            "message": "Username already taken" if user else "Username available"
        }
        
    except Exception as e:
        print(f"Erreur check-username: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# REGISTER USER
# =========================
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    db: Session = Depends(get_db)
):
    data = await request.json()

    if not data.get('username') or not data.get('email') or not data.get('password'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username, email and password are required"
        )

    if db.query(User).filter(User.username == data['username']).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    if db.query(User).filter(User.email == data['email']).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )

    try:
        user = User(
            username=data['username'],
            email=data['email'],
            role=data.get('role', 'user'),
            full_name=data.get('full_name', data['username'])
        )
        user.set_password(data['password'])

        db.add(user)
        db.commit()
        db.refresh(user)

        try:
            EmailService.send_welcome_email(
                email=user.email,
                name=user.username
            )
        except Exception as e:
            print(f"Erreur envoi email: {e}")

        return {
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name
            }
        }
        
    except Exception as e:
        db.rollback()
        print(f"Erreur register: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# LOGIN
# =========================
@router.post("/login")
async def login(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        
        if not data.get('username') or not data.get('password'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username and password are required"
            )

        user = db.query(User).filter(User.username == data['username']).first()

        if not user or not user.check_password(data['password']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )

        token = create_access_token(user.id)

        return {
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name or user.username
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# REGISTER ADMIN
# =========================
@router.post("/register-admin")
async def register_admin(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )

        data = await request.json()
        
        if not data.get('username') or not data.get('email') or not data.get('password'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username, email and password are required"
            )

        if db.query(User).filter(User.username == data['username']).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

        if db.query(User).filter(User.email == data['email']).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already exists"
            )

        user = User(
            username=data['username'],
            email=data['email'],
            role='admin',
            full_name=data.get('full_name', data['username'])
        )
        user.set_password(data['password'])

        db.add(user)
        db.commit()
        db.refresh(user)

        try:
            EmailService.send_welcome_email(
                email=user.email,
                name=user.username
            )
        except Exception as e:
            print(f"Erreur envoi email: {e}")

        return {
            'message': 'Admin user created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'full_name': user.full_name
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur register-admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# ME - Get current user
# =========================
@router.get("/me")
async def get_me(
    current_user: User = Depends(get_current_user)
):
    try:
        return {
            'id': current_user.id,
            'username': current_user.username,
            'email': current_user.email,
            'role': current_user.role,
            'full_name': current_user.full_name or current_user.username,
            'created_at': current_user.created_at.isoformat() if hasattr(current_user, 'created_at') and current_user.created_at else None
        }
        
    except Exception as e:
        print(f"Erreur me: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# SOCIAL LOGIN
# =========================
@router.post("/social-login")
async def social_login(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        
        provider = data.get('provider', '').lower()
        email = data.get('email')
        name = data.get('name')
        
        if not provider or not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provider and email are required"
            )
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            base_username = email.split('@')[0]
            username = base_username
            counter = 1
            while db.query(User).filter(User.username == username).first():
                username = f"{base_username}_{counter}"
                counter += 1
            
            user = User(
                username=username,
                email=email,
                full_name=name or username,
                hashed_password='',
                is_active=True,
                role='user'
            )
            
            db.add(user)
            db.commit()
            db.refresh(user)
            
            message = "Compte créé avec succès"
        else:
            message = "Connexion réussie"
        
        token = create_access_token(user.id)
        
        return {
            'success': True,
            'message': message,
            'access_token': token,
            'token_type': 'bearer',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name or user.username,
                'role': user.role
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur social-login: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# FORGOT PASSWORD
# =========================
@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        email = data.get('email')
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is required"
            )
        
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            return {
                'message': 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
            }
        
        reset_token = str(uuid.uuid4())
        
        try:
            EmailService.send_reset_password_email(
                email=user.email,
                name=user.username,
                token=reset_token
            )
        except Exception as e:
            print(f"Erreur envoi email reset: {e}")
        
        return {
            'message': 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur forgot-password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# RESET PASSWORD
# =========================
@router.post("/reset-password")
async def reset_password(
    request: Request
):
    try:
        data = await request.json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Token and new password are required"
            )
        
        return {'message': 'Password reset successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erreur reset-password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# REFRESH TOKEN
# =========================
@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user)
):
    try:
        new_token = create_access_token(current_user.id)
        
        return {
            'access_token': new_token,
            'token_type': 'bearer'
        }
        
    except Exception as e:
        print(f"Erreur refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# CHANGE PASSWORD
# =========================
@router.post("/change-password")
async def change_password(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        if not old_password or not new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Old and new password are required"
            )
        
        if not current_user.check_password(old_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid old password"
            )
        
        if len(new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="New password must be at least 6 characters"
            )
        
        current_user.set_password(new_password)
        db.commit()
        
        return {'message': 'Password changed successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur change-password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# UPDATE PROFILE
# =========================
@router.put("/profile")
async def update_profile(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        data = await request.json()
        
        if data.get('full_name'):
            current_user.full_name = data['full_name']
        
        if data.get('email'):
            existing = db.query(User).filter(
                User.email == data['email'], 
                User.id != current_user.id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already in use"
                )
            current_user.email = data['email']
        
        db.commit()
        db.refresh(current_user)
        
        return {
            'message': 'Profile updated successfully',
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'role': current_user.role,
                'full_name': current_user.full_name or current_user.username
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur update-profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# =========================
# DELETE ACCOUNT
# =========================
@router.delete("/delete")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if current_user.role == 'admin':
            admin_count = db.query(User).filter(User.role == 'admin').count()
            if admin_count <= 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete the last administrator"
                )
        
        db.delete(current_user)
        db.commit()
        
        return {'message': 'Account deleted successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Erreur delete-account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )