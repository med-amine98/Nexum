# app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, Header, status, Request, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, Any, Dict
import traceback
from pydantic import BaseModel, EmailStr, Field

import logging
logger = logging.getLogger(__name__)

from app.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token, decode_access_token
from app.core.dependencies import get_current_active_user, get_current_user
from app.models.auth import User, UserRole, UserStatus
from app.models.company import Company, CompanySector, CompanySize
from app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


# ===== SCHEMAS PYDANTIC =====

class UserCreate(BaseModel):
    """Modèle pour la création d'un utilisateur"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    company_id: Optional[int] = 1
    is_superuser: bool = False
    role: str = "user"


class UserLogin(BaseModel):
    """Modèle pour la connexion"""
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    company_name: Optional[str] = None
    company_size: Optional[str] = None
    registration_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    siret: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool
    is_superuser: bool
    role: str
    status: str
    created_at: datetime
    sector: Optional[str] = None
    subscription_tier: Optional[str] = None
    subscription_expires: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    success: bool = True
    token: Dict[str, Any]
    message: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordSubmit(BaseModel):
    token: str
    password: str


class AdminCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = "Administrator"
    company_name: Optional[str] = None


# ===== ENDPOINTS PUBLICS =====

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Connexion et obtention du token JWT - ROUTE PUBLIQUE"""
    try:
        logger.info(f"🔐 Tentative de connexion: {form_data.username}")
        
        user = db.query(User).filter(User.email == form_data.username).first()
        
        if not user:
            user = db.query(User).filter(User.username == form_data.username).first()
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if user.status != UserStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Account is {user.status.value}"
            )
        
        user.last_login = datetime.utcnow()
        db.commit()
        
        access_token = create_access_token(data={"sub": str(user.id)})
        
        logger.info(f"✅ Connexion réussie: {user.email}")
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur connexion: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la connexion: {str(e)}"
        )


@router.post("/register", response_model=AuthResponse)
async def register(
    request: Request,
    db: Session = Depends(get_db)
):
    """Inscription d'un nouvel utilisateur - ROUTE PUBLIQUE"""
    try:
        data = await request.json()
        logger.info(f"📦 Données reçues: {data}")
        
        full_name = data.get('full_name') or data.get('fullname') or data.get('name')
        email = data.get('email')
        password = data.get('password')
        phone = data.get('phone')
        
        company_name = data.get('company_name') or data.get('companyName')
        company_size = data.get('company_size') or data.get('companySize')
        registration_number = data.get('registration_number') or data.get('registrationNumber')
        address = data.get('address')
        city = data.get('city')
        country = data.get('country') or 'France'
        siret = data.get('siret')
        
        if not email:
            raise HTTPException(status_code=400, detail="Email is required")
        if not password:
            raise HTTPException(status_code=400, detail="Password is required")
        if len(password) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        username = full_name if full_name else email.split('@')[0]
        username = username.lower().replace(' ', '.').replace("'", "").replace("-", ".")
        
        existing_username = db.query(User).filter(User.username == username).first()
        if existing_username:
            username = f"{username}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
        company_name_final = company_name if company_name else f"Entreprise de {full_name}"
        
        # Déterminer le secteur
        sector_enum = CompanySector.ENTERPRISE
        frontend_sector = data.get('sector') or data.get('companySector')
        if frontend_sector:
            if frontend_sector.lower() in ['bank', 'banking', 'banque']:
                sector_enum = CompanySector.BANK
            elif frontend_sector.lower() in ['insurance', 'assurance']:
                sector_enum = CompanySector.INSURANCE
            elif frontend_sector.lower() in ['enterprise', 'entreprise']:
                sector_enum = CompanySector.ENTERPRISE
            else:
                try:
                    sector_enum = CompanySector(frontend_sector)
                except ValueError:
                    pass

        # Créer ou récupérer l'entreprise
        company = db.query(Company).filter(Company.name == company_name_final).first()
        if not company:
            trial_expires = datetime.utcnow() + timedelta(days=7)
            company = Company(
                name=company_name_final,
                sector=sector_enum,
                size=CompanySize.MICRO,
                address=address,
                city=city,
                country=country,
                siret=siret,
                phone=phone,
                subscription_tier="trial",
                subscription_expires=trial_expires
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        else:
            if company.sector != sector_enum:
                company.sector = sector_enum
                db.add(company)
                db.commit()
                db.refresh(company)
        
        # Créer l'utilisateur
        hashed_password = get_password_hash(password)
        db_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            company_name=company_name,
            company_size=company_size,
            registration_number=registration_number,
            address=address,
            city=city,
            country=country,
            siret=siret,
            phone=phone,
            company_id=company.id,
            is_active=True,
            is_superuser=False,
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        logger.info(f"✅ Utilisateur créé: {db_user.email} (ID: {db_user.id})")
        
        access_token = create_access_token(data={"sub": str(db_user.id)})
        
        user_response = {
            "id": db_user.id,
            "username": db_user.username,
            "email": db_user.email,
            "full_name": db_user.full_name,
            "company_name": db_user.company_name,
            "company_size": db_user.company_size,
            "registration_number": db_user.registration_number,
            "address": db_user.address,
            "city": db_user.city,
            "country": db_user.country,
            "siret": db_user.siret,
            "phone": db_user.phone,
            "is_active": db_user.is_active,
            "is_superuser": db_user.is_superuser,
            "role": db_user.role.value,
            "status": db_user.status.value,
            "created_at": db_user.created_at,
            "sector": company.sector.value if company else "enterprise",
            "subscription_tier": company.subscription_tier,
            "subscription_expires": company.subscription_expires
        }
        
        return {
            "success": True,
            "token": {
                "access_token": access_token,
                "refresh_token": None,
                "token_type": "bearer",
                "user": user_response
            },
            "message": "Compte créé avec succès"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur inscription: {e}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inscription: {str(e)}"
        )


# ===== ENDPOINTS D'ADMIN PUBLICS (SANS AUTHENTIFICATION) =====

@router.post("/setup-admin")
async def setup_first_admin(
    db: Session = Depends(get_db)
):
    """Créer le premier administrateur - ENDPOINT PUBLIC (à utiliser une seule fois)"""
    # Vérifier si un admin existe déjà
    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        return {
            "success": True,
            "message": "Admin already exists",
            "exists": True,
            "credentials": {
                "username": existing_admin.username,
                "email": existing_admin.email
            }
        }
    
    # Créer l'admin par défaut
    hashed_password = get_password_hash("admin123")
    
    # Créer une entreprise
    company = Company(
        name="Nexum Admin",
        sector=CompanySector.ENTERPRISE,
        size=CompanySize.SMALL,
        subscription_tier="premium",
        subscription_expires=datetime.utcnow() + timedelta(days=365)
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    
    admin_user = User(
        username="admin",
        email="admin@nexum.com",
        hashed_password=hashed_password,
        full_name="Super Admin",
        company_id=company.id,
        is_active=True,
        is_superuser=True,
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Générer un token
    access_token = create_access_token(data={"sub": str(admin_user.id)})
    
    return {
        "success": True,
        "message": "Admin created successfully",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": admin_user.id,
            "username": admin_user.username,
            "email": admin_user.email,
            "full_name": admin_user.full_name,
            "role": admin_user.role.value,
            "is_superuser": admin_user.is_superuser
        },
        "credentials": {
            "username": "admin",
            "email": "admin@nexum.com",
            "password": "admin123"
        }
    }


@router.post("/create-admin")
async def create_admin(
    request: AdminCreateRequest,
    db: Session = Depends(get_db)
):
    """Créer un administrateur personnalisé - ENDPOINT PUBLIC"""
    try:
        # Vérifier si l'utilisateur existe
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Vérifier si le username existe
        username = request.email.split('@')[0].lower().replace('.', '')
        if db.query(User).filter(User.username == username).first():
            username = f"{username}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Créer une entreprise
        company_name = request.company_name or f"Entreprise de {request.full_name}"
        company = Company(
            name=company_name,
            sector=CompanySector.ENTERPRISE,
            size=CompanySize.SMALL,
            subscription_tier="premium",
            subscription_expires=datetime.utcnow() + timedelta(days=365)
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Créer l'utilisateur admin
        hashed_password = get_password_hash(request.password)
        
        admin_user = User(
            username=username,
            email=request.email,
            hashed_password=hashed_password,
            full_name=request.full_name,
            company_id=company.id,
            is_active=True,
            is_superuser=True,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Générer un token
        access_token = create_access_token(data={"sub": str(admin_user.id)})
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_user.id,
                "username": admin_user.username,
                "email": admin_user.email,
                "full_name": admin_user.full_name,
                "role": admin_user.role.value,
                "is_superuser": admin_user.is_superuser
            },
            "message": "Admin created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur création admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/register-admin")
async def register_admin_public(
    email: str,
    password: str,
    full_name: str = "Administrator",
    db: Session = Depends(get_db)
):
    """Création d'un administrateur - ENDPOINT PUBLIC simplifié"""
    try:
        # Vérifier si l'utilisateur existe
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        
        # Créer une entreprise
        company = Company(
            name=f"Entreprise de {full_name}",
            sector=CompanySector.ENTERPRISE,
            size=CompanySize.SMALL,
            subscription_tier="premium",
            subscription_expires=datetime.utcnow() + timedelta(days=365)
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        # Créer l'utilisateur admin
        hashed_password = get_password_hash(password)
        username = email.split('@')[0].lower().replace('.', '')
        
        if db.query(User).filter(User.username == username).first():
            username = f"{username}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        admin_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            company_id=company.id,
            is_active=True,
            is_superuser=True,
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Générer un token
        access_token = create_access_token(data={"sub": str(admin_user.id)})
        
        return {
            "success": True,
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": admin_user.id,
                "username": admin_user.username,
                "email": admin_user.email,
                "full_name": admin_user.full_name,
                "role": admin_user.role.value,
                "is_superuser": admin_user.is_superuser
            },
            "message": "Admin created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur création admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== ENDPOINTS PROTÉGÉS (nécessitent authentification) =====

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Récupère les informations de l'utilisateur connecté - ROUTE PROTÉGÉE"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "company_name": current_user.company_name,
        "company_size": current_user.company_size,
        "registration_number": current_user.registration_number,
        "address": current_user.address,
        "city": current_user.city,
        "country": current_user.country,
        "siret": current_user.siret,
        "phone": current_user.phone,
        "is_active": current_user.is_active,
        "is_superuser": current_user.is_superuser,
        "role": current_user.role.value,
        "status": current_user.status.value,
        "created_at": current_user.created_at,
        "sector": current_user.company.sector.value if current_user.company else "enterprise",
        "subscription_tier": current_user.company.subscription_tier if current_user.company else "free",
        "subscription_expires": current_user.company.subscription_expires if current_user.company else None
    }


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Déconnexion - ROUTE PROTÉGÉE"""
    try:
        authorization = request.headers.get("Authorization", "")
        current_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else None
        if current_token:
            from app.models.auth import UserSession
            db.query(UserSession).filter(UserSession.token == current_token).delete()
            db.commit()
            logger.info(f"🔌 Session révoquée pour: {current_user.email}")
    except Exception as logout_err:
        logger.error(f"⚠️ Erreur lors de la révocation: {logout_err}")
        
    return {"message": "Successfully logged out"}


@router.get("/verify-token")
async def verify_token(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db)
):
    """Vérifie si un token est valide - ROUTE PROTÉGÉE"""
    user = await get_current_user(authorization, db)
    if user:
        return {
            "valid": True,
            "user_id": user.id,
            "email": user.email,
            "username": user.username
        }
    return {"valid": False, "message": "Token invalide"}


@router.get("/test")
async def test_auth():
    return {"message": "Auth module is working"}


# ===== MOT DE PASSE OUBLIÉ =====

def send_reset_email(email_to: str, reset_link: str):
    """Envoie un email de réinitialisation"""
    if not settings.SMTP_PASSWORD:
        logger.warning(f"⚠️ SMTP non configuré. Lien généré: {reset_link}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = f"{settings.PROJECT_NAME} <{settings.SMTP_FROM}>"
        msg['To'] = email_to
        msg['Subject'] = "Réinitialisation de votre mot de passe Nexum"

        body = f"""
Bonjour,

Vous avez demandé la réinitialisation de votre mot de passe.
Veuillez cliquer sur le lien ci-dessous :

{reset_link}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

L'équipe Nexum.
"""
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT)
        if settings.SMTP_STARTTLS:
            server.starttls()
        
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        logger.info(f"✅ Email envoyé à {email_to}")
    except Exception as e:
        logger.error(f"❌ Erreur envoi email: {e}")


@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Envoi d'un email de réinitialisation - ROUTE PUBLIQUE"""
    user = db.query(User).filter(User.email == request.email).first()
    
    if user:
        reset_token = create_access_token(
            data={"sub": str(user.id), "type": "reset_password"}, 
            expires_delta=timedelta(minutes=15)
        )
        reset_link = f"http://localhost:3000/reset-password?token={reset_token}"
        background_tasks.add_task(send_reset_email, user.email, reset_link)
    
    return {"success": True, "message": "Si l'adresse existe, un email a été envoyé."}


@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordSubmit,
    db: Session = Depends(get_db)
):
    """Réinitialisation du mot de passe - ROUTE PUBLIQUE"""
    payload = decode_access_token(request.token)
    if not payload or payload.get("type") != "reset_password":
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=400, detail="Token invalide")
        
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    user.hashed_password = get_password_hash(request.password)
    db.commit()
    
    return {"success": True, "message": "Mot de passe modifié avec succès"}


# ===== SSO =====

@router.post("/sso/{provider}")
async def sso_login(
    provider: str, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """Connexion via SSO - ROUTE PUBLIQUE"""
    if provider not in ["google", "microsoft", "okta"]:
        raise HTTPException(status_code=400, detail="Fournisseur SSO non supporté")
    
    data = await request.json()
    email = data.get("email")
    name = data.get("name", email.split('@')[0] if email else "Utilisateur")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        company = Company(
            name=f"Entreprise de {name}",
            sector=CompanySector.ENTERPRISE,
            size=CompanySize.MICRO,
            subscription_tier="enterprise",
            subscription_expires=datetime.utcnow() + timedelta(days=365)
        )
        db.add(company)
        db.commit()
        db.refresh(company)
        
        user = User(
            username=email.split('@')[0].lower().replace('.', ''),
            email=email,
            full_name=name,
            hashed_password=get_password_hash(f"SSO_LOCKED_{datetime.now().timestamp()}"),
            company_id=company.id,
            is_active=True,
            role=UserRole.USER,
            status=UserStatus.ACTIVE
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    user.last_login = datetime.utcnow()
    db.commit()
    
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "provider": provider
    }