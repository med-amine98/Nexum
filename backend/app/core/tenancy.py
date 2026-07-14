from sqlalchemy.orm import Query
from fastapi import HTTPException, status
from typing import Type
import logging

logger = logging.getLogger(__name__)

def apply_tenant_filter(query: Query, model: Type, current_user) -> Query:
    """
    Applique un filtre de sécurité multi-tenant sur une requête SQLAlchemy.
    S'assure que l'utilisateur ne voit que les données de son entreprise.
    """
    if not hasattr(model, 'company_id'):
        logger.warning(f"Le modèle {model.__name__} n'a pas de colonne company_id.")
        return query
        
    if current_user.is_superuser:
        # Les superadmins peuvent tout voir (optionnel, à ajuster selon le besoin)
        return query
        
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé : aucune entreprise associée à votre compte."
        )
        
    return query.filter(model.company_id == current_user.company_id)

def ensure_tenant_data(data_dict: dict, current_user) -> dict:
    """
    Injecte le company_id de l'utilisateur dans un dictionnaire de données
    avant la création ou la mise à jour en base de données.
    """
    data_dict["company_id"] = current_user.company_id
    return data_dict
