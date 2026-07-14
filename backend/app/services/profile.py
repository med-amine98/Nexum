from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import Dict, Any, List
from app.models.auth import User, AuditLog, AuditAction
from app.models.sale import SaleOrder
from app.models.purchase import PurchaseOrder
from app.models.account import Invoice
from app.schemas.profile import UserProfileUpdate, PasswordChange
from app.core.security import verify_password, get_password_hash

class ProfileService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_id(self, user_id: int) -> User:
        return self.db.query(User).filter(User.id == user_id).first()

    def update_profile(self, user_id: int, data: UserProfileUpdate) -> User:
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Utilisateur non trouvé")
            
        update_data = data.model_dump(exclude_unset=True)
        
        # Map frontend camelCase to DB snake_case if necessary
        mapping = {
            "firstName": "first_name",
            "lastName": "last_name",
        }
        
        for key, value in update_data.items():
            db_key = mapping.get(key, key)
            if hasattr(user, db_key):
                setattr(user, db_key, value)
                
        # Update full_name if first_name or last_name changed
        if "firstName" in update_data or "lastName" in update_data:
            first = user.first_name or ""
            last = user.last_name or ""
            user.full_name = f"{first} {last}".strip()
            
        self.db.commit()
        self.db.refresh(user)
        return user

    def update_avatar(self, user_id: int, avatar_url: str):
        user = self.get_user_by_id(user_id)
        if user:
            user.avatar = avatar_url
            self.db.commit()
            self.db.refresh(user)

    def change_password(self, user_id: int, password_data: PasswordChange):
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("Utilisateur non trouvé")
            
        if not verify_password(password_data.currentPassword, user.hashed_password):
            raise ValueError("Mot de passe actuel incorrect")
            
        if password_data.newPassword != password_data.confirmPassword:
            raise ValueError("Les mots de passe ne correspondent pas")
            
        user.hashed_password = get_password_hash(password_data.newPassword)
        self.db.commit()

    def update_security_settings(self, user_id: int, settings: dict) -> User:
        user = self.get_user_by_id(user_id)
        if user:
            if "two_factor_enabled" in settings:
                user.two_factor_enabled = settings["two_factor_enabled"]
            
            # Merge with existing
            current_settings = user.security_settings or {}
            current_settings.update(settings)
            user.security_settings = current_settings
            
            self.db.commit()
            self.db.refresh(user)
        return user

    def update_notification_settings(self, user_id: int, settings: dict):
        user = self.get_user_by_id(user_id)
        if user:
            current_settings = user.notification_settings or {}
            current_settings.update(settings)
            user.notification_settings = current_settings
            self.db.commit()

    def get_user_activities(self, user_id: int, limit: int = 50) -> List[AuditLog]:
        return self.db.query(AuditLog).filter(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.created_at.desc()).limit(limit).all()

    def log_activity(self, user_id: int, action: str, status: str, ip_address: str = None, user_agent: str = None):
        # We map simple strings to AuditAction if needed, or just store a custom action string.
        # But our AuditLog model requires `action` to be of type `AuditAction` enum.
        # Since 'Changement mot de passe' isn't in AuditAction, let's just use AuditAction.UPDATE
        # and store the details in new_data or old_data.
        log = AuditLog(
            user_id=user_id,
            action=AuditAction.UPDATE,
            resource="User Profile",
            resource_id=str(user_id),
            new_data={"action_detail": action, "status": status},
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        self.db.commit()
