# app/models/base.py
from sqlalchemy import Column, Integer, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Création de la base SQLAlchemy
Base = declarative_base()

class BaseModel(Base):
    """Classe de base pour tous les modèles (compatible Odoo-style)"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    create_date = Column(DateTime, default=datetime.utcnow)
    write_date = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    create_uid = Column(Integer, ForeignKey('res_users.id'), nullable=True)
    write_uid = Column(Integer, ForeignKey('res_users.id'), nullable=True)
    company_id = Column(Integer, ForeignKey('res_company.id'), nullable=True)
    
    def to_dict(self):
        """Convertit le modèle en dictionnaire"""
        result = {}
        for column in self.__table__.columns:
            value = getattr(self, column.name)
            # Convertir les datetime en string pour JSON
            if isinstance(value, datetime):
                value = value.isoformat()
            result[column.name] = value
        return result
    
    def save(self, db_session):
        """Sauvegarde l'instance dans la base de données"""
        db_session.add(self)
        db_session.commit()
        db_session.refresh(self)
        return self
    
    def delete(self, db_session):
        """Supprime l'instance de la base de données"""
        db_session.delete(self)
        db_session.commit()
        return True
    
    @classmethod
    def get(cls, db_session, id):
        """Récupère une instance par son ID"""
        return db_session.query(cls).filter(cls.id == id).first()
    
    @classmethod
    def search(cls, db_session, domain=None, limit=None, offset=None, order=None):
        """Recherche des instances avec des critères (style Odoo)"""
        query = db_session.query(cls)
        
        if domain:
            # Appliquer les filtres (à implémenter selon vos besoins)
            for condition in domain:
                if isinstance(condition, (list, tuple)) and len(condition) == 3:
                    field, operator, value = condition
                    column = getattr(cls, field, None)
                    if column:
                        if operator == '=':
                            query = query.filter(column == value)
                        elif operator == '!=':
                            query = query.filter(column != value)
                        elif operator == 'like':
                            query = query.filter(column.like(f'%{value}%'))
                        elif operator == 'ilike':
                            query = query.filter(column.ilike(f'%{value}%'))
                        elif operator == 'in':
                            query = query.filter(column.in_(value))
                        elif operator == 'not in':
                            query = query.filter(~column.in_(value))
                        elif operator == '>':
                            query = query.filter(column > value)
                        elif operator == '<':
                            query = query.filter(column < value)
                        elif operator == '>=':
                            query = query.filter(column >= value)
                        elif operator == '<=':
                            query = query.filter(column <= value)
        
        if order:
            query = query.order_by(order)
        
        if limit:
            query = query.limit(limit)
        
        if offset:
            query = query.offset(offset)
        
        return query.all()