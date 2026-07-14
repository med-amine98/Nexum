# app/filters/tenant.py
from sqlalchemy.orm import Query
from typing import Dict, Any, Optional
from app.models import User


def apply_tenant_filters(
    query: Query, 
    user: User, 
    model: Any,
    filter_by_user: bool = True,
    filter_by_company: bool = True
) -> Query:
    """
    Applique les filtres tenant à une requête SQLAlchemy
    
    Args:
        query: La requête SQLAlchemy
        user: L'utilisateur courant
        model: Le modèle SQLAlchemy
        filter_by_user: Filtrer par create_uid
        filter_by_company: Filtrer par company_id
    
    Returns:
        La requête avec les filtres appliqués
    """
    if not user:
        return query
    
    # Si l'utilisateur est admin/super_admin, ne pas filtrer
    if hasattr(user, 'role') and user.role in ['admin', 'super_admin']:
        return query
    
    # Filtrer par company_id
    if filter_by_company and hasattr(model, 'company_id'):
        if hasattr(user, 'company_id') and user.company_id:
            query = query.filter(model.company_id == user.company_id)
        else:
            query = query.filter(model.company_id == None)
    
    # Filtrer par create_uid (user_id)
    if filter_by_user and hasattr(model, 'create_uid'):
        query = query.filter(model.create_uid == user.id)
    
    return query


def get_tenant_filters(user: User) -> Dict[str, Any]:
    """
    Retourne les filtres tenant pour les requêtes get()
    """
    filters = {}
    
    if not user:
        return filters
    
    if hasattr(user, 'role') and user.role in ['admin', 'super_admin']:
        return filters
    
    if hasattr(user, 'company_id') and user.company_id:
        filters['company_id'] = user.company_id
    
    filters['create_uid'] = user.id
    
    return filters


def create_tenant_query(query: Query, user: User, model: Any) -> Query:
    """
    Applique les filtres tenant à une requête de manière standardisée
    """
    return apply_tenant_filters(query, user, model)