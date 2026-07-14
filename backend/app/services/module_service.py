from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import json

from app.models.module import Module, ModuleCategory, ModuleTag, UserModule
from app.schemas.module import (
    ModuleCreate, ModuleUpdate, ModuleInDB,
    ModuleCategoryCreate, ModuleTagCreate,
    UserModuleCreate, UserModuleUpdate,
    ModulesResponse, ModuleWithUserData
)

class ModuleService:
    def __init__(self, db: Session):
        self.db = db

    # ========== MODULES ==========
    def get_all_modules(self, 
                        category: Optional[str] = None,
                        search: Optional[str] = None,
                        sort_by: str = "name",
                        sort_order: str = "asc",
                        user_id: Optional[int] = None) -> List[ModuleWithUserData]:
        """Récupère tous les modules avec les préférences utilisateur"""
        
        query = self.db.query(Module).filter(Module.is_active == True)
        
        # Filtre par catégorie
        if category and category != "all":
            query = query.filter(Module.category.ilike(f"%{category}%"))
        
        # Recherche
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Module.name.ilike(search_term)) |
                (Module.description.ilike(search_term)) |
                (Module.tags.any(search_term))
            )
        
        # Tri
        if sort_by == "name":
            order_column = Module.name
        elif sort_by == "usage":
            order_column = Module.usage_percent
        elif sort_by == "fields":
            order_column = Module.fields_count
        elif sort_by == "date":
            order_column = Module.last_update
        else:
            order_column = Module.name
        
        if sort_order == "asc":
            query = query.order_by(order_column.asc())
        else:
            query = query.order_by(order_column.desc())
        
        modules = query.all()
        
        # Ajouter les données utilisateur si user_id est fourni
        result = []
        for module in modules:
            module_data = ModuleWithUserData.model_validate(module)
            
            if user_id:
                user_module = self.db.query(UserModule).filter(
                    UserModule.user_id == user_id,
                    UserModule.module_id == module.id
                ).first()
                
                if user_module:
                    module_data.user_favorite = user_module.is_favorite
                    module_data.user_installed = user_module.is_installed
                    module_data.user_paid = user_module.is_paid

            result.append(module_data)
        
        return result

    def get_module(self, module_id: int) -> Optional[Module]:
        """Récupère un module par son ID"""
        return self.db.query(Module).filter(Module.id == module_id).first()

    def get_module_by_key(self, key: str) -> Optional[Module]:
        """Récupère un module par sa clé"""
        return self.db.query(Module).filter(Module.key == key).first()

    def create_module(self, module: ModuleCreate) -> Module:
        """Crée un nouveau module"""
        db_module = Module(**module.model_dump())
        self.db.add(db_module)
        self.db.commit()
        self.db.refresh(db_module)
        return db_module

    def update_module(self, module_id: int, module_update: ModuleUpdate) -> Optional[Module]:
        """Met à jour un module"""
        module = self.get_module(module_id)
        if not module:
            return None
        
        for key, value in module_update.model_dump(exclude_unset=True).items():
            setattr(module, key, value)
        
        module.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(module)
        return module

    def delete_module(self, module_id: int) -> bool:
        """Supprime un module (soft delete)"""
        module = self.get_module(module_id)
        if not module:
            return False
        
        module.is_active = False
        self.db.commit()
        return True

    # ========== PRÉFÉRENCES UTILISATEUR ==========
    def get_user_modules(self, user_id: int) -> List[UserModule]:
        """Récupère les préférences de l'utilisateur pour les modules"""
        return self.db.query(UserModule).filter(
            UserModule.user_id == user_id
        ).all()

    def toggle_favorite(self, user_id: int, module_id: int) -> Optional[UserModule]:
        """Ajoute/retire un module des favoris"""
        user_module = self.db.query(UserModule).filter(
            UserModule.user_id == user_id,
            UserModule.module_id == module_id
        ).first()
        
        if user_module:
            user_module.is_favorite = not user_module.is_favorite
        else:
            user_module = UserModule(
                user_id=user_id,
                module_id=module_id,
                is_favorite=True
            )
            self.db.add(user_module)
        
        self.db.commit()
        self.db.refresh(user_module)
        return user_module

    def toggle_installed(self, user_id: int, module_key_or_id: Any, company_id: int = None) -> Optional[UserModule]:
        """Installe/désinstalle un module pour l'utilisateur (via ID ou Clé)"""
        # Résoudre le module_id si une clé est fournie
        module_id = None
        if isinstance(module_key_or_id, int) or (isinstance(module_key_or_id, str) and module_key_or_id.isdigit()):
            module_id = int(module_key_or_id)
        else:
            module = self.get_module_by_key(str(module_key_or_id))
            if module:
                module_id = module.id
        
        if not module_id:
            return None

        query = self.db.query(UserModule).filter(UserModule.module_id == module_id)
        if company_id:
            query = query.filter(UserModule.company_id == company_id)
        else:
            query = query.filter(UserModule.user_id == user_id)
        
        user_module = query.first()
        
        if user_module:
            user_module.is_installed = not user_module.is_installed
            if company_id: user_module.company_id = company_id
        else:
            user_module = UserModule(
                user_id=user_id,
                module_id=module_id,
                is_installed=True,
                company_id=company_id
            )
            self.db.add(user_module)
        
        self.db.commit()
        self.db.refresh(user_module)
        return user_module
    def buy_module(self, user_id: int, module_key_or_id: Any, company_id: int = None) -> Optional[UserModule]:
        """Achète un module pour l'utilisateur (via ID ou Clé)"""
        module_id = None
        if isinstance(module_key_or_id, int) or (isinstance(module_key_or_id, str) and module_key_or_id.isdigit()):
            module_id = int(module_key_or_id)
        else:
            module = self.get_module_by_key(str(module_key_or_id))
            if module:
                module_id = module.id
        
        if not module_id:
            return None

        query = self.db.query(UserModule).filter(UserModule.module_id == module_id)
        if company_id:
            query = query.filter(UserModule.company_id == company_id)
        else:
            query = query.filter(UserModule.user_id == user_id)
            
        user_module = query.first()
        
        if user_module:
            user_module.is_paid = True
            user_module.is_installed = True
            user_module.payment_date = datetime.utcnow()
            if company_id: user_module.company_id = company_id
        else:
            user_module = UserModule(
                user_id=user_id,
                module_id=module_id,
                is_paid=True,
                is_installed=True,
                payment_date=datetime.utcnow(),
                company_id=company_id
            )
            self.db.add(user_module)
        
        self.db.commit()
        self.db.refresh(user_module)
        return user_module


    def get_installed_module_keys(self, company_id: Optional[int]) -> List[str]:
        """Récupère les clés des modules installés pour une entreprise"""
        # On ne bloque plus si company_id est None, car on veut pouvoir gérer 
        # les installations liées à un compte sans entreprise (ou company_id=None)
            
        installed = self.db.query(Module.key).join(
            UserModule, UserModule.module_id == Module.id
        ).filter(
            UserModule.company_id == company_id,
            UserModule.is_installed == True
        ).all()
        
        keys = [r[0] for r in installed]
        if "dashboard" not in keys:
            keys.append("dashboard")
            
        return keys

    # ========== CATÉGORIES ==========
    def get_all_categories(self) -> List[ModuleCategory]:
        """Récupère toutes les catégories"""
        return self.db.query(ModuleCategory).order_by(
            ModuleCategory.order_index
        ).all()

    def create_category(self, category: ModuleCategoryCreate) -> ModuleCategory:
        """Crée une nouvelle catégorie"""
        db_category = ModuleCategory(**category.model_dump())
        self.db.add(db_category)
        self.db.commit()
        self.db.refresh(db_category)
        return db_category

    # ========== TAGS ==========
    def get_all_tags(self) -> List[ModuleTag]:
        """Récupère tous les tags"""
        return self.db.query(ModuleTag).all()

    def create_tag(self, tag: ModuleTagCreate) -> ModuleTag:
        """Crée un nouveau tag"""
        db_tag = ModuleTag(**tag.model_dump())
        self.db.add(db_tag)
        self.db.commit()
        self.db.refresh(db_tag)
        return db_tag

    # ========== STATISTIQUES ==========
    def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques globales"""
        total_modules = self.db.query(Module).count()
        total_categories = self.db.query(ModuleCategory).count()
        total_tags = self.db.query(ModuleTag).count()
        
        # Modules par catégorie
        modules_by_category = self.db.query(
            Module.category, func.count(Module.id)
        ).group_by(Module.category).all()
        
        # Modules les plus utilisés
        top_modules = self.db.query(Module).order_by(
            Module.usage_percent.desc()
        ).limit(5).all()
        
        return {
            "total_modules": total_modules,
            "total_categories": total_categories,
            "total_tags": total_tags,
            "modules_by_category": dict(modules_by_category),
            "top_modules": [
                {"name": m.name, "usage": m.usage_percent}
                for m in top_modules
            ]
        }

    # ========== DASHBOARD ==========
    def get_dashboard_data(self, user_id: Optional[int] = None) -> ModulesResponse:
        """Récupère toutes les données pour le dashboard"""
        modules = self.get_all_modules(user_id=user_id)
        categories = self.get_all_categories()
        tags = self.get_all_tags()
        stats = self.get_stats()
        
        return ModulesResponse(
            modules=modules,
            categories=categories,
            tags=tags,
            stats=stats
        )

    # ========== INITIALISATION ==========
    def seed_initial_data(self):
        """Initialise les données de test avec tous les modules du frontend"""
        
        # Créer les catégories
        categories = [
            {"name": "core business", "display_name": "Core Business", "color": "#0052cc", "icon": "ShopOutlined", "order_index": 1},
            {"name": "ia générative", "display_name": "IA Générative", "color": "#00a3c4", "icon": "RobotOutlined", "order_index": 2},
            {"name": "support ia", "display_name": "Support IA", "color": "#2a3448", "icon": "CustomerServiceOutlined", "order_index": 3},
            {"name": "assurance ia", "display_name": "Assurance IA", "color": "#0052cc", "icon": "SafetyCertificateOutlined", "order_index": 4},
            {"name": "entreprise ia", "display_name": "Entreprise IA", "color": "#003d99", "icon": "GlobalOutlined", "order_index": 5},
            {"name": "finance ia", "display_name": "Finance IA", "color": "#0052cc", "icon": "RobotFilled", "order_index": 6},
            {"name": "technologies", "display_name": "Technologies", "color": "#e67e22", "icon": "ThunderboltOutlined", "order_index": 7},
            {"name": "utilitaires", "display_name": "Utilitaires", "color": "#7a8b9f", "icon": "SettingOutlined", "order_index": 8},
            {"name": "banque", "display_name": "Banque", "color": "#0052cc", "icon": "BankOutlined", "order_index": 9},
            {"name": "assurance", "display_name": "Assurance", "color": "#00a3c4", "icon": "InsuranceOutlined", "order_index": 10},
            {"name": "assistants ia", "display_name": "Assistants IA", "color": "#27ae60", "icon": "RobotFilled", "order_index": 11},
            {"name": "dashboards clients", "display_name": "Dashboards Clients", "color": "#3498db", "icon": "DashboardFilled", "order_index": 12},
        ]
        
        for cat_data in categories:
            existing = self.db.query(ModuleCategory).filter(
                ModuleCategory.name == cat_data["name"]
            ).first()
            if not existing:
                self.db.add(ModuleCategory(**cat_data))
                
        modules = [
            {
                        "key": "dashboard",
                        "name": "Tableau de bord",
                        "description": "Vue d\\",
                        "category": "Core Business",
                        "icon": "DashboardOutlined",
                        "path": "/dashboard",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 24,
                        "usage_percent": 95,
                        "color": "#1890ff"
            },
            {
                        "key": "sale",
                        "name": "Ventes",
                        "description": "Gestion compl\u00e8te des ventes, commandes et devis",
                        "category": "Core Business",
                        "icon": "ShoppingOutlined",
                        "path": "/sale",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 32,
                        "usage_percent": 92,
                        "color": "#52c41a"
            },
            {
                        "key": "purchase",
                        "name": "Achats",
                        "description": "Gestion des achats, commandes fournisseurs et approvisionnements",
                        "category": "Core Business",
                        "icon": "ShoppingCartOutlined",
                        "path": "/purchase",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 28,
                        "usage_percent": 78,
                        "color": "#faad14"
            },
            {
                        "key": "crm",
                        "name": "CRM",
                        "description": "Gestion de la relation client, prospects et opportunit\u00e9s",
                        "category": "Core Business",
                        "icon": "TeamOutlined",
                        "path": "/crm",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 36,
                        "usage_percent": 88,
                        "color": "#722ed1"
            },
            {
                        "key": "account",
                        "name": "Comptabilit\u00e9",
                        "description": "Gestion comptable, facturation, paiements et rapports financiers",
                        "category": "Core Business",
                        "icon": "WalletOutlined",
                        "path": "/account",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 42,
                        "usage_percent": 85,
                        "color": "#13c2c2"
            },
            {
                        "key": "stock",
                        "name": "Stock",
                        "description": "Gestion des stocks, inventaires et mouvements de produits",
                        "category": "Core Business",
                        "icon": "DatabaseOutlined",
                        "path": "/stock",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 26,
                        "usage_percent": 82,
                        "color": "#fa8c16"
            },
            {
                        "key": "hr",
                        "name": "RH",
                        "description": "Gestion des ressources humaines, employ\u00e9s, cong\u00e9s et paie",
                        "category": "Core Business",
                        "icon": "UserOutlined",
                        "path": "/hr",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 38,
                        "usage_percent": 76,
                        "color": "#eb2f96"
            },
            {
                        "key": "project",
                        "name": "Projets",
                        "description": "Gestion de projets, t\u00e2ches, ressources et suivi",
                        "category": "Core Business",
                        "icon": "ProjectOutlined",
                        "path": "/project",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 34,
                        "usage_percent": 71,
                        "color": "#2f54eb"
            },
            {
                        "key": "ai-report-generator",
                        "name": "G\u00e9n\u00e9ration Auto de Rapports IA",
                        "description": "Cr\u00e9ez des rapports complexes en langage naturel. L\\",
                        "category": "IA G\u00e9n\u00e9rative",
                        "icon": "FileTextOutlined",
                        "path": "/ai/report-generator",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 56,
                        "usage_percent": 97,
                        "color": "#667eea"
            },
            {
                        "key": "ai-quote-generator",
                        "name": "G\u00e9n\u00e9ration Auto de Devis IA",
                        "description": "G\u00e9n\u00e9rez des devis professionnels en une seconde. L\\",
                        "category": "IA G\u00e9n\u00e9rative",
                        "icon": "DollarOutlined",
                        "path": "/ai/quote-generator",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 48,
                        "usage_percent": 98,
                        "color": "#52c41a"
            },
            {
                        "key": "ticket-auto-resolve",
                        "name": "Ticket Support Auto-R\u00e9solu",
                        "description": "Moteur de r\u00e9solution intelligent qui analyse la documentation technique et l\\",
                        "category": "Support IA",
                        "icon": "CustomerServiceOutlined",
                        "path": "/support/auto-resolve",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 42,
                        "usage_percent": 96,
                        "color": "#1890ff"
            },
            {
                        "key": "call-analysis",
                        "name": "Analyse des Appels Clients",
                        "description": "Extraction automatique d\\",
                        "category": "Support IA",
                        "icon": "PhoneOutlined",
                        "path": "/call-analytics",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 38,
                        "usage_percent": 94,
                        "color": "#722ed1"
            },
            {
                        "key": "claim-auto-declaration",
                        "name": "D\u00e9claration Sinistre Automatis\u00e9e",
                        "description": "D\u00e9clarez un sinistre en 30 secondes. L\\",
                        "category": "Assurance IA",
                        "icon": "CameraOutlined",
                        "path": "/claims/declaration",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 52,
                        "usage_percent": 97,
                        "color": "#fa8c16"
            },
            {
                        "key": "claim-real-time-tracking",
                        "name": "Suivi Sinistre en Temps R\u00e9el",
                        "description": "Timeline interactive avec estimations de d\u00e9lais et notifications intelligentes.",
                        "category": "Assurance IA",
                        "icon": "ClockCircleOutlined",
                        "path": "/claims/tracking/1",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 34,
                        "usage_percent": 95,
                        "color": "#13c2c2"
            },
            {
                        "key": "damage-auto-estimation",
                        "name": "Estimation Auto des Dommages",
                        "description": "Estimation imm\u00e9diate des d\u00e9g\u00e2ts et devis de r\u00e9paration instantan\u00e9.",
                        "category": "Assurance IA",
                        "icon": "EuroOutlined",
                        "path": "/claims/estimation",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 46,
                        "usage_percent": 96,
                        "color": "#52c41a"
            },
            {
                        "key": "coverage-recommendation",
                        "name": "Recommandation Garanties Personnalis\u00e9es",
                        "description": "Proposez les garanties adapt\u00e9es \u00e0 chaque client pour un upsell intelligent.",
                        "category": "Assurance IA",
                        "icon": "SafetyCertificateOutlined",
                        "path": "/insurance/warranties",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 44,
                        "usage_percent": 93,
                        "color": "#eb2f96"
            },
            {
                        "key": "loss-prevention",
                        "name": "Pr\u00e9vention des Sinistres",
                        "description": "Conseils proactifs pour \u00e9viter les sinistres avec donn\u00e9es m\u00e9t\u00e9o et IoT.",
                        "category": "Assurance IA",
                        "icon": "WarningOutlined",
                        "path": "/insurance/prevention",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 38,
                        "usage_percent": 88,
                        "color": "#ff4d4f"
            },
            {
                        "key": "medical-assistant",
                        "name": "Assistant M\u00e9dical Virtuel",
                        "description": "Aide aux d\u00e9marches m\u00e9dicales. L\\",
                        "category": "Assurance IA",
                        "icon": "MedicineBoxOutlined",
                        "path": "/health/assistant",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 48,
                        "usage_percent": 91,
                        "color": "#2f54eb"
            },
            {
                        "key": "omnichannel-portal",
                        "name": "Portail Client Omnicanal",
                        "description": "Exp\u00e9rience unifi\u00e9e sur tous les canaux avec un profil client unique.",
                        "category": "Entreprise IA",
                        "icon": "GlobalOutlined",
                        "path": "/customer/omnichannel",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 64,
                        "usage_percent": 98,
                        "color": "#722ed1"
            },
            {
                        "key": "robo-advisor",
                        "name": "Conseiller Financier Automatis\u00e9",
                        "description": "Robo-advisor pour l\\",
                        "category": "Finance IA",
                        "icon": "RobotFilled",
                        "path": "/finance/robo-advisor",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 56,
                        "usage_percent": 94,
                        "color": "#1890ff"
            },
            {
                        "key": "performance-monitor",
                        "name": "Performance Monitor",
                        "description": "Monitoring des performances syst\u00e8me en temps r\u00e9el",
                        "category": "Technologies",
                        "icon": "ThunderboltOutlined",
                        "path": "/performance/monitor",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 32,
                        "usage_percent": 93,
                        "color": "#1890ff"
            },
            {
                        "key": "blockchain",
                        "name": "Blockchain",
                        "description": "Tra\u00e7abilit\u00e9 et blockchain pour les transactions s\u00e9curis\u00e9es",
                        "category": "Technologies",
                        "icon": "NodeIndexOutlined",
                        "path": "/blockchain",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 28,
                        "usage_percent": 67,
                        "color": "#2f54eb"
            },
            {
                        "key": "ocr",
                        "name": "OCR Documents",
                        "description": "Reconnaissance optique de caract\u00e8res pour documents scann\u00e9s",
                        "category": "Utilitaires",
                        "icon": "ScanOutlined",
                        "path": "/ocr",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 18,
                        "usage_percent": 72,
                        "color": "#8c8c8c"
            },
            {
                        "key": "settings",
                        "name": "Param\u00e8tres",
                        "description": "Configuration du syst\u00e8me et param\u00e8tres utilisateur",
                        "category": "Utilitaires",
                        "icon": "SettingOutlined",
                        "path": "/settings",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 45,
                        "usage_percent": 100,
                        "color": "#595959"
            },
            {
                        "key": "credit-scoring",
                        "name": "Credit Scoring IA",
                        "description": "\u00c9valuation automatis\u00e9e de la solvabilit\u00e9 des clients",
                        "category": "Banque",
                        "icon": "FundFilled",
                        "path": "/banking/credit-scoring",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 48,
                        "usage_percent": 96,
                        "color": "#1890ff"
            },
            {
                        "key": "fraud-detection-banking",
                        "name": "D\u00e9tection Fraude Bancaire",
                        "description": "D\u00e9tection en temps r\u00e9el des transactions frauduleuses",
                        "category": "Banque",
                        "icon": "SafetyCertificateFilled",
                        "path": "/banking/fraud-detection",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 62,
                        "usage_percent": 98,
                        "color": "#f5222d"
            },
            {
                        "key": "aml-compliance",
                        "name": "Anti-Blanchiment (AML)",
                        "description": "D\u00e9tection des sch\u00e9mas de blanchiment d\\",
                        "category": "Banque",
                        "icon": "SafetyCertificateOutlined",
                        "path": "/banking/aml",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 54,
                        "usage_percent": 94,
                        "color": "#722ed1"
            },
            {
                        "key": "churn-prediction-banking",
                        "name": "Pr\u00e9diction Attrition Clients",
                        "description": "Pr\u00e9diction des d\u00e9parts clients avec alertes pr\u00e9coces",
                        "category": "Banque",
                        "icon": "FallOutlined",
                        "path": "/banking/churn-prediction",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 42,
                        "usage_percent": 91,
                        "color": "#ff4d4f"
            },
            {
                        "key": "kyc-automation",
                        "name": "KYC Automatis\u00e9",
                        "description": "V\u00e9rification d\\",
                        "category": "Banque",
                        "icon": "ScanOutlined",
                        "path": "/banking/kyc",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 28,
                        "usage_percent": 97,
                        "color": "#52c41a"
            },
            {
                        "key": "investment-recommendation",
                        "name": "Recommandation Investissements",
                        "description": "Recommandations personnalis\u00e9es d\\",
                        "category": "Banque",
                        "icon": "LineChartOutlined",
                        "path": "/banking/investment",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 46,
                        "usage_percent": 89,
                        "color": "#13c2c2"
            },
            {
                        "key": "claims-processing",
                        "name": "Traitement des Sinistres",
                        "description": "Automatisation du traitement des d\u00e9clarations de sinistres",
                        "category": "Assurance",
                        "icon": "FileTextOutlined",
                        "path": "/insurance/claims",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 46,
                        "usage_percent": 95,
                        "color": "#fa8c16"
            },
            {
                        "key": "fraud-detection-insurance",
                        "name": "D\u00e9tection Fraude Assurance",
                        "description": "D\u00e9tection des fraudes \u00e0 l\\",
                        "category": "Assurance",
                        "icon": "SafetyCertificateFilled",
                        "path": "/insurance/fraud-detection",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 52,
                        "usage_percent": 96,
                        "color": "#f5222d"
            },
            {
                        "key": "risk-scoring-insurance",
                        "name": "Scoring des Risques",
                        "description": "Scoring des risques clients pour la tarification",
                        "category": "Assurance",
                        "icon": "FundOutlined",
                        "path": "/insurance/risk-scoring",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 44,
                        "usage_percent": 93,
                        "color": "#eb2f96"
            },
            {
                        "key": "catastrophe-modeling",
                        "name": "Mod\u00e9lisation Catastrophes",
                        "description": "Mod\u00e9lisation des risques de catastrophes naturelles",
                        "category": "Assurance",
                        "icon": "WarningOutlined",
                        "path": "/insurance/catastrophe",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 48,
                        "usage_percent": 76,
                        "color": "#fa8c16"
            },
            {
                        "key": "document-intelligence",
                        "name": "Intelligence Documentaire",
                        "description": "Extraction et analyse automatique des documents",
                        "category": "Assurance",
                        "icon": "BookOutlined",
                        "path": "/shared/document-intelligence",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 28,
                        "usage_percent": 99,
                        "color": "#595959"
            },
            {
                        "key": "assistant-predict",
                        "name": "Assistant Pr\u00e9dictif",
                        "description": "Assistant IA sp\u00e9cialis\u00e9 dans les pr\u00e9dictions",
                        "category": "Assistants IA",
                        "icon": "RobotFilled",
                        "path": "/assistant/predict",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 15,
                        "usage_percent": 85,
                        "color": "#667eea"
            },
            {
                        "key": "assistant-risk",
                        "name": "Assistant Risques",
                        "description": "Assistant IA pour l\\",
                        "category": "Assistants IA",
                        "icon": "SafetyCertificateFilled",
                        "path": "/assistant/risk",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 18,
                        "usage_percent": 82,
                        "color": "#f5222d"
            },
            {
                        "key": "assistant-growth",
                        "name": "Assistant Croissance",
                        "description": "Assistant IA pour la strat\u00e9gie commerciale",
                        "category": "Assistants IA",
                        "icon": "RiseOutlined",
                        "path": "/assistant/growth",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 16,
                        "usage_percent": 88,
                        "color": "#52c41a"
            },
            {
                        "key": "banking-dashboard",
                        "name": "Dashboard Banque",
                        "description": "Tableau de bord intelligent pour les banques",
                        "category": "Dashboards Clients",
                        "icon": "BankOutlined",
                        "path": "/banking-dashboard",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 78,
                        "usage_percent": 97,
                        "color": "#1890ff"
            },
            {
                        "key": "insurance-dashboard",
                        "name": "Dashboard Assurance",
                        "description": "Dashboard sp\u00e9cialis\u00e9 pour les assurances",
                        "category": "Dashboards Clients",
                        "icon": "InsuranceOutlined",
                        "path": "/insurance-dashboard",
                        "version": "1.0.0",
                        "author": "\u00c9quipe Nexum",
                        "fields_count": 82,
                        "usage_percent": 96,
                        "color": "#52c41a"
            },
            {
                        "key": "enterprise-dashboard",
                        "name": "Dashboard Entreprise",
                        "description": "Tableau de bord complet pour les entreprises",
                        "category": "Dashboards Clients",
                        "icon": "ApartmentOutlined",
                        "path": "/enterprise-dashboard",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 94,
                        "usage_percent": 99,
                        "color": "#722ed1"
            },
            {
                        "key": "fraud-bank-3d",
                        "name": "Lutte Fraude 3D",
                        "description": "Visualisation 3D immersive et détection des réseaux de blanchiment d'argent (AML) en temps réel.",
                        "category": "Banque",
                        "icon": "BankOutlined",
                        "path": "/intelligence/fraud-bank-3d",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 68,
                        "usage_percent": 98,
                        "color": "#f5222d"
            },
            {
                        "key": "damage-estimation-3d",
                        "name": "Sinistres 3D",
                        "description": "Estimation automatique et modélisation interactive 3D des dommages sur les véhicules sinistrés.",
                        "category": "Assurance",
                        "icon": "CarOutlined",
                        "path": "/intelligence/damage-estimation-3d",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 72,
                        "usage_percent": 97,
                        "color": "#fa8c16"
            },
            {
                        "key": "climate-risk-3d",
                        "name": "Climat 3D",
                        "description": "Simulation interactive 3D des risques climatiques et impact sur les actifs assurés (zones inondables).",
                        "category": "Assurance",
                        "icon": "GlobalOutlined",
                        "path": "/intelligence/climate-risk-3d",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 65,
                        "usage_percent": 95,
                        "color": "#1890ff"
            },
            {
                        "key": "fraud-rings-3d",
                        "name": "Réseaux Fraude",
                        "description": "Cartographie interactive 3D des réseaux de fraude organisée entre prestataires et assurés.",
                        "category": "Assurance",
                        "icon": "NodeIndexOutlined",
                        "path": "/intelligence/fraud-rings-3d",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 74,
                        "usage_percent": 96,
                        "color": "#722ed1"
            },
            {
                        "key": "talent-mapping-3d",
                        "name": "Talents 3D",
                        "description": "Cartographie interactive 3D des compétences et analyse du vivier de talents de l'entreprise (HR Analytics).",
                        "category": "Core Business",
                        "icon": "TeamOutlined",
                        "path": "/intelligence/talent-mapping-3d",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 59,
                        "usage_percent": 94,
                        "color": "#eb2f96"
            },
            {
                        "key": "cyber-shield",
                        "name": "Cyber-Shield",
                        "description": "Monitoring cyber-guerre et sécurité en temps réel",
                        "category": "Technologies",
                        "icon": "SecurityScanOutlined",
                        "path": "/intelligence/cyber-shield",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 82,
                        "usage_percent": 94,
                        "color": "#00d1ff",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            },
            {
                        "key": "digital-twin",
                        "name": "3D Digital Twin",
                        "description": "Jumeau numérique immersif et modélisation 3D de l'entreprise",
                        "category": "Technologies",
                        "icon": "DeploymentUnitOutlined",
                        "path": "/intelligence/digital-twin",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 75,
                        "usage_percent": 91,
                        "color": "#00d1ff",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            },
            {
                        "key": "nexum-agents",
                        "name": "Nexum Agents",
                        "description": "Flotte d'agents IA autonomes et orchestration LLM",
                        "category": "IA Générative",
                        "icon": "RobotOutlined",
                        "path": "/intelligence/agents",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 64,
                        "usage_percent": 95,
                        "color": "#722ed1",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            },
            {
                        "key": "esg-tracker",
                        "name": "ESG Tracker",
                        "description": "Indice carbone, durabilité et suivi des critères ESG",
                        "category": "Entreprise IA",
                        "icon": "EnvironmentOutlined",
                        "path": "/intelligence/esg",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 48,
                        "usage_percent": 88,
                        "color": "#52c41a",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            },
            {
                        "key": "nexum-predict",
                        "name": "Nexum Predict",
                        "description": "BI générative, prévisions IA et analytiques avancées",
                        "category": "IA Générative",
                        "icon": "BulbOutlined",
                        "path": "/intelligence/predict",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 70,
                        "usage_percent": 93,
                        "color": "#667eea",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            },
            {
                        "key": "smart-claims",
                        "name": "Smart-Claims",
                        "description": "Blockchain Smart Contracts d'indemnisation et règlement",
                        "category": "Assurance IA",
                        "icon": "NodeIndexOutlined",
                        "path": "/intelligence/smart-claims",
                        "version": "1.0.0",
                        "author": "Équipe Nexum",
                        "fields_count": 55,
                        "usage_percent": 92,
                        "color": "#52c41a",
                        "is_free": False,
                        "price": 199.0,
                        "currency": "MAD"
            }
]
        
        for module_data in modules:
            existing = self.db.query(Module).filter(
                Module.key == module_data["key"]
            ).first()
            if not existing:
                self.db.add(Module(**module_data))
            else:
                # Mettre à jour les champs existants si nécessaire (prix, is_free, etc.)
                for k, v in module_data.items():
                    setattr(existing, k, v)
        
        self.db.commit()