# app/middleware/tenant_middleware.py
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.orm import Session
import re
from typing import Optional

from app.database import SessionLocal
from app.models import User
from app.routes.auth import decode_token

# Routes à exclure du filtrage
EXCLUDED_PATHS = [
    r'^/api/v1/auth/.*$',
    r'^/health$',
    r'^/metrics$',
    r'^/docs$',
    r'^/redoc$',
    r'^/openapi.json$',
    r'^/ws/.*$',
]


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware qui intercepte TOUTES les requêtes et ajoute le tenant
    automatiquement à la session de base de données
    """
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Vérifier si la route doit être exclue
        for pattern in EXCLUDED_PATHS:
            if re.match(pattern, path):
                return await call_next(request)
        
        # Récupérer l'utilisateur depuis le token
        user = await self.get_user_from_request(request)
        
        # Créer une session avec tenant pour cette requête
        if user and user.id:
            # Ajouter l'utilisateur à l'état de la requête
            request.state.user = user
            request.state.user_id = user.id
            request.state.company_id = user.company_id
            
            # Créer une session de base de données avec tenant
            db = SessionLocal()
            db._tenant_user = user
            request.state.db = db
            
            print(f"🔐 TenantMiddleware - User: {user.id} ({user.email}), Company: {user.company_id}")
        else:
            request.state.db = None
        
        # Exécuter la requête
        response = await call_next(request)
        
        # Fermer la session si elle existe
        if hasattr(request.state, 'db') and request.state.db:
            request.state.db.close()
        
        return response
    
    async def get_user_from_request(self, request: Request) -> Optional[User]:
        """Récupérer l'utilisateur depuis le token"""
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
        
        try:
            token = auth_header.replace('Bearer ', '')
            payload = decode_token(token)
            if not payload:
                return None
            
            user_id = payload.get('user_id')
            if not user_id:
                return None
            
            db = SessionLocal()
            user = db.query(User).filter(User.id == int(user_id)).first()
            db.close()
            
            return user
        except Exception as e:
            print(f"❌ Erreur get_user_from_request: {e}")
            return None