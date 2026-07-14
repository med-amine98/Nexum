# app/api/endpoints/__init__.py
"""
Endpoints package for Nexum ERP
"""

# Importer SEULEMENT les modules qui existent dans ce dossier
from . import aml
from . import churn
from .claims import router as claims_router
from .claims_public import router as claims_public_router
from .car_damage import router as car_damage_router

# NE PAS importer auth ici - auth est dans app/api/ directement
# from . import auth  ← SUPPRIMEZ COMPLÈTEMENT CETTE LIGNE

__all__ = ['aml', 'churn','claims_router',
    'claims_public_router',
    'car_damage_router']