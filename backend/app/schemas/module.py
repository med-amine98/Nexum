from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ModuleStats(BaseModel):
    totalRecords: int = 0
    avgResponse: str = "0ms"
    queries: int = 0

class ModuleBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    category: str
    icon: str
    path: str
    version: str = "1.0.0"
    author: Optional[str] = None
    fields_count: int = 0
    relations: List[str] = []
    usage_percent: int = 0
    tags: List[str] = []
    color: str = "#1890ff"
    badge: Optional[str] = None
    badge_color: Optional[str] = None
    highlight: bool = False
    stats: ModuleStats = ModuleStats()
    documentation_url: Optional[str] = None
    is_free: bool = True
    price: float = 0.0
    currency: str = "EUR"

class ModuleCreate(ModuleBase):
    pass

class ModuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    version: Optional[str] = None
    author: Optional[str] = None
    fields_count: Optional[int] = None
    relations: Optional[List[str]] = None
    usage_percent: Optional[int] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None
    badge: Optional[str] = None
    badge_color: Optional[str] = None
    highlight: Optional[bool] = None
    stats: Optional[ModuleStats] = None
    documentation_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_favorite: Optional[bool] = None
    is_installed: Optional[bool] = None

class ModuleInDB(ModuleBase):
    id: int
    is_active: bool
    is_favorite: bool
    is_installed: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_update: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ModuleCategoryBase(BaseModel):
    name: str
    display_name: str
    description: Optional[str] = None
    color: str = "#1890ff"
    icon: Optional[str] = None
    order_index: int = 0

class ModuleCategoryCreate(ModuleCategoryBase):
    pass

class ModuleCategoryInDB(ModuleCategoryBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ModuleTagBase(BaseModel):
    name: str
    color: str = "processing"

class ModuleTagCreate(ModuleTagBase):
    pass

class ModuleTagInDB(ModuleTagBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class UserModuleBase(BaseModel):
    user_id: int
    module_id: int
    is_favorite: bool = False
    is_installed: bool = True

class UserModuleCreate(UserModuleBase):
    pass

class UserModuleUpdate(BaseModel):
    is_favorite: Optional[bool] = None
    is_installed: Optional[bool] = None

class UserModuleInDB(UserModuleBase):
    id: int
    is_paid: bool = False
    payment_date: Optional[datetime] = None
    installed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ModuleWithUserData(ModuleInDB):
    user_favorite: bool = False
    user_installed: bool = False
    user_paid: bool = False

class ModulesResponse(BaseModel):
    modules: List[ModuleWithUserData]
    categories: List[ModuleCategoryInDB]
    tags: List[ModuleTagInDB]
    stats: Dict[str, Any]