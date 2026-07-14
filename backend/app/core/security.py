# app/core/security.py
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import os
import logging
import random
import string

# Configuration du logging
logger = logging.getLogger(__name__)

# Utiliser pbkdf2_sha256 au lieu de bcrypt (pas de limite de 72 bytes)
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto"
)

# Configuration JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie un mot de passe
    """
    try:
        # Convertir en string si nécessaire
        if isinstance(plain_password, bytes):
            plain_password = plain_password.decode('utf-8')
        
        # Assurer que c'est une string
        plain_password = str(plain_password)
        
        logger.debug(f"Vérification du mot de passe (longueur: {len(plain_password)})")
        
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Erreur lors de la vérification du mot de passe: {e}")
        return False

def get_password_hash(password: str) -> str:
    """
    Hash un mot de passe
    """
    try:
        # Convertir en string si nécessaire
        if isinstance(password, bytes):
            password = password.decode('utf-8')
        
        # Assurer que c'est une string
        password = str(password)
        
        # Vérifier que le mot de passe n'est pas vide
        if not password:
            raise ValueError("Le mot de passe ne peut pas être vide")
        
        logger.debug(f"Hash du mot de passe (longueur: {len(password)})")
        
        # Hasher le mot de passe
        return pwd_context.hash(password)
        
    except Exception as e:
        logger.error(f"Erreur lors du hash du mot de passe: {e}")
        raise ValueError(f"Erreur lors du hash du mot de passe: {str(e)}")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    to_encode.update({"iat": datetime.utcnow()})
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Erreur lors de la création du token: {e}")
        raise ValueError(f"Erreur lors de la création du token: {str(e)}")

def decode_access_token(token: str) -> Optional[dict]:
    """Décode un token JWT"""
    try:
        logger.info(f"🔓 Tentative de décodage du token: {token[:30]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"✅ Token décodé avec succès: {payload}")
        return payload
    except JWTError as e:
        logger.error(f"❌ Erreur JWT: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Erreur inattendue: {e}")
        return None

def verify_token(token: str) -> bool:
    """
    Vérifie si un token est valide
    """
    payload = decode_access_token(token)
    if payload is None:
        return False
    
    exp = payload.get("exp")
    if exp and datetime.utcnow() > datetime.fromtimestamp(exp):
        return False
    
    return True

def refresh_access_token(refresh_token: str) -> Optional[str]:
    """
    Rafraîchit un token d'accès
    """
    payload = decode_access_token(refresh_token)
    if payload is None:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    return create_access_token(data={"sub": user_id})

# ========== FONCTIONS POUR LE SOCIAL LOGIN ==========

def generate_random_password(length: int = 12) -> str:
    """
    Génère un mot de passe aléatoire sécurisé
    """
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(random.choice(characters) for _ in range(length))
    
    # S'assurer que le mot de passe contient au moins un chiffre, une lettre et un caractère spécial
    if not any(c.isdigit() for c in password):
        password = password[:-1] + random.choice(string.digits)
    if not any(c.isalpha() for c in password):
        password = password[:-1] + random.choice(string.ascii_letters)
    if not any(c in "!@#$%^&*" for c in password):
        password = password[:-1] + random.choice("!@#$%^&*")
    
    return password


# ========== FONCTIONS POUR LA NORMALISATION DES SECTEURS ==========

def normalize_sector(sector: str) -> str:
    """
    Normalise le secteur pour correspondre aux valeurs de l'Enum CompanySector.
    Retourne TOUJOURS une valeur en MAJUSCULES.
    """
    if not sector:
        return "ENTERPRISE"
    
    # Convertir en minuscules pour la comparaison
    sector_lower = sector.lower().strip()
    
    # Mapping complet des valeurs possibles vers les valeurs ENUM en MAJUSCULES
    sector_mapping = {
        # Anglais
        'bank': 'BANK',
        'banks': 'BANK',
        'banking': 'BANK',
        'insurance': 'INSURANCE',
        'insurances': 'INSURANCE',
        'enterprise': 'ENTERPRISE',
        'enterprises': 'ENTERPRISE',
        'tech': 'TECH',
        'technology': 'TECH',
        'technologies': 'TECH',
        'commerce': 'COMMERCE',
        'retail': 'COMMERCE',
        'commercial': 'COMMERCE',
        'industry': 'INDUSTRY',
        'industries': 'INDUSTRY',
        'service': 'SERVICE',
        'services': 'SERVICE',
        'other': 'OTHER',
        # Français
        'banque': 'BANK',
        'banques': 'BANK',
        'assurance': 'INSURANCE',
        'assurances': 'INSURANCE',
        'entreprise': 'ENTERPRISE',
        'entreprises': 'ENTERPRISE',
        'technologie': 'TECH',
        'technologies': 'TECH',
        'commerce': 'COMMERCE',
        'industrie': 'INDUSTRY',
        'industries': 'INDUSTRY',
        'service': 'SERVICE',
        'services': 'SERVICE',
        'autre': 'OTHER',
    }
    
    # Retourner la valeur ENUM ou ENTERPRISE par défaut
    result = sector_mapping.get(sector_lower, 'ENTERPRISE')
    
    logger.debug(f"normalize_sector: '{sector}' → '{result}'")
    
    return result


def get_sector_display_name(sector: str) -> str:
    """
    Retourne le nom d'affichage du secteur
    """
    sector_names = {
        'BANK': 'Banque & Finance',
        'INSURANCE': 'Assurance',
        'ENTERPRISE': 'Entreprise',
        'TECH': 'Technologie',
        'COMMERCE': 'Commerce',
        'INDUSTRY': 'Industrie',
        'SERVICE': 'Services',
        'OTHER': 'Autre'
    }
    # Normaliser d'abord pour être sûr d'avoir une valeur ENUM
    normalized = normalize_sector(sector)
    return sector_names.get(normalized, 'Entreprise')


# ========== FONCTIONS DE DÉCODAGE DE TOKEN ==========

def decode_token(token: str) -> dict:
    """
    Décode un token JWT
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.error("❌ Token invalide ou expiré")
        raise ValueError("Token invalide ou expiré")
    except Exception as e:
        logger.error(f"❌ Erreur de décodage: {e}")
        raise ValueError(f"Erreur de décodage: {str(e)}")