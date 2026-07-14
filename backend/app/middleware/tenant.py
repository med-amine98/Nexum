from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
import re
import json
from typing import Optional

from app.database import get_db
from app.models import User
from app.routes.auth import decode_token

# Routes à exclure du filtrage tenant
EXCLUDED_PATHS = [
    r'^/api/v1/auth/.*$',
    r'^/api/v1/health$',
    r'^/metrics$',
    r'^/docs$',
    r'^/redoc$',
    r'^/openapi.json$',
    r'^/ws/.*$',  # WebSocket
    r'^/api/v1/superadmin/.*$',  # Super Admin peut tout voir
]

# Modèles et leurs champs de filtrage
TENANT_MODELS = {
    'purchase_orders': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'sale_orders': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'accounts': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'accounts_euros': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'transactions': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'crm_leads': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'support_tickets': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'stock_movements': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'hr_employees': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'invoices': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'quotes': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'products': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'suppliers': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'clients': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'insurance_claims': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'banking_transactions': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'credit_requests': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'kyc_documents': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'aml_transactions': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'ai_reports': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'documents': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'projects': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'tasks': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'enterprise_products': {'user_field': 'create_uid', 'company_field': 'company_id'},
    'enterprise_projects': {'user_field': 'create_uid', 'company_field': 'company_id'},
}


class TenantMiddleware(BaseHTTPMiddleware):
    """Middleware qui filtre TOUTES les requêtes par company_id et create_uid"""
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method
        
        # Vérifier si la route doit être exclue
        for pattern in EXCLUDED_PATHS:
            if re.match(pattern, path):
                return await call_next(request)
        
        # Récupérer l'utilisateur depuis le token
        user = await self.get_user_from_request(request)
        
        if user and user.id:
            # Ajouter les informations tenant à l'état de la requête
            request.state.user_id = user.id
            request.state.company_id = user.company_id
            request.state.user = user
            request.state.role = user.role if hasattr(user, 'role') else 'user'
            
            print(f"🔐 TenantMiddleware - User: {user.id} ({user.email}), Company: {user.company_id}")
            
            # Pour les requêtes GET, on peut modifier les paramètres de la requête
            if method == "GET":
                # Ajouter les filtres aux paramètres de la requête
                request._query_params = request.query_params.copy()
                request._query_params = request._query_params.mutable()
                if user.company_id and user.role not in ['admin', 'super_admin']:
                    request._query_params['company_id'] = str(user.company_id)
                    request._query_params['create_uid'] = str(user.id)
        else:
            print(f"⚠️ TenantMiddleware - Aucun utilisateur trouvé pour {path}")
        
        response = await call_next(request)
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
            
            # Récupérer l'utilisateur de la base de données
            db: Session = next(get_db())
            user = db.query(User).filter(User.id == int(user_id)).first()
            db.close()
            
            return user
        except Exception as e:
            print(f"❌ Erreur get_user_from_request: {e}")
            return None