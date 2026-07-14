# app/models/mixins.py
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.ext.declarative import declared_attr


class TenantMixin:
    """Mixin pour ajouter les champs tenant à tous les modèles"""
    
    @declared_attr
    def create_uid(cls):
        return Column(Integer, ForeignKey('res_users.id'), nullable=True)
    
    @declared_attr
    def write_uid(cls):
        return Column(Integer, ForeignKey('res_users.id'), nullable=True)
    
    @declared_attr
    def company_id(cls):
        return Column(Integer, ForeignKey('res_company.id'), nullable=True)