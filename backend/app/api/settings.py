# app/api/settings.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from app.database import get_db
from app.models.settings import (
    UserPreference, BusinessRule, Integration, SecurityConfig, SystemUser,
    PreferenceType, RuleAction, RulePriority, IntegrationType, IntegrationStatus, UserRole
)
from app.core.security import get_password_hash, verify_password
from app.core.dependencies import get_current_active_user
from app.models.auth import User
import httpx

router = APIRouter(prefix="/settings", tags=["settings"])


# ========== PRÉFÉRENCES UTILISATEUR ==========

@router.get("/preferences")
async def get_user_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les préférences de l'utilisateur connecté"""
    preferences = db.query(UserPreference).filter(
        UserPreference.user_id == current_user.id
    ).all()
    
    result = {}
    for pref in preferences:
        if pref.preference_type.value not in result:
            result[pref.preference_type.value] = {}
        result[pref.preference_type.value][pref.key] = pref.value
    
    return result


@router.post("/preferences")
async def save_user_preferences(
    preferences: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Sauvegarder les préférences de l'utilisateur"""
    for pref_type, values in preferences.items():
        for key, value in values.items():
            existing = db.query(UserPreference).filter(
                UserPreference.user_id == current_user.id,
                UserPreference.preference_type == pref_type,
                UserPreference.key == key
            ).first()
            
            if existing:
                existing.value = value
                existing.updated_at = datetime.now()
            else:
                new_pref = UserPreference(
                    user_id=current_user.id,
                    preference_type=pref_type,
                    key=key,
                    value=value
                )
                db.add(new_pref)
    
    db.commit()
    return {"success": True, "message": "Préférences sauvegardées"}


# ========== RÈGLES MÉTIER ==========

@router.get("/business-rules")
async def get_business_rules(
    enabled_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les règles métier"""
    query = db.query(BusinessRule)
    
    if enabled_only:
        query = query.filter(BusinessRule.is_enabled == True)
    
    rules = query.order_by(desc(BusinessRule.priority)).limit(limit).all()
    
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "condition": r.condition,
            "action": r.action.value,
            "priority": r.priority.value,
            "enabled": r.is_enabled,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rules
    ]


@router.post("/business-rules")
async def create_business_rule(
    rule_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Créer une nouvelle règle métier"""
    new_rule = BusinessRule(
        name=rule_data.get("name"),
        description=rule_data.get("description"),
        condition=rule_data.get("condition"),
        action=rule_data.get("action"),
        priority=rule_data.get("priority", "medium"),
        is_enabled=rule_data.get("enabled", True),
        created_by=current_user.id,
        created_at=datetime.now()
    )
    
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    
    return {
        "success": True,
        "id": new_rule.id,
        "message": f"Règle '{new_rule.name}' créée avec succès"
    }


@router.put("/business-rules/{rule_id}")
async def update_business_rule(
    rule_id: int,
    rule_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une règle métier"""
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    
    for key, value in rule_data.items():
        if hasattr(rule, key):
            setattr(rule, key, value)
    
    rule.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "Règle mise à jour"}


@router.delete("/business-rules/{rule_id}")
async def delete_business_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Supprimer une règle métier"""
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    
    db.delete(rule)
    db.commit()
    
    return {"success": True, "message": "Règle supprimée"}


@router.patch("/business-rules/{rule_id}/toggle")
async def toggle_business_rule(
    rule_id: int,
    db: Session = Depends(get_db)
):
    """Activer/désactiver une règle métier"""
    rule = db.query(BusinessRule).filter(BusinessRule.id == rule_id).first()
    
    if not rule:
        raise HTTPException(status_code=404, detail="Règle non trouvée")
    
    rule.is_enabled = not rule.is_enabled
    rule.updated_at = datetime.now()
    db.commit()
    
    return {
        "success": True,
        "enabled": rule.is_enabled,
        "message": f"Règle {'activée' if rule.is_enabled else 'désactivée'}"
    }


# ========== INTÉGRATIONS ==========

@router.get("/integrations")
async def get_integrations(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer toutes les intégrations"""
    query = db.query(Integration)
    
    if status:
        query = query.filter(Integration.status == status)
    
    integrations = query.order_by(Integration.name).all()
    
    return [
        {
            "id": i.id,
            "name": i.name,
            "type": i.type.value,
            "url": i.url,
            "credentials": "••••••••" if i.credentials else None,
            "headers": i.headers,
            "mapping": i.mapping,
            "status": i.status.value,
            "last_test_at": i.last_test_at.isoformat() if i.last_test_at else None,
            "last_error": i.last_error
        }
        for i in integrations
    ]


@router.post("/integrations")
async def create_integration(
    integration_data: dict,
    db: Session = Depends(get_db)
):
    """Créer une nouvelle intégration"""
    new_integration = Integration(
        name=integration_data.get("name"),
        type=integration_data.get("type"),
        url=integration_data.get("url"),
        credentials=integration_data.get("credentials"),
        headers=integration_data.get("headers"),
        mapping=integration_data.get("mapping"),
        status=IntegrationStatus.INACTIVE,
        created_at=datetime.now()
    )
    
    db.add(new_integration)
    db.commit()
    db.refresh(new_integration)
    
    return {
        "success": True,
        "id": new_integration.id,
        "message": f"Intégration '{new_integration.name}' créée"
    }


@router.put("/integrations/{integration_id}")
async def update_integration(
    integration_id: int,
    integration_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour une intégration"""
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    for key, value in integration_data.items():
        if hasattr(integration, key) and key not in ["id", "created_at"]:
            setattr(integration, key, value)
    
    integration.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "Intégration mise à jour"}


@router.delete("/integrations/{integration_id}")
async def delete_integration(
    integration_id: int,
    db: Session = Depends(get_db)
):
    """Supprimer une intégration"""
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    db.delete(integration)
    db.commit()
    
    return {"success": True, "message": "Intégration supprimée"}


@router.post("/integrations/{integration_id}/test")
async def test_integration(
    integration_id: int,
    db: Session = Depends(get_db)
):
    """Tester la connexion d'une intégration"""
    integration = db.query(Integration).filter(Integration.id == integration_id).first()
    
    if not integration:
        raise HTTPException(status_code=404, detail="Intégration non trouvée")
    
    try:
        async with httpx.AsyncClient() as client:
            headers = integration.headers or {}
            if integration.credentials:
                headers["Authorization"] = f"Bearer {integration.credentials}"
            
            response = await client.get(integration.url, headers=headers, timeout=10.0)
            
            if response.status_code < 400:
                integration.status = IntegrationStatus.ACTIVE
                integration.last_test_at = datetime.now()
                integration.last_error = None
                db.commit()
                return {"success": True, "status": "active", "message": "Connexion réussie"}
            else:
                integration.status = IntegrationStatus.ERROR
                integration.last_error = f"HTTP {response.status_code}"
                db.commit()
                return {"success": False, "status": "error", "message": f"Erreur HTTP {response.status_code}"}
    
    except Exception as e:
        integration.status = IntegrationStatus.ERROR
        integration.last_error = str(e)
        db.commit()
        return {"success": False, "status": "error", "message": str(e)}


# ========== SÉCURITÉ ==========

@router.get("/security")
async def get_security_config(
    db: Session = Depends(get_db)
):
    """Récupérer la configuration de sécurité"""
    config = db.query(SecurityConfig).first()
    
    if not config:
        config = SecurityConfig(
            two_factor_auth=False,
            password_expiry_days=90,
            session_timeout_minutes=30,
            max_login_attempts=5,
            allowed_ips=[],
            created_at=datetime.now()
        )
        db.add(config)
        db.commit()
    
    return {
        "two_factor_auth": config.two_factor_auth,
        "password_expiry_days": config.password_expiry_days,
        "session_timeout_minutes": config.session_timeout_minutes,
        "max_login_attempts": config.max_login_attempts,
        "allowed_ips": config.allowed_ips
    }


@router.put("/security")
async def update_security_config(
    config_data: dict,
    db: Session = Depends(get_db)
):
    """Mettre à jour la configuration de sécurité"""
    config = db.query(SecurityConfig).first()
    
    if not config:
        config = SecurityConfig()
        db.add(config)
    
    for key, value in config_data.items():
        if hasattr(config, key):
            setattr(config, key, value)
    
    config.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "Configuration de sécurité mise à jour"}


# ========== UTILISATEURS ==========

@router.get("/users")
async def get_system_users(
    current_user: User = Depends(get_current_active_user),
    role: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des utilisateurs système"""
    # Vérifier les droits admin
    if current_user.role != "administrateur" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    query = db.query(SystemUser)
    
    if role:
        query = query.filter(SystemUser.role == role)
    
    if is_active is not None:
        query = query.filter(SystemUser.is_active == is_active)
    
    users = query.order_by(SystemUser.username).all()
    
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]


@router.post("/users")
async def create_system_user(
    user_data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Créer un nouvel utilisateur système"""
    # Vérifier les droits admin
    if current_user.role != "administrateur" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    existing = db.query(SystemUser).filter(
        (SystemUser.username == user_data.get("username")) |
        (SystemUser.email == user_data.get("email"))
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Nom d'utilisateur ou email déjà utilisé")
    
    new_user = SystemUser(
        username=user_data.get("username"),
        email=user_data.get("email"),
        password_hash=get_password_hash(user_data.get("password")),
        full_name=user_data.get("full_name"),
        role=user_data.get("role", UserRole.USER),
        is_active=True,
        created_at=datetime.now()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "success": True,
        "id": new_user.id,
        "message": f"Utilisateur {new_user.username} créé"
    }


@router.put("/users/{user_id}/toggle")
async def toggle_user_status(
    user_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Activer/désactiver un utilisateur"""
    # Vérifier les droits admin
    if current_user.role != "administrateur" and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    user = db.query(SystemUser).filter(SystemUser.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    user.is_active = not user.is_active
    user.updated_at = datetime.now()
    db.commit()
    
    return {
        "success": True,
        "is_active": user.is_active,
        "message": f"Utilisateur {'activé' if user.is_active else 'désactivé'}"
    }


# ========== DATABASE INFO ==========

@router.get("/database/info")
async def get_database_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les informations sur la base de données"""
    from app.models.banking import Client, Transaction, Account, Loan
    
    info = {
        "host": "postgres",
        "port": 5432,
        "database": "erp",
        "user": "odoo",
        "status": "connected",
        "tables": {
            "clients": db.query(Client).count(),
            "transactions": db.query(Transaction).count(),
            "accounts": db.query(Account).count(),
            "loans": db.query(Loan).count(),
            "business_rules": db.query(BusinessRule).count(),
            "integrations": db.query(Integration).count(),
            "users": db.query(SystemUser).count()
        }
    }
    
    # Calculer la taille approximative
    info["size_mb"] = sum(info["tables"].values()) * 0.1
    
    return info