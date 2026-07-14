from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.user_module import UserModule

router = APIRouter()

# ============================================
# MAPPING DES MODULES - IDs vers Clés (strings)
# Basé sur les IDs réels de ta base de données
# ============================================
MODULE_KEY_MAP = {
    # Modules Enterprise (défaut)
    1: 'enterprise-dashboard',
    2: 'sale',
    3: 'purchase',
    4: 'crm',
    5: 'account',
    6: 'stock',
    7: 'hr',
    8: 'project',
    
    # Modules Banking
    15: 'banking-dashboard',
    16: 'credit-scoring',
    17: 'fraud-detection-banking',
    18: 'kyc-automation',
    19: 'aml-compliance',
    
    # Modules Insurance
    20: 'insurance-dashboard',
    21: 'claims-processing',
    22: 'fraud-detection-insurance',
    23: 'catastrophe-modeling',
    24: 'risk-scoring-insurance',
    
    # Modules Transversaux
    25: 'smart-dashboard',      # ID 25 = smart-dashboard
    26: 'nexy-ai',
    27: 'kanban',
    28: 'ocr',
    29: 'ai-report-generator',
    30: 'ai-quote-generator',
    31: 'document-intelligence', # ID 31 = document-intelligence
    32: 'smart-dashboard',       # ID 32 = smart-dashboard (alias)
    35: 'fraud-detection-banking', # ID 35 = fraud-detection-banking
    36: 'ai-quote-generator',    # ID 36 = ai-quote-generator
    38: 'nexy-ai',               # ID 38 = nexy-ai
    39: 'kanban',                # ID 39 = kanban
    41: 'digital-twin',          # ID 41 = digital-twin
    42: 'nexum-agents',          # ID 42 = nexum-agents
    44: 'nexum-predict',         # ID 44 = nexum-predict
    45: 'fraud-rings-3d',        # ID 45 = fraud-rings-3d
    46: 'cyber-shield',          # ID 46 = cyber-shield
    47: 'esg-tracker',           # ID 47 = esg-tracker
    48: 'pipeline-test',         # ID 48 = pipeline-test
    49: 'talent-mapping-3d',     # ID 49 = talent-mapping-3d
    51: 'ocr',                   # ID 51 = ocr
    52: 'pipeline-test',         # ID 52 = pipeline-test
    57: 'digital-twin',          # ID 57 = digital-twin
    
    # Modules Premium (Intelligence Hub)
    40: 'cyber-shield',
    41: 'digital-twin',
    42: 'nexum-agents',
    43: 'esg-tracker',
    44: 'nexum-predict',
    45: 'fraud-rings-3d',
    46: 'talent-mapping-3d',
    47: 'blockchain',            # ID 47 = blockchain
    48: 'pipeline-test',
    49: 'pipeline-test-2',
    
    # Modules Utilitaires
    97: 'saas-subscription',
    98: 'settings',
    99: 'profile',
    100: 'security-center',
}

# Mapping inverse pour la recherche par clé
KEY_TO_ID_MAP = {v: k for k, v in MODULE_KEY_MAP.items()}

# Liste des clés de tous les modules disponibles
ALL_MODULE_KEYS = list(set(MODULE_KEY_MAP.values()))


@router.get("/modules")
async def get_user_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les modules installés par l'utilisateur connecté
    Retourne une liste de clés (strings)
    """
    try:
        user_modules = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.is_installed == True
        ).all()
        
        # Convertir les IDs en clés strings
        module_keys = []
        for um in user_modules:
            module_key = MODULE_KEY_MAP.get(um.module_id, str(um.module_id))
            if module_key not in module_keys:  # Éviter les doublons
                module_keys.append(module_key)
        
        print(f"📦 [{current_user.email}] Modules installés ({len(module_keys)}): {module_keys}")
        return module_keys
        
    except Exception as e:
        print(f"Erreur get_user_modules: {e}")
        return []


@router.get("/modules/all")
async def get_all_available_modules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère la liste de tous les modules disponibles
    """
    try:
        # Récupérer les modules installés par l'utilisateur
        installed_modules = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.is_installed == True
        ).all()
        installed_ids = [um.module_id for um in installed_modules]
        
        # Construire la liste de tous les modules (sans doublons)
        unique_modules = {}
        for module_id, module_key in MODULE_KEY_MAP.items():
            if module_key not in unique_modules:
                unique_modules[module_key] = module_id
        
        all_modules = []
        for module_key, module_id in unique_modules.items():
            all_modules.append({
                "key": module_key,
                "id": module_id,
                "is_installed": module_id in installed_ids
            })
        
        return {
            "success": True,
            "data": all_modules,
            "total": len(all_modules),
            "installed_count": len(installed_ids)
        }
        
    except Exception as e:
        print(f"Erreur get_all_available_modules: {e}")
        return {"success": False, "data": [], "error": str(e)}


@router.get("/modules/details")
async def get_user_modules_details(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Récupère les détails complets des modules installés
    """
    try:
        user_modules = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.is_installed == True
        ).all()
        
        result = []
        seen_keys = set()
        for um in user_modules:
            module_key = MODULE_KEY_MAP.get(um.module_id, str(um.module_id))
            if module_key not in seen_keys:
                seen_keys.add(module_key)
                result.append({
                    "module_id": um.module_id,
                    "module_key": module_key,
                    "is_favorite": um.is_favorite if hasattr(um, 'is_favorite') else False,
                    "is_installed": um.is_installed,
                    "is_paid": um.is_paid if hasattr(um, 'is_paid') else False,
                    "installed_at": um.installed_at.isoformat() if um.installed_at else None,
                    "payment_date": um.payment_date.isoformat() if hasattr(um, 'payment_date') and um.payment_date else None
                })
        
        print(f"📦 [{current_user.email}] Détails modules: {len(result)} modules")
        return {
            "success": True,
            "data": result
        }
        
    except Exception as e:
        print(f"Erreur get_user_modules_details: {e}")
        return {"success": False, "data": [], "error": str(e)}


@router.post("/modules/{module_key}")
async def install_user_module(
    module_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Installe un module pour l'utilisateur connecté
    """
    try:
        # Trouver l'ID du module à partir de la clé
        module_id = KEY_TO_ID_MAP.get(module_key)
        
        if module_id is None:
            # Essayer de convertir directement en entier
            try:
                module_id = int(module_key)
            except ValueError:
                return {
                    "success": False, 
                    "message": f"Module '{module_key}' non reconnu",
                    "available_modules": ALL_MODULE_KEYS
                }
        
        # Vérifier si le module est déjà installé pour cet utilisateur
        existing = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.module_id == module_id
        ).first()
        
        if existing:
            if not existing.is_installed:
                existing.is_installed = True
                existing.installed_at = datetime.now()
                db.commit()
                print(f"✅ [{current_user.email}] Module {module_key} réinstallé")
            else:
                print(f"ℹ️ [{current_user.email}] Module {module_key} déjà installé")
            return {
                "success": True, 
                "message": f"Module '{module_key}' installé avec succès",
                "module_key": module_key,
                "module_id": module_id
            }
        
        # Créer une nouvelle entrée pour cet utilisateur
        user_module = UserModule(
            user_id=current_user.id,
            module_id=module_id,
            is_installed=True,
            is_favorite=False,
            installed_at=datetime.now(),
            created_at=datetime.now()
        )
        db.add(user_module)
        db.commit()
        
        print(f"✅ [{current_user.email}] Module {module_key} installé (ID: {module_id})")
        return {
            "success": True, 
            "message": f"Module '{module_key}' installé avec succès",
            "module_key": module_key,
            "module_id": module_id
        }
        
    except Exception as e:
        db.rollback()
        print(f"Erreur install_user_module: {e}")
        return {"success": False, "message": str(e)}


@router.delete("/modules/{module_key}")
async def uninstall_user_module(
    module_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Désinstalle un module pour l'utilisateur connecté
    """
    try:
        # Trouver l'ID du module à partir de la clé
        module_id = KEY_TO_ID_MAP.get(module_key)
        
        if module_id is None:
            try:
                module_id = int(module_key)
            except ValueError:
                return {
                    "success": False, 
                    "message": f"Module '{module_key}' non reconnu"
                }
        
        # Chercher le module installé
        user_module = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.module_id == module_id,
            UserModule.is_installed == True
        ).first()
        
        if user_module:
            user_module.is_installed = False
            db.commit()
            print(f"🗑️ [{current_user.email}] Module {module_key} désinstallé")
            return {
                "success": True,
                "message": f"Module '{module_key}' désinstallé avec succès",
                "module_key": module_key
            }
        else:
            return {
                "success": True,
                "message": f"Module '{module_key}' n'était pas installé",
                "module_key": module_key,
                "already_uninstalled": True
            }
        
    except Exception as e:
        db.rollback()
        print(f"Erreur uninstall_user_module: {e}")
        return {"success": False, "message": str(e)}


@router.get("/modules/check/{module_key}")
async def check_module_installed(
    module_key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Vérifie si un module spécifique est installé
    """
    try:
        module_id = KEY_TO_ID_MAP.get(module_key)
        
        if module_id is None:
            try:
                module_id = int(module_key)
            except ValueError:
                return {
                    "success": True,
                    "data": {
                        "module_key": module_key,
                        "is_installed": False,
                        "exists": False
                    }
                }
        
        user_module = db.query(UserModule).filter(
            UserModule.user_id == current_user.id,
            UserModule.module_id == module_id,
            UserModule.is_installed == True
        ).first()
        
        return {
            "success": True,
            "data": {
                "module_key": module_key,
                "module_id": module_id,
                "is_installed": user_module is not None,
                "installed_at": user_module.installed_at.isoformat() if user_module else None,
                "is_favorite": user_module.is_favorite if user_module and hasattr(user_module, 'is_favorite') else False
            }
        }
        
    except Exception as e:
        print(f"Erreur check_module_installed: {e}")
        return {"success": False, "error": str(e)}
