from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
import os
import uuid
from PIL import Image
import io
import logging
logger = logging.getLogger(__name__)
from app.schemas.profile import (
    UserProfileResponse, UserProfileUpdate, PasswordChange,
    ActivityLogResponse, SessionResponse, NotificationSettings,
    SecuritySettings, UserStats
)
from app.services.profile import ProfileService
from app.core.database import get_db  # À créer si nécessaire
from app.core.security import verify_password
from app.core.dependencies import get_current_user
from app.models.auth import User, UserSession, AuditLog
from app.models.project import Project

router = APIRouter()

# ==================== ROUTES PROFIL ====================

@router.get("/", response_model=UserProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer le profil de l'utilisateur connecté"""
    service = ProfileService(db)
    user = service.get_user_by_id(current_user.id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    return UserProfileResponse(
        id=user.id,
        firstName=user.first_name,
        lastName=user.last_name,
        email=user.email,
        phone=user.phone,
        address=user.address,
        company=user.company,
        position=user.position,
        bio=user.bio,
        website=user.website,
        github=user.github,
        linkedin=user.linkedin,
        twitter=user.twitter,
        avatar=user.avatar,
        createdAt=user.created_at,
        updatedAt=user.updated_at,
        twoFactorEnabled=user.two_factor_enabled,
        emailVerified=user.email_verified
    )

@router.put("/", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour le profil"""
    service = ProfileService(db)
    
    try:
        user = service.update_profile(current_user.id, profile_data)
        
        return UserProfileResponse(
            id=user.id,
            firstName=user.first_name,
            lastName=user.last_name,
            email=user.email,
            phone=user.phone,
            address=user.address,
            company=user.company,
            position=user.position,
            bio=user.bio,
            website=user.website,
            github=user.github,
            linkedin=user.linkedin,
            twitter=user.twitter,
            avatar=user.avatar,
            createdAt=user.created_at,
            updatedAt=user.updated_at,
            twoFactorEnabled=user.two_factor_enabled,
            emailVerified=user.email_verified
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploader un avatar"""
    # Vérifier le type de fichier
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une image")
    
    try:
        # Lire et redimensionner l'image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Redimensionner si trop grande
        if image.width > 500 or image.height > 500:
            image.thumbnail((500, 500))
        
        # Générer un nom de fichier unique
        file_extension = file.filename.split('.')[-1]
        filename = f"avatar_{current_user.id}_{uuid.uuid4()}.{file_extension}"
        filepath = f"static/avatars/{filename}"
        
        # Sauvegarder l'image
        os.makedirs("static/avatars", exist_ok=True)
        image.save(filepath, optimize=True, quality=85)
        
        # URL publique
        avatar_url = f"/static/avatars/{filename}"
        
        # Mettre à jour en base de données
        service = ProfileService(db)
        service.update_avatar(current_user.id, avatar_url)
        
        return {"url": avatar_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur upload: {str(e)}")

# ==================== ROUTES SÉCURITÉ ====================

@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Changer le mot de passe"""
    service = ProfileService(db)
    
    try:
        service.change_password(current_user.id, password_data)
        
        # Logger avec les infos de la requête
        service.log_activity(
            user_id=current_user.id,
            action="Changement mot de passe",
            status="warning",
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent")
        )
        
        return {"message": "Mot de passe modifié avec succès"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/security-settings", response_model=SecuritySettings)
async def get_security_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les paramètres de sécurité"""
    service = ProfileService(db)
    user = service.get_user_by_id(current_user.id)
    
    settings = user.security_settings or {}
    return SecuritySettings(
        two_factor_enabled=user.two_factor_enabled,
        login_notifications=settings.get("login_notifications", True),
        email_alerts=settings.get("email_alerts", True)
    )

@router.put("/security-settings")
async def update_security_settings(
    settings: SecuritySettings,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour les paramètres de sécurité"""
    service = ProfileService(db)
    user = service.update_security_settings(
        current_user.id, 
        settings.dict()
    )
    return settings

# ==================== ROUTES SESSIONS ====================

def parse_user_agent(ua_string: str) -> str:
    if not ua_string:
        return "Appareil Inconnu"
    ua = ua_string.lower()
    
    # OS
    os_name = "OS Inconnu"
    if "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os x" in ua:
        os_name = "macOS"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
    elif "android" in ua:
        os_name = "Android"
    elif "linux" in ua:
        os_name = "Linux"
        
    # Browser
    browser_name = "Navigateur Inconnu"
    if "firefox" in ua:
        browser_name = "Firefox"
    elif "chrome" in ua or "crios" in ua:
        if "edg" in ua:
            browser_name = "Edge"
        elif "opr" in ua or "opera" in ua:
            browser_name = "Opera"
        else:
            browser_name = "Chrome"
    elif "safari" in ua and "chrome" not in ua:
        browser_name = "Safari"
    elif "msie" in ua or "trident" in ua:
        browser_name = "Internet Explorer"
        
    return f"{browser_name} / {os_name}"

@router.get("/sessions", response_model=List[SessionResponse])
async def get_sessions(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les sessions actives"""
    authorization = request.headers.get("Authorization", "")
    current_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else ""
    
    # Récupérer les sessions en DB
    db_sessions = db.query(UserSession).filter(UserSession.user_id == current_user.id).all()
    
    # Si aucune session en DB, enregistrer la session courante pour éviter une liste vide
    if not db_sessions and current_token:
        client_ip = request.client.host if request.client else "127.0.0.1"
        user_agent = request.headers.get("user-agent", "Inconnu")
        try:
            new_sess = UserSession(
                user_id=current_user.id,
                token=current_token,
                expires_at=datetime.utcnow() + timedelta(hours=6),
                ip_address=client_ip,
                user_agent=user_agent
            )
            db.add(new_sess)
            db.commit()
            db.refresh(new_sess)
            db_sessions = [new_sess]
        except Exception as e:
            logger.error(f"⚠️ Erreur auto-creation session: {e}")
            
    sessions_response = []
    for sess in db_sessions:
        is_current = (sess.token == current_token)
        sessions_response.append(
            SessionResponse(
                id=sess.id,
                device=parse_user_agent(sess.user_agent),
                location="Paris, France",  # Geoloc par défaut
                ip=sess.ip_address or "127.0.0.1",
                current=is_current,
                lastActive="Maintenant" if is_current else format_time_ago(sess.created_at),
                lastActiveTimestamp=sess.created_at
            )
        )
    return sessions_response

@router.delete("/sessions/{session_id}")
async def terminate_session(
    session_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Déconnecter une session spécifique"""
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
        
    db.delete(session)
    db.commit()
    return {"message": f"Session {session_id} déconnectée"}

@router.post("/sessions/terminate-all")
async def terminate_all_sessions(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Déconnecter tous les autres appareils"""
    authorization = request.headers.get("Authorization", "")
    current_token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else None
    
    query = db.query(UserSession).filter(UserSession.user_id == current_user.id)
    if current_token:
        query = query.filter(UserSession.token != current_token)
        
    deleted_count = query.delete(synchronize_session=False)
    db.commit()
    return {"message": f"{deleted_count} autres sessions déconnectées"}

# ==================== ROUTES ACTIVITÉ ====================

@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_activity_log(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Récupérer l'historique des activités"""
    service = ProfileService(db)
    activities = service.get_user_activities(current_user.id, limit)
    
    return [
        ActivityLogResponse(
            id=i,
            action=act.action,
            location=act.location or "Inconnu",
            device=act.user_agent or "Inconnu",
            time=format_time_ago(act.timestamp),
            status=act.status,
            timestamp=act.timestamp
        )
        for i, act in enumerate(activities)
    ]

# ==================== ROUTES NOTIFICATIONS ====================

@router.get("/notifications", response_model=NotificationSettings)
async def get_notification_settings(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les préférences de notifications"""
    service = ProfileService(db)
    user = service.get_user_by_id(current_user.id)
    
    return NotificationSettings(**(user.notification_settings or {
        "security_alerts": True,
        "new_features": True,
        "weekly_reports": False,
        "system_updates": True
    }))

@router.put("/notifications")
async def update_notification_settings(
    settings: NotificationSettings,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mettre à jour les préférences de notifications"""
    service = ProfileService(db)
    service.update_notification_settings(current_user.id, settings.dict())
    return settings

# ==================== ROUTES STATISTIQUES ====================

@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Récupérer les statistiques de l'utilisateur"""
    service = ProfileService(db)
    user = service.get_user_by_id(current_user.id)
    
    # 1. Calculer l'âge du compte
    account_age = (datetime.now() - user.created_at).days
    if account_age < 0:
        account_age = 0
        
    # 2. Projets
    total_projects = db.query(Project).filter(Project.project_manager_id == user.id).count()
    active_projects = db.query(Project).filter(
        Project.project_manager_id == user.id,
        Project.status == "active"
    ).count()
    
    if total_projects == 0 and user.company_id:
        total_projects = db.query(Project).filter(Project.company_id == user.company_id).count()
        active_projects = db.query(Project).filter(
            Project.company_id == user.company_id,
            Project.status == "active"
        ).count()
        
    # 3. Connexions (collaborateurs de l'entreprise)
    connections = 0
    if user.company_id:
        connections = db.query(User).filter(
            User.company_id == user.company_id,
            User.id != user.id
        ).count()
    if connections == 0:
        connections = db.query(User).filter(User.id != user.id).count()
        
    # 4. Score de sécurité
    security_score = 65
    if user.two_factor_enabled:
        security_score += 20
    if user.email_verified:
        security_score += 10
    if user.security_settings and user.security_settings.get("login_notifications", True):
        security_score += 5
        
    # 5. Complétion du profil
    fields = [
        user.first_name, user.last_name, user.email, user.phone, 
        user.address, user.company_name, user.position, user.bio, 
        user.website, user.github, user.linkedin, user.twitter, user.avatar
    ]
    filled = sum(1 for f in fields if f)
    profile_completion = int((filled / len(fields)) * 100) if fields else 0
    
    # 6. Activités totales
    total_activities = db.query(AuditLog).filter(AuditLog.user_id == user.id).count()
    
    return UserStats(
        active_projects=active_projects,
        total_projects=total_projects,
        connections=connections,
        security_score=security_score,
        last_login=user.last_login,
        account_age=account_age,
        profile_completion=profile_completion,
        total_activities=total_activities
    )

# ==================== FONCTIONS UTILITAIRES ====================

def format_time_ago(timestamp: datetime) -> str:
    """Formater un timestamp en 'il y a X temps'"""
    now = datetime.now()
    diff = now - timestamp
    
    if diff.days > 365:
        return f"Il y a {diff.days // 365} ans"
    elif diff.days > 30:
        return f"Il y a {diff.days // 30} mois"
    elif diff.days > 0:
        return f"Il y a {diff.days} jours"
    elif diff.seconds > 3600:
        return f"Il y a {diff.seconds // 3600} heures"
    elif diff.seconds > 60:
        return f"Il y a {diff.seconds // 60} minutes"
    else:
        return "À l'instant"