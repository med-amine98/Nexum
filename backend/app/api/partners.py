# app/api/partners.py
import logging
logger = logging.getLogger(__name__)
logger.info("🔧 CHARGEMENT DU MODULE PARTNERS...")
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from app.database import get_db
from app.models.partner import Partner

logger.info("✅ IMPORTS PARTNERS RÉUSSIS")

router = APIRouter(tags=["Partners"])
logger.info("🔧 ROUTER PARTNERS CRÉÉ (sans préfixe)")

# ===== SCHEMAS =====
class PartnerCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = "France"
    vat: Optional[str] = None
    is_company: bool = False
    is_customer: bool = False
    is_supplier: bool = False
    credit_limit: float = 0.0
    payment_term: Optional[str] = None

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    vat: Optional[str] = None
    is_company: Optional[bool] = None
    is_customer: Optional[bool] = None
    is_supplier: Optional[bool] = None
    credit_limit: Optional[float] = None
    payment_term: Optional[str] = None

class PartnerResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    vat: Optional[str] = None
    is_company: bool = False
    is_customer: bool = False
    is_supplier: bool = False
    credit_limit: float = 0.0
    payment_term: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PartnerStatsResponse(BaseModel):
    total: int
    customers: int
    suppliers: int
    active: int

class PartnerSearchResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    is_customer: bool
    is_supplier: bool

# ===== FONCTION DE TRANSFORMATION =====
def transform_partner(partner):
    """Transforme un objet Partner en dictionnaire avec valeurs par défaut"""
    created_at = partner.created_at
    if created_at is None:
        created_at = datetime.now()
    
    return {
        "id": partner.id,
        "name": partner.name,
        "email": partner.email if partner.email is not None else None,
        "phone": partner.phone if partner.phone is not None else None,
        "mobile": partner.mobile if partner.mobile is not None else None,
        "address": partner.address if partner.address is not None else None,
        "city": partner.city if partner.city is not None else None,
        "country": partner.country if partner.country is not None else "France",
        "vat": partner.vat if partner.vat is not None else None,
        "is_company": partner.is_company if partner.is_company is not None else False,
        "is_customer": partner.is_customer if partner.is_customer is not None else False,
        "is_supplier": partner.is_supplier if partner.is_supplier is not None else False,
        "credit_limit": partner.credit_limit if partner.credit_limit is not None else 0.0,
        "payment_term": partner.payment_term if partner.payment_term is not None else None,
        "created_at": created_at,
        "updated_at": partner.updated_at if partner.updated_at is not None else None
    }

# ===== ENDPOINTS PRINCIPAUX (ORDRE IMPORTANT) =====
# 1. Routes statiques d'abord
@router.get("/health")
async def health_check():
    """Vérifie que le module partenaires est accessible"""
    return {"status": "ok", "module": "partners", "timestamp": datetime.now().isoformat()}

@router.get("/search", response_model=List[PartnerSearchResponse])
def search_partners(
    query: str = Query(..., min_length=1, description="Terme de recherche"),
    limit: int = Query(10, ge=1, le=50, description="Nombre maximum de résultats"),
    db: Session = Depends(get_db)
):
    """Recherche rapide de partenaires pour les autocomplétions"""
    try:
        partners = db.query(Partner).filter(
            (Partner.name.ilike(f"%{query}%")) |
            (Partner.email.ilike(f"%{query}%")) |
            (Partner.phone.ilike(f"%{query}%")) |
            (Partner.mobile.ilike(f"%{query}%"))
        ).limit(limit).all()
        
        result = []
        for p in partners:
            result.append({
                "id": p.id,
                "name": p.name,
                "email": p.email,
                "phone": p.phone,
                "city": p.city,
                "is_customer": p.is_customer if p.is_customer is not None else False,
                "is_supplier": p.is_supplier if p.is_supplier is not None else False
            })
        return result
    except Exception as e:
        logger.error(f"❌ Erreur search_partners: {e}")
        return []

@router.get("/stats", response_model=PartnerStatsResponse)
def get_partners_stats(db: Session = Depends(get_db)):
    """Récupère les statistiques des partenaires"""
    try:
        total = db.query(Partner).count()
        customers = db.query(Partner).filter(Partner.is_customer == True).count()
        suppliers = db.query(Partner).filter(Partner.is_supplier == True).count()
        
        return {
            "total": total,
            "customers": customers,
            "suppliers": suppliers,
            "active": total
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_partners_stats: {e}")
        return {"total": 0, "customers": 0, "suppliers": 0, "active": 0}

@router.get("/customers", response_model=List[PartnerResponse])
def get_customers(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Récupère uniquement les clients"""
    try:
        query = db.query(Partner).filter(Partner.is_customer == True)
        
        if search:
            query = query.filter(
                (Partner.name.ilike(f"%{search}%")) |
                (Partner.email.ilike(f"%{search}%"))
            )
        
        customers = query.order_by(Partner.name).offset(skip).limit(limit).all()
        
        return [transform_partner(c) for c in customers]
    except Exception as e:
        logger.error(f"❌ Erreur get_customers: {e}")
        return []

@router.get("/suppliers", response_model=List[PartnerResponse])
def get_suppliers(
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Récupère uniquement les fournisseurs"""
    try:
        query = db.query(Partner).filter(Partner.is_supplier == True)
        
        if search:
            query = query.filter(
                (Partner.name.ilike(f"%{search}%")) |
                (Partner.email.ilike(f"%{search}%"))
            )
        
        suppliers = query.order_by(Partner.name).offset(skip).limit(limit).all()
        
        return [transform_partner(s) for s in suppliers]
    except Exception as e:
        logger.error(f"❌ Erreur get_suppliers: {e}")
        return []

# 2. Routes dynamiques ensuite (avec paramètres)
@router.get("/", response_model=List[PartnerResponse])
def get_partners(
    search: Optional[str] = Query(None, description="Recherche par nom ou email"),
    is_customer: Optional[bool] = Query(None, description="Filtrer par type client"),
    is_supplier: Optional[bool] = Query(None, description="Filtrer par type fournisseur"),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum d'éléments"),
    db: Session = Depends(get_db)
):
    """Liste tous les partenaires avec filtres optionnels"""
    try:
        logger.info(f"🔍 Récupération des partenaires - search: {search}")
        
        query = db.query(Partner)
        
        if search:
            query = query.filter(
                (Partner.name.ilike(f"%{search}%")) |
                (Partner.email.ilike(f"%{search}%")) |
                (Partner.phone.ilike(f"%{search}%")) |
                (Partner.mobile.ilike(f"%{search}%"))
            )
        
        if is_customer is not None:
            query = query.filter(Partner.is_customer == is_customer)
        
        if is_supplier is not None:
            query = query.filter(Partner.is_supplier == is_supplier)
        
        partners = query.order_by(Partner.name).offset(skip).limit(limit).all()
        
        logger.info(f"✅ {len(partners)} partenaires trouvés")
        return [transform_partner(p) for p in partners]
    except Exception as e:
        logger.error(f"❌ Erreur get_partners: {e}")
        return []

@router.get("/{partner_id}", response_model=PartnerResponse)
def get_partner(partner_id: int, db: Session = Depends(get_db)):
    """Récupère un partenaire par son ID"""
    try:
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        return transform_partner(partner)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_partner: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération du partenaire")

@router.put("/{partner_id}", response_model=PartnerResponse)
def update_partner(
    partner_id: int, 
    partner_update: PartnerUpdate, 
    db: Session = Depends(get_db)
):
    """Met à jour un partenaire"""
    try:
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        if partner_update.email and partner_update.email != partner.email:
            existing = db.query(Partner).filter(
                Partner.email == partner_update.email,
                Partner.id != partner_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, 
                    detail=f"L'email '{partner_update.email}' est déjà utilisé par un autre partenaire"
                )
        
        update_data = partner_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(partner, key, value)
        
        partner.updated_at = datetime.now()
        db.commit()
        db.refresh(partner)
        return transform_partner(partner)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur update_partner: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la mise à jour du partenaire")

@router.delete("/{partner_id}")
def delete_partner(partner_id: int, db: Session = Depends(get_db)):
    """Supprime un partenaire"""
    try:
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        if not partner:
            raise HTTPException(status_code=404, detail="Partenaire non trouvé")
        
        db.delete(partner)
        db.commit()
        return {"message": "Partenaire supprimé avec succès"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur delete_partner: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la suppression du partenaire")

# ===== ENDPOINTS POST =====
# app/api/partners.py - Modifiez l'endpoint POST
from app.core.dependencies import get_current_active_user
from app.models.auth import User

@router.post("/", response_model=PartnerResponse)
def create_partner(
    partner: PartnerCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Crée un nouveau partenaire"""
    try:
        logger.info(f"📦 Création partenaire: {partner.dict()}")
        logger.info(f"👤 User ID: {current_user.id}, Company ID: {current_user.company_id}")
        
        # Validation explicite
        if not current_user.company_id:
            raise HTTPException(status_code=400, detail="Utilisateur sans entreprise")
        
        # Vérifier si l'email existe déjà
        if partner.email:
            existing = db.query(Partner).filter(Partner.email == partner.email).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Email déjà utilisé: {partner.email}")
        
        # Créer le dictionnaire des données
        partner_data = partner.dict()
        partner_data['company_id'] = current_user.company_id
        
        logger.info(f"💾 Données finales: {partner_data}")
        
        # Création
        db_partner = Partner(**partner_data)
        db.add(db_partner)
        db.commit()
        db.refresh(db_partner)
        
        logger.info(f"✅ Partenaire créé: ID={db_partner.id}, Name={db_partner.name}")
        return transform_partner(db_partner)
        
    except HTTPException as e:
        logger.error(f"❌ HTTPException: {e.status_code} - {e.detail}")
        raise
    except IntegrityError as e:
        db.rollback()
        logger.error(f"❌ IntegrityError: {e}")
        raise HTTPException(status_code=400, detail="Erreur de contrainte unique")
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Exception: {type(e).__name__}: {e}")
        raise HTTPException(status_code=400, detail=str(e))

logger.info("✅ MODULE PARTNERS CHARGÉ AVEC SUCCÈS")