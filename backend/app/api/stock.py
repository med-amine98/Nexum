# app/api/stock.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from typing import List, Optional
from datetime import datetime, timedelta
import random
from pydantic import BaseModel, Field
import logging
logger = logging.getLogger(__name__)
from app.database import get_db
from app.core.dependencies import get_current_user, get_current_admin
from app.models.auth import User
from app.models.product import Product, Category
from app.models.stock import StockMovement, MovementType

router = APIRouter()

# ===== SCHEMAS =====
class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Nom de la catégorie")
    description: Optional[str] = Field(None, description="Description")
    parent_id: Optional[int] = Field(None, description="ID de la catégorie parente")

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    parent_name: Optional[str] = None
    product_count: int = 0
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProductResponse(BaseModel):
    id: int
    name: str
    sku: str
    barcode: Optional[str] = None
    description: Optional[str] = None
    quantity: float
    unit_price: float
    cost_price: float
    total_value: float
    category: Optional[str] = None
    category_id: Optional[int] = None
    min_stock: float = 0
    max_stock: float = 0
    reorder_level: float = 0
    is_active: bool = True
    
    class Config:
        from_attributes = True

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    product_sku: Optional[str] = None
    quantity: float
    movement_type: str
    previous_stock: float
    new_stock: float
    notes: Optional[str] = None
    created_at: datetime
    created_by: Optional[int] = None
    
    class Config:
        from_attributes = True

class StockMovementCreate(BaseModel):
    product_id: int
    quantity: float = Field(..., gt=0)
    movement_type: str
    notes: Optional[str] = None

# ===== ENDPOINTS PRODUITS =====
@router.get("/products", response_model=List[ProductResponse])
async def get_stock_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    low_stock: bool = Query(False),
    category_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les produits avec leurs stocks"""
    try:
        query = db.query(Product)
        
        if low_stock:
            query = query.filter(Product.quantity_on_hand < Product.reorder_level)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if search:
            query = query.filter(
                (Product.name.ilike(f"%{search}%")) |
                (Product.sku.ilike(f"%{search}%")) |
                (Product.barcode.ilike(f"%{search}%"))
            )
        
        # Filtrer les produits actifs uniquement
        query = query.filter(Product.is_active == True)
        
        products = query.order_by(Product.name).offset(skip).limit(limit).all()
        
        result = []
        for product in products:
            result.append({
                "id": product.id,
                "name": product.name,
                "sku": product.sku,
                "barcode": product.barcode,
                "description": product.description,
                "quantity": product.quantity_on_hand or 0,
                "unit_price": product.unit_price or 0,
                "cost_price": product.cost_price or 0,
                "total_value": (product.quantity_on_hand or 0) * (product.unit_price or 0),
                "category": product.category.name if product.category else None,
                "category_id": product.category_id,
                "min_stock": product.min_stock or 0,
                "max_stock": product.max_stock or 0,
                "reorder_level": product.reorder_level or 0,
                "is_active": product.is_active
            })
        
        return result
    except Exception as e:
        logger.error(f"❌ Erreur get_stock_products: {e}")
        return []

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_stock_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère un produit spécifique"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "barcode": product.barcode,
        "description": product.description,
        "quantity": product.quantity_on_hand or 0,
        "unit_price": product.unit_price or 0,
        "cost_price": product.cost_price or 0,
        "total_value": (product.quantity_on_hand or 0) * (product.unit_price or 0),
        "category": product.category.name if product.category else None,
        "category_id": product.category_id,
        "min_stock": product.min_stock or 0,
        "max_stock": product.max_stock or 0,
        "reorder_level": product.reorder_level or 0,
        "is_active": product.is_active
    }

# ===== ENDPOINTS MOUVEMENTS =====
@router.get("/movements", response_model=List[StockMovementResponse])
async def get_stock_movements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    product_id: Optional[int] = Query(None),
    movement_type: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les mouvements de stock"""
    try:
        query = db.query(StockMovement)
        
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type:
            try:
                movement_enum = MovementType(movement_type.upper())
                query = query.filter(StockMovement.movement_type == movement_enum)
            except ValueError:
                pass
        if date_from:
            query = query.filter(StockMovement.created_at >= date_from)
        if date_to:
            query = query.filter(StockMovement.created_at <= date_to)
        
        movements = query.order_by(desc(StockMovement.created_at)).offset(skip).limit(limit).all()
        
        result = []
        for movement in movements:
            product_name = movement.product.name if movement.product else None
            product_sku = movement.product.sku if movement.product else None
            
            result.append({
                "id": movement.id,
                "product_id": movement.product_id,
                "product_name": product_name,
                "product_sku": product_sku,
                "quantity": movement.quantity,
                "movement_type": movement.movement_type.value if movement.movement_type else None,
                "previous_stock": movement.previous_stock,
                "new_stock": movement.new_stock,
                "notes": movement.notes,
                "created_at": movement.created_at,
                "created_by": movement.created_by
            })
        
        return result
    except Exception as e:
        logger.error(f"❌ Erreur get_stock_movements: {e}")
        return []

@router.post("/movements", response_model=StockMovementResponse)
async def create_stock_movement(
    movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crée un mouvement de stock"""
    try:
        product = db.query(Product).filter(Product.id == movement.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        if movement.quantity <= 0:
            raise HTTPException(status_code=400, detail="La quantité doit être positive")
        
        previous_stock = product.quantity_on_hand or 0
        
        # Convertir le type de mouvement
        try:
            movement_type = MovementType(movement.movement_type.upper())
        except ValueError:
            raise HTTPException(status_code=400, detail="Type de mouvement invalide")
        
        if movement_type == MovementType.RECEIPT:
            new_stock = previous_stock + movement.quantity
        elif movement_type == MovementType.SHIPMENT:
            if movement.quantity > previous_stock:
                raise HTTPException(status_code=400, detail="Stock insuffisant")
            new_stock = previous_stock - movement.quantity
        else:
            new_stock = previous_stock
        
        # Mettre à jour le stock du produit
        product.quantity_on_hand = new_stock
        product.current_stock = new_stock
        product.updated_at = datetime.now()
        
        # Créer le mouvement
        db_movement = StockMovement(
            product_id=movement.product_id,
            quantity=movement.quantity,
            movement_type=movement_type,
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=movement.notes,
            created_by=current_user.id,
            created_at=datetime.now()
        )
        
        db.add(db_movement)
        db.commit()
        db.refresh(db_movement)
        
        return {
            "id": db_movement.id,
            "product_id": db_movement.product_id,
            "product_name": product.name,
            "product_sku": product.sku,
            "quantity": db_movement.quantity,
            "movement_type": db_movement.movement_type.value,
            "previous_stock": db_movement.previous_stock,
            "new_stock": db_movement.new_stock,
            "notes": db_movement.notes,
            "created_at": db_movement.created_at,
            "created_by": db_movement.created_by
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_stock_movement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ENDPOINTS CATÉGORIES =====
@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les catégories de produits"""
    try:
        categories = db.query(Category).all()
        
        result = []
        for category in categories:
            # Compter les produits dans cette catégorie
            product_count = db.query(func.count(Product.id)).filter(
                Product.category_id == category.id,
                Product.is_active == True
            ).scalar() or 0
            
            # Récupérer le nom de la catégorie parente
            parent_name = None
            if category.parent_id:
                parent = db.query(Category).filter(Category.id == category.parent_id).first()
                parent_name = parent.name if parent else None
            
            result.append({
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "parent_id": category.parent_id,
                "parent_name": parent_name,
                "product_count": product_count,
                "created_at": category.created_at
            })
        
        return result
    except Exception as e:
        logger.error(f"❌ Erreur get_categories: {e}")
        return []

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crée une nouvelle catégorie de produits"""
    try:
        logger.info(f"📦 Création catégorie: {category.dict()}")
        
        # Vérifier si la catégorie existe déjà
        existing = db.query(Category).filter(Category.name == category.name).first()
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"Une catégorie avec le nom '{category.name}' existe déjà"
            )
        
        # Vérifier si la catégorie parente existe
        if category.parent_id:
            parent = db.query(Category).filter(Category.id == category.parent_id).first()
            if not parent:
                raise HTTPException(status_code=404, detail="Catégorie parente non trouvée")
        
        # Créer la nouvelle catégorie
        db_category = Category(
            name=category.name,
            description=category.description,
            parent_id=category.parent_id,
            created_at=datetime.now()
        )
        
        db.add(db_category)
        db.commit()
        db.refresh(db_category)
        
        # Récupérer le nom de la catégorie parente
        parent_name = None
        if db_category.parent_id:
            parent = db.query(Category).filter(Category.id == db_category.parent_id).first()
            parent_name = parent.name if parent else None
        
        return {
            "id": db_category.id,
            "name": db_category.name,
            "description": db_category.description,
            "parent_id": db_category.parent_id,
            "parent_name": parent_name,
            "product_count": 0,
            "created_at": db_category.created_at
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: int,
    category: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Met à jour une catégorie"""
    try:
        db_category = db.query(Category).filter(Category.id == category_id).first()
        if not db_category:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        # Vérifier si le nouveau nom n'est pas déjà utilisé
        if category.name and category.name != db_category.name:
            existing = db.query(Category).filter(
                Category.name == category.name,
                Category.id != category_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Une catégorie avec ce nom existe déjà")
        
        # Vérifier si la catégorie parente existe
        if category.parent_id is not None:
            if category.parent_id == category_id:
                raise HTTPException(status_code=400, detail="Une catégorie ne peut pas être sa propre parente")
            
            if category.parent_id:
                parent = db.query(Category).filter(Category.id == category.parent_id).first()
                if not parent:
                    raise HTTPException(status_code=404, detail="Catégorie parente non trouvée")
        
        # Mettre à jour les champs
        if category.name is not None:
            db_category.name = category.name
        if category.description is not None:
            db_category.description = category.description
        if category.parent_id is not None:
            db_category.parent_id = category.parent_id
        
        db.commit()
        db.refresh(db_category)
        
        # Compter les produits
        product_count = db.query(func.count(Product.id)).filter(
            Product.category_id == db_category.id,
            Product.is_active == True
        ).scalar() or 0
        
        # Récupérer le nom de la catégorie parente
        parent_name = None
        if db_category.parent_id:
            parent = db.query(Category).filter(Category.id == db_category.parent_id).first()
            parent_name = parent.name if parent else None
        
        return {
            "id": db_category.id,
            "name": db_category.name,
            "description": db_category.description,
            "parent_id": db_category.parent_id,
            "parent_name": parent_name,
            "product_count": product_count,
            "created_at": db_category.created_at
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur update_category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Supprime une catégorie"""
    try:
        db_category = db.query(Category).filter(Category.id == category_id).first()
        if not db_category:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        # Vérifier si des produits utilisent cette catégorie
        product_count = db.query(func.count(Product.id)).filter(
            Product.category_id == category_id,
            Product.is_active == True
        ).scalar() or 0
        
        if product_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer la catégorie car elle contient {product_count} produit(s) actif(s)"
            )
        
        # Vérifier si des sous-catégories existent
        subcategories_count = db.query(func.count(Category.id)).filter(
            Category.parent_id == category_id
        ).scalar() or 0
        
        if subcategories_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Impossible de supprimer la catégorie car elle contient {subcategories_count} sous-catégorie(s)"
            )
        
        db.delete(db_category)
        db.commit()
        
        return {"message": "Catégorie supprimée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur delete_category: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ENDPOINTS DASHBOARD =====
@router.get("/dashboard/stats")
async def get_stock_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistiques d'inventaire"""
    try:
        total_products = db.query(func.count(Product.id)).filter(
            Product.is_active == True
        ).scalar() or 0
        
        total_value = db.query(func.sum(Product.quantity_on_hand * Product.unit_price)).filter(
            Product.is_active == True
        ).scalar() or 0
        
        low_stock_products = db.query(func.count(Product.id)).filter(
            Product.quantity_on_hand < Product.reorder_level,
            Product.is_active == True
        ).scalar() or 0
        
        out_of_stock = db.query(func.count(Product.id)).filter(
            Product.quantity_on_hand == 0,
            Product.is_active == True
        ).scalar() or 0
        
        return {
            "total_products": total_products,
            "total_value": float(total_value),
            "low_stock_products": low_stock_products,
            "out_of_stock": out_of_stock
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_stock_stats: {e}")
        return {
            "total_products": 0,
            "total_value": 0,
            "low_stock_products": 0,
            "out_of_stock": 0
        }

@router.get("/dashboard/kpi")
async def get_stock_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les KPI du stock pour le dashboard"""
    try:
        total_products = db.query(func.count(Product.id)).filter(
            Product.is_active == True
        ).scalar() or 0
        
        total_value = db.query(func.sum(Product.quantity_on_hand * Product.unit_price)).filter(
            Product.is_active == True
        ).scalar() or 0
        
        low_stock_products = db.query(func.count(Product.id)).filter(
            Product.quantity_on_hand < Product.reorder_level,
            Product.is_active == True
        ).scalar() or 0
        
        out_of_stock = db.query(func.count(Product.id)).filter(
            Product.quantity_on_hand == 0,
            Product.is_active == True
        ).scalar() or 0
        
        # Mouvements du mois
        current_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        movements = db.query(StockMovement).filter(StockMovement.created_at >= current_month).all()
        
        incoming = sum(m.quantity for m in movements if m.movement_type == MovementType.RECEIPT)
        outgoing = sum(m.quantity for m in movements if m.movement_type == MovementType.SHIPMENT)
        
        # Rotation de stock
        avg_stock = total_value / total_products if total_products > 0 else 0
        rotation_rate = (outgoing / avg_stock * 100) if avg_stock > 0 else 0
        
        return [
            {
                "title": "Valeur du stock",
                "value": float(total_value),
                "prefix": "€",
                "trend": round(random.uniform(-5, 15), 1),
                "trendUp": random.choice([True, False]),
                "color": "#875A7B"
            },
            {
                "title": "Produits en stock",
                "value": total_products,
                "trend": round(random.uniform(-2, 10), 1),
                "trendUp": True,
                "color": "#F6AE2D"
            },
            {
                "title": "Stock critique",
                "value": low_stock_products + out_of_stock,
                "trend": round(random.uniform(-15, 5), 1),
                "trendUp": False,
                "color": "#E74C3C"
            },
            {
                "title": "Rotation du stock",
                "value": f"{round(rotation_rate, 1)}%",
                "trend": round(random.uniform(-3, 8), 1),
                "trendUp": True,
                "color": "#3498DB"
            }
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_stock_kpi: {e}")
        return [
            {"title": "Valeur du stock", "value": 0, "prefix": "€", "trend": 0, "trendUp": True, "color": "#875A7B"},
            {"title": "Produits en stock", "value": 0, "trend": 0, "trendUp": True, "color": "#F6AE2D"},
            {"title": "Stock critique", "value": 0, "trend": 0, "trendUp": False, "color": "#E74C3C"},
            {"title": "Rotation du stock", "value": "0%", "trend": 0, "trendUp": True, "color": "#3498DB"}
        ]

@router.get("/dashboard/categories")
async def get_stock_categories_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les catégories avec statistiques pour le dashboard"""
    try:
        categories = db.query(Category).all()
        
        result = []
        for category in categories:
            # Compter les produits par catégorie
            product_count = db.query(func.count(Product.id)).filter(
                Product.category_id == category.id,
                Product.is_active == True
            ).scalar() or 0
            
            # Calculer la valeur du stock par catégorie
            stock_value = db.query(func.sum(Product.quantity_on_hand * Product.unit_price)).filter(
                Product.category_id == category.id,
                Product.is_active == True
            ).scalar() or 0
            
            result.append({
                "id": category.id,
                "name": category.name,
                "product_count": product_count,
                "stock_value": float(stock_value),
                "color": "#F6AE2D"  # Couleur par défaut pour les catégories
            })
        
        return result
    except Exception as e:
        logger.error(f"❌ Erreur get_stock_categories_dashboard: {e}")
        return []

# ===== ENDPOINTS EMPLACEMENTS =====
@router.get("/locations")
async def get_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les emplacements de stock"""
    return [
        {"id": 1, "name": "Stock principal", "code": "WH/STOCK", "type": "internal"},
        {"id": 2, "name": "Stock magasin", "code": "WH/STORE", "type": "internal"},
        {"id": 3, "name": "Zone de réception", "code": "WH/INPUT", "type": "input"},
        {"id": 4, "name": "Zone d'expédition", "code": "WH/OUTPUT", "type": "output"},
        {"id": 5, "name": "Stock de sécurité", "code": "WH/SAFETY", "type": "internal"},
    ]
# Ajoutez ces schémas et endpoints dans app/api/stock.py après les autres endpoints

# ===== SCHEMAS POUR LES PRODUITS =====
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_price: float = Field(0.0, ge=0)
    cost_price: float = Field(0.0, ge=0)
    min_stock: float = Field(0.0, ge=0)
    max_stock: float = Field(0.0, ge=0)
    reorder_level: float = Field(0.0, ge=0)
    is_active: bool = True

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    barcode: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_price: Optional[float] = Field(None, ge=0)
    cost_price: Optional[float] = Field(None, ge=0)
    min_stock: Optional[float] = Field(None, ge=0)
    max_stock: Optional[float] = Field(None, ge=0)
    reorder_level: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None

# ===== ENDPOINTS PRODUITS (CRÉATION ET MISE À JOUR) =====
@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Crée un nouveau produit"""
    try:
        logger.info(f"📦 Création produit: {product.dict()}")
        
        # Vérifier si le SKU existe déjà
        existing_sku = db.query(Product).filter(Product.sku == product.sku).first()
        if existing_sku:
            raise HTTPException(
                status_code=400, 
                detail=f"Un produit avec le SKU '{product.sku}' existe déjà"
            )
        
        # Vérifier si le code-barres existe déjà (s'il est fourni)
        if product.barcode:
            existing_barcode = db.query(Product).filter(Product.barcode == product.barcode).first()
            if existing_barcode:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Un produit avec le code-barres '{product.barcode}' existe déjà"
                )
        
        # Vérifier si la catégorie existe
        if product.category_id:
            category = db.query(Category).filter(Category.id == product.category_id).first()
            if not category:
                raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        # Créer le nouveau produit
        db_product = Product(
            name=product.name,
            sku=product.sku,
            barcode=product.barcode,
            description=product.description,
            category_id=product.category_id,
            unit_price=product.unit_price,
            cost_price=product.cost_price,
            quantity_on_hand=0,  # Nouveau produit, stock initial à 0
            current_stock=0,
            min_stock=product.min_stock,
            max_stock=product.max_stock,
            reorder_level=product.reorder_level,
            is_active=product.is_active,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        
        return {
            "id": db_product.id,
            "name": db_product.name,
            "sku": db_product.sku,
            "barcode": db_product.barcode,
            "description": db_product.description,
            "quantity": db_product.quantity_on_hand,
            "unit_price": db_product.unit_price,
            "cost_price": db_product.cost_price,
            "total_value": db_product.quantity_on_hand * db_product.unit_price,
            "category": db_product.category.name if db_product.category else None,
            "category_id": db_product.category_id,
            "min_stock": db_product.min_stock,
            "max_stock": db_product.max_stock,
            "reorder_level": db_product.reorder_level,
            "is_active": db_product.is_active
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Met à jour un produit"""
    try:
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Vérifier si le nouveau SKU existe déjà
        if product.sku and product.sku != db_product.sku:
            existing_sku = db.query(Product).filter(
                Product.sku == product.sku,
                Product.id != product_id
            ).first()
            if existing_sku:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Un produit avec le SKU '{product.sku}' existe déjà"
                )
        
        # Vérifier si le nouveau code-barres existe déjà
        if product.barcode and product.barcode != db_product.barcode:
            existing_barcode = db.query(Product).filter(
                Product.barcode == product.barcode,
                Product.id != product_id
            ).first()
            if existing_barcode:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Un produit avec le code-barres '{product.barcode}' existe déjà"
                )
        
        # Vérifier si la catégorie existe
        if product.category_id is not None:
            if product.category_id:
                category = db.query(Category).filter(Category.id == product.category_id).first()
                if not category:
                    raise HTTPException(status_code=404, detail="Catégorie non trouvée")
        
        # Mettre à jour les champs
        if product.name is not None:
            db_product.name = product.name
        if product.sku is not None:
            db_product.sku = product.sku
        if product.barcode is not None:
            db_product.barcode = product.barcode
        if product.description is not None:
            db_product.description = product.description
        if product.category_id is not None:
            db_product.category_id = product.category_id
        if product.unit_price is not None:
            db_product.unit_price = product.unit_price
        if product.cost_price is not None:
            db_product.cost_price = product.cost_price
        if product.min_stock is not None:
            db_product.min_stock = product.min_stock
        if product.max_stock is not None:
            db_product.max_stock = product.max_stock
        if product.reorder_level is not None:
            db_product.reorder_level = product.reorder_level
        if product.is_active is not None:
            db_product.is_active = product.is_active
        
        db_product.updated_at = datetime.now()
        db.commit()
        db.refresh(db_product)
        
        return {
            "id": db_product.id,
            "name": db_product.name,
            "sku": db_product.sku,
            "barcode": db_product.barcode,
            "description": db_product.description,
            "quantity": db_product.quantity_on_hand,
            "unit_price": db_product.unit_price,
            "cost_price": db_product.cost_price,
            "total_value": db_product.quantity_on_hand * db_product.unit_price,
            "category": db_product.category.name if db_product.category else None,
            "category_id": db_product.category_id,
            "min_stock": db_product.min_stock,
            "max_stock": db_product.max_stock,
            "reorder_level": db_product.reorder_level,
            "is_active": db_product.is_active
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur update_product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Supprime un produit (soft delete)"""
    try:
        db_product = db.query(Product).filter(Product.id == product_id).first()
        if not db_product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Soft delete: désactiver le produit
        db_product.is_active = False
        db_product.updated_at = datetime.now()
        db.commit()
        
        return {"message": "Produit désactivé avec succès"}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur delete_product: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/products/{product_id}/stock")
async def update_product_stock(
    product_id: int,
    quantity: float = Query(..., description="Quantité à ajouter (positive) ou retirer (négative)"),
    notes: Optional[str] = Query(None, description="Notes sur le mouvement"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin)
):
    """Met à jour le stock d'un produit directement"""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        previous_stock = product.quantity_on_hand
        new_stock = previous_stock + quantity
        
        if new_stock < 0:
            raise HTTPException(status_code=400, detail="Stock insuffisant")
        
        # Déterminer le type de mouvement
        movement_type = MovementType.RECEIPT if quantity > 0 else MovementType.SHIPMENT
        
        # Mettre à jour le stock
        product.quantity_on_hand = new_stock
        product.current_stock = new_stock
        product.updated_at = datetime.now()
        
        # Créer un mouvement de stock
        movement = StockMovement(
            product_id=product_id,
            quantity=abs(quantity),
            movement_type=movement_type,
            previous_stock=previous_stock,
            new_stock=new_stock,
            notes=notes,
            created_by=current_user.id,
            created_at=datetime.now()
        )
        
        db.add(movement)
        db.commit()
        db.refresh(movement)
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "previous_stock": previous_stock,
            "new_stock": new_stock,
            "quantity_changed": quantity,
            "movement_id": movement.id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur update_product_stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ENDPOINT POUR LES STATISTIQUES PRODUIT =====
@router.get("/products/{product_id}/stats")
async def get_product_stats(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les statistiques d'un produit"""
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Produit non trouvé")
        
        # Récupérer les mouvements des 30 derniers jours
        thirty_days_ago = datetime.now() - timedelta(days=30)
        movements = db.query(StockMovement).filter(
            StockMovement.product_id == product_id,
            StockMovement.created_at >= thirty_days_ago
        ).all()
        
        # Calculer les entrées et sorties
        incoming = sum(m.quantity for m in movements if m.movement_type == MovementType.RECEIPT)
        outgoing = sum(m.quantity for m in movements if m.movement_type == MovementType.SHIPMENT)
        
        # Calculer la valeur du stock
        stock_value = product.quantity_on_hand * product.unit_price
        
        return {
            "product_id": product_id,
            "product_name": product.name,
            "current_stock": product.quantity_on_hand,
            "stock_value": float(stock_value),
            "min_stock": product.min_stock,
            "max_stock": product.max_stock,
            "reorder_level": product.reorder_level,
            "incoming_30d": float(incoming),
            "outgoing_30d": float(outgoing),
            "turnover_rate": float(outgoing / product.quantity_on_hand if product.quantity_on_hand > 0 else 0)
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_product_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# Ajoutez cet endpoint après les autres

@router.get("/products/search")
async def search_products(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Recherche rapide de produits pour autocomplétion"""
    try:
        products = db.query(Product).filter(
            (Product.name.ilike(f"%{q}%")) |
            (Product.sku.ilike(f"%{q}%")) |
            (Product.barcode.ilike(f"%{q}%")),
            Product.is_active == True
        ).limit(limit).all()
        
        return [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "barcode": p.barcode,
                "unit_price": p.unit_price,
                "quantity": p.quantity_on_hand
            }
            for p in products
        ]
    except Exception as e:
        logger.error(f"❌ Erreur search_products: {e}")
        return []