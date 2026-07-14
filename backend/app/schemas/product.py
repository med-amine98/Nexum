from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# ================== CATÉGORIES ==================
class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = "#3498db"
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================== EMPLACEMENTS ==================
class LocationBase(BaseModel):
    code: str
    name: str
    zone: Optional[str] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    zone: Optional[str] = None
    aisle: Optional[str] = None
    rack: Optional[str] = None
    level: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class LocationResponse(LocationBase):
    id: int
    active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================== PRODUITS ==================
class ProductBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    category_id: int
    location_id: Optional[int] = None
    purchase_price: float = 0
    selling_price: float = 0
    current_stock: int = 0
    min_stock: int = 5
    max_stock: int = 100
    reorder_point: int = 10
    unit: str = "pcs"
    barcode: Optional[str] = None
    is_dangerous: bool = False
    is_fragile: bool = False

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    purchase_price: Optional[float] = None
    selling_price: Optional[float] = None
    current_stock: Optional[int] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    reorder_point: Optional[int] = None
    unit: Optional[str] = None
    barcode: Optional[str] = None
    is_dangerous: Optional[bool] = None
    is_fragile: Optional[bool] = None
    active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    stock_status: str
    stock_value: float
    category: Optional[CategoryResponse] = None
    location: Optional[LocationResponse] = None
    # Rendre ces champs optionnels avec des valeurs par défaut
    reorder_point: Optional[int] = 10
    unit: Optional[str] = "pcs"
    is_dangerous: Optional[bool] = False
    is_fragile: Optional[bool] = False
    
    class Config:
        from_attributes = True

# ================== FILTRES ==================
class StockFilterParams(BaseModel):
    category_id: Optional[int] = None
    location_id: Optional[int] = None
    status: Optional[str] = None
    search: Optional[str] = None
    low_stock: Optional[bool] = False