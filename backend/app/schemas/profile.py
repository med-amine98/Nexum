from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Union
from datetime import datetime
from enum import Enum

# ==================== ENUMS ====================
class ActivityStatus(str, Enum):
    """Statuts possibles pour les activités"""
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    INFO = "info"

class ProfileAction(str, Enum):
    """Types d'actions sur le profil"""
    UPDATE_PROFILE = "update_profile"
    CHANGE_PASSWORD = "change_password"
    UPLOAD_AVATAR = "upload_avatar"
    LOGIN = "login"
    LOGOUT = "logout"
    ENABLE_2FA = "enable_2fa"
    DISABLE_2FA = "disable_2fa"
    UPDATE_SETTINGS = "update_settings"
    DELETE_ACCOUNT = "delete_account"

# ==================== MODÈLES DE BASE ====================

class UserProfileBase(BaseModel):
    """Schéma de base pour le profil utilisateur"""
    model_config = ConfigDict(from_attributes=True)
    
    firstName: str = Field(..., min_length=2, max_length=50, description="Prénom")
    lastName: str = Field(..., min_length=2, max_length=50, description="Nom")
    email: EmailStr = Field(..., description="Email professionnel")
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9\s-]{10,20}$', description="Téléphone")
    address: Optional[str] = Field(None, max_length=255, description="Adresse postale")
    company: Optional[str] = Field(None, max_length=100, description="Entreprise")
    position: Optional[str] = Field(None, max_length=100, description="Poste")
    bio: Optional[str] = Field(None, max_length=500, description="Biographie")
    website: Optional[str] = Field(None, pattern=r'^https?://.*', description="Site web")
    github: Optional[str] = Field(None, max_length=50, description="Nom d'utilisateur GitHub")
    linkedin: Optional[str] = Field(None, max_length=100, description="URL ou nom LinkedIn")
    twitter: Optional[str] = Field(None, max_length=50, description="Nom d'utilisateur Twitter")
    avatar: Optional[str] = Field(None, description="URL de l'avatar")

class UserProfileCreate(UserProfileBase):
    """Schéma pour la création d'un profil"""
    password: str = Field(..., min_length=8, max_length=100, description="Mot de passe")
    confirm_password: str = Field(..., description="Confirmation du mot de passe")
    
    def check_passwords_match(self):
        """Vérifier que les mots de passe correspondent"""
        return self.password == self.confirm_password

class UserProfileUpdate(BaseModel):
    """Schéma pour la mise à jour du profil (tous champs optionnels)"""
    model_config = ConfigDict(from_attributes=True)
    
    firstName: Optional[str] = Field(None, min_length=2, max_length=50)
    lastName: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r'^\+?[0-9\s-]{10,20}$')
    address: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=100)
    position: Optional[str] = Field(None, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)
    website: Optional[str] = Field(None, pattern=r'^https?://.*')
    github: Optional[str] = Field(None, max_length=50)
    linkedin: Optional[str] = Field(None, max_length=100)
    twitter: Optional[str] = Field(None, max_length=50)
    avatar: Optional[str] = None

class UserProfileResponse(UserProfileBase):
    """Schéma pour la réponse API"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Union[int, str] = Field(..., description="ID unique de l'utilisateur")
    createdAt: datetime = Field(..., description="Date de création")
    updatedAt: datetime = Field(..., description="Date de dernière mise à jour")
    twoFactorEnabled: bool = Field(False, description="2FA activée")
    emailVerified: bool = Field(False, description="Email vérifié")

# ==================== SÉCURITÉ ====================

class PasswordChange(BaseModel):
    """Schéma pour le changement de mot de passe"""
    currentPassword: str = Field(..., description="Mot de passe actuel")
    newPassword: str = Field(..., min_length=8, max_length=100, description="Nouveau mot de passe")
    confirmPassword: str = Field(..., description="Confirmation du nouveau mot de passe")
    
    def check_passwords_match(self):
        """Vérifier que les nouveaux mots de passe correspondent"""
        return self.newPassword == self.confirmPassword

class PasswordReset(BaseModel):
    """Schéma pour la réinitialisation de mot de passe"""
    token: str = Field(..., description="Token de réinitialisation")
    newPassword: str = Field(..., min_length=8, max_length=100, description="Nouveau mot de passe")
    confirmPassword: str = Field(..., description="Confirmation")

class TwoFactorSetup(BaseModel):
    """Schéma pour la configuration 2FA"""
    secret: str = Field(..., description="Secret TOTP")
    qr_code: str = Field(..., description="QR code en base64")

class TwoFactorVerify(BaseModel):
    """Schéma pour la vérification 2FA"""
    code: str = Field(..., min_length=6, max_length=6, description="Code 2FA")

# ==================== ACTIVITÉS ====================

class ActivityLogResponse(BaseModel):
    """Schéma pour les logs d'activité"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Union[int, str] = Field(..., description="ID de l'activité")
    action: ProfileAction = Field(..., description="Action effectuée")
    status: ActivityStatus = Field(ActivityStatus.INFO, description="Statut")
    location: Optional[str] = Field(None, description="Localisation")
    device: Optional[str] = Field(None, description="Appareil utilisé")
    ip_address: Optional[str] = Field(None, description="Adresse IP")
    time: str = Field(..., description="Temps relatif (ex: 'il y a 2h')")
    timestamp: datetime = Field(..., description="Timestamp exact")
    details: Optional[dict] = Field(None, description="Détails supplémentaires")

# ==================== SESSIONS ====================

class SessionResponse(BaseModel):
    """Schéma pour les sessions"""
    model_config = ConfigDict(from_attributes=True)
    
    id: Union[int, str] = Field(..., description="ID de session")
    device: str = Field(..., description="Appareil/navigateur")
    location: str = Field(..., description="Localisation")
    ip: str = Field(..., description="Adresse IP")
    current: bool = Field(False, description="Session actuelle")
    lastActive: str = Field(..., description="Dernière activité (texte)")
    lastActiveTimestamp: datetime = Field(..., description="Dernière activité (timestamp)")

# ==================== NOTIFICATIONS ====================

class NotificationSettings(BaseModel):
    """Schéma pour les préférences de notifications"""
    model_config = ConfigDict(from_attributes=True)
    
    security_alerts: bool = Field(True, description="Alertes de sécurité")
    new_features: bool = Field(True, description="Nouvelles fonctionnalités")
    weekly_reports: bool = Field(False, description="Rapports hebdomadaires")
    system_updates: bool = Field(True, description="Mises à jour système")
    marketing_emails: bool = Field(False, description="Emails marketing")
    
    # Notifications push/in-app
    push_notifications: bool = Field(True, description="Notifications push")
    desktop_notifications: bool = Field(True, description="Notifications bureau")
    
    # Fréquence
    email_frequency: str = Field("daily", pattern="^(daily|weekly|monthly)$")

class NotificationSettingsUpdate(BaseModel):
    """Schéma pour la mise à jour des notifications"""
    security_alerts: Optional[bool] = None
    new_features: Optional[bool] = None
    weekly_reports: Optional[bool] = None
    system_updates: Optional[bool] = None
    marketing_emails: Optional[bool] = None
    push_notifications: Optional[bool] = None
    desktop_notifications: Optional[bool] = None
    email_frequency: Optional[str] = Field(None, pattern="^(daily|weekly|monthly)$")

# ==================== SÉCURITÉ ====================

class SecuritySettings(BaseModel):
    """Schéma pour les paramètres de sécurité"""
    model_config = ConfigDict(from_attributes=True)
    
    two_factor_enabled: bool = Field(False, description="2FA activée")
    login_notifications: bool = Field(True, description="Notifications de connexion")
    email_alerts: bool = Field(True, description="Alertes par email")
    session_timeout: int = Field(30, ge=5, le=480, description="Timeout session (minutes)")
    ip_whitelist: Optional[List[str]] = Field(None, description="IPs autorisées")
    
class SecuritySettingsUpdate(BaseModel):
    """Schéma pour la mise à jour de la sécurité"""
    two_factor_enabled: Optional[bool] = None
    login_notifications: Optional[bool] = None
    email_alerts: Optional[bool] = None
    session_timeout: Optional[int] = Field(None, ge=5, le=480)
    ip_whitelist: Optional[List[str]] = None

# ==================== STATISTIQUES ====================

class UserStats(BaseModel):
    """Schéma pour les statistiques utilisateur"""
    model_config = ConfigDict(from_attributes=True)
    
    active_projects: int = Field(..., ge=0, description="Projets actifs")
    total_projects: int = Field(..., ge=0, description="Total projets")
    connections: int = Field(..., ge=0, description="Nombre de connexions")
    security_score: int = Field(..., ge=0, le=100, description="Score sécurité (%)")
    last_login: Optional[datetime] = Field(None, description="Dernière connexion")
    account_age: int = Field(..., ge=0, description="Âge du compte (jours)")
    
    # Stats supplémentaires
    profile_completion: int = Field(0, ge=0, le=100, description="Profil complété (%)")
    total_activities: int = Field(0, ge=0, description="Total activités")
    avg_session_duration: Optional[int] = Field(None, ge=0, description="Durée moyenne session (min)")

# ==================== RÉPONSES API ====================

class ApiResponse(BaseModel):
    """Réponse API standard"""
    success: bool = Field(True, description="Succès de l'opération")
    message: Optional[str] = Field(None, description="Message")
    data: Optional[dict] = Field(None, description="Données")

class ProfileResponse(ApiResponse):
    """Réponse pour les requêtes profil"""
    data: Optional[UserProfileResponse] = None

class ActivitiesResponse(ApiResponse):
    """Réponse pour la liste d'activités"""
    data: Optional[List[ActivityLogResponse]] = None
    total: Optional[int] = None

class SessionsResponse(ApiResponse):
    """Réponse pour la liste des sessions"""
    data: Optional[List[SessionResponse]] = None

# ==================== VALIDATEURS PERSONNALISÉS ====================

def validate_phone(phone: str) -> bool:
    """Valider le format de téléphone"""
    import re
    pattern = r'^\+?[0-9\s-]{10,20}$'
    return bool(re.match(pattern, phone))

def validate_url(url: str) -> bool:
    """Valider le format d'URL"""
    import re
    pattern = r'^https?://(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
    return bool(re.match(pattern, url))

# ==================== EXEMPLES D'UTILISATION ====================

# Exemple de réponse pour la documentation
user_profile_example = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean.dupont@example.com",
    "phone": "+33 6 12 34 56 78",
    "company": "Nexum Solutions",
    "position": "Directeur Commercial",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-15T14:30:00Z",
    "twoFactorEnabled": True,
    "emailVerified": True
}

activity_example = {
    "id": "act_123456",
    "action": "update_profile",
    "status": "success",
    "location": "Paris, France",
    "device": "Chrome / Windows",
    "ip_address": "192.168.1.1",
    "time": "Il y a 2h",
    "timestamp": "2024-01-15T14:30:00Z"
}