import sys
import os
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Simple setup to match the REAL app schema
Base = declarative_base()

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False)
    icon = Column(String(50), nullable=False)
    path = Column(String(100), nullable=False)
    version = Column(String(20), default="1.0.0")
    author = Column(String(100), nullable=True)
    fields_count = Column(Integer, default=0)
    relations = Column(JSON, default=[])
    usage_percent = Column(Integer, default=0)
    tags = Column(JSON, default=[])
    color = Column(String(20), default="#1890ff")
    badge = Column(String(20), nullable=True)
    badge_color = Column(String(20), nullable=True)
    highlight = Column(Boolean, default=False)
    stats = Column(JSON, default={"totalRecords": 0, "avgResponse": "0ms", "queries": 0})
    documentation_url = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True)
    is_favorite = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    last_update = Column(DateTime, default=datetime.utcnow)

class UserModule(Base):
    __tablename__ = "user_modules"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    module_id = Column(Integer, nullable=False)
    is_favorite = Column(Boolean, default=False)
    is_installed = Column(Boolean, default=True)
    company_id = Column(Integer, nullable=True, index=True)
    installed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

# Database connection
DATABASE_URL = "postgresql://odoo:odoo@localhost:5432/erp"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed():
    # DROP existing tables to fix schema
    logger.info("Dropping and recreating tables...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS user_modules CASCADE"))
        conn.execute(text("DROP TABLE IF EXISTS modules CASCADE"))
        conn.commit()

    Base.metadata.create_all(engine)
    db = SessionLocal()
    try:
        # ALL MODULES FROM SIDEBAR.JS
        modules_data = [
            # Core Business
            {"key": "dashboard", "name": "Tableau de bord", "icon": "DashboardOutlined", "path": "/dashboard", "category": "business", "color": "#1890ff"},
            {"key": "sale", "name": "Ventes", "icon": "ShoppingOutlined", "path": "/sale", "category": "business", "color": "#52c41a"},
            {"key": "purchase", "name": "Achats", "icon": "ShoppingCartOutlined", "path": "/purchase", "category": "business", "color": "#fa8c16"},
            {"key": "crm", "name": "CRM", "icon": "TeamOutlined", "path": "/crm", "category": "business", "color": "#722ed1"},
            {"key": "account", "name": "Comptabilité", "icon": "WalletOutlined", "path": "/account", "category": "business", "color": "#13c2c2"},
            {"key": "stock", "name": "Stock", "icon": "DatabaseOutlined", "path": "/stock", "category": "business", "color": "#eb2f96"},
            {"key": "hr", "name": "RH", "icon": "UserOutlined", "path": "/hr", "category": "business", "color": "#faad14"},
            {"key": "project", "name": "Projets", "icon": "ProjectOutlined", "path": "/project", "category": "business", "color": "#2f54eb"},
            
            # IA & Innovation
            {"key": "ai-assistant", "name": "Assistant IA", "icon": "RobotOutlined", "path": "/ai/assistant", "category": "ai", "color": "#52c41a"},
            {"key": "predictive-analytics", "name": "Analytics Prédictif", "icon": "FundOutlined", "path": "/analytics/predictive", "category": "ai", "color": "#722ed1"},
            {"key": "fraud-detection", "name": "Anti-Fraude IA", "icon": "SafetyCertificateOutlined", "path": "/security/fraud", "category": "ai", "color": "#f5222d"},
            {"key": "risk-management", "name": "Gestion des Risques", "icon": "AlertOutlined", "path": "/risk/management", "category": "ai", "color": "#fa8c16"},
            {"key": "business-insights", "name": "Business Insights", "icon": "BulbOutlined", "path": "/insights/business", "category": "ai", "color": "#faad14"},
            
            # IA Générative
            {"key": "ai-report-generator", "name": "Génération Rapports IA", "icon": "FileTextOutlined", "path": "/ai/report-generator", "category": "aiGenerative", "color": "#667eea"},
            {"key": "ai-quote-generator", "name": "Génération Devis IA", "icon": "DollarOutlined", "path": "/ai/quote-generator", "category": "aiGenerative", "color": "#52c41a"},
            
            # Support IA
            {"key": "ticket-auto-resolve", "name": "Support Auto-Résolu", "icon": "CustomerServiceOutlined", "path": "/support/auto-resolve", "category": "aiSupport", "color": "#1890ff"},
            {"key": "call-analysis", "name": "Analyse Appels Clients", "icon": "PhoneOutlined", "path": "/call-analytics", "category": "aiSupport", "color": "#1890ff"},
            
            # Assurance IA
            {"key": "claim-auto-declaration", "name": "Déclaration Sinistre Auto", "icon": "CameraOutlined", "path": "/claims/declaration", "category": "insuranceAi", "color": "#fb923c"},
            {"key": "claim-real-time-tracking", "name": "Suivi Sinistre", "icon": "ClockCircleOutlined", "path": "/claims/tracking-list", "category": "insuranceAi", "color": "#13c2c2"},
            {"key": "damage-auto-estimation", "name": "Estimation Dommages", "icon": "EuroOutlined", "path": "/claims/estimation", "category": "insuranceAi", "color": "#fb923c"},
            {"key": "coverage-recommendation", "name": "Recommandation Garanties", "icon": "SafetyCertificateOutlined", "path": "/insurance/warranties", "category": "insuranceAi", "color": "#52c41a"},
            {"key": "loss-prevention", "name": "Prévention Sinistres", "icon": "WarningOutlined", "path": "/insurance/prevention", "category": "insuranceAi", "color": "#fb923c"},
            
            # Entreprise IA
            {"key": "omnichannel-portal", "name": "Portail Omnicanal", "icon": "GlobalOutlined", "path": "/customer/omnichannel", "category": "enterpriseAi", "color": "#722ed1"},
            
            # Technologies
            {"key": "performance-monitor", "name": "Performance Monitor", "icon": "ThunderboltOutlined", "path": "/performance/monitor", "category": "advanced", "color": "#1890ff"},
            {"key": "blockchain", "name": "Blockchain", "icon": "NodeIndexOutlined", "path": "/blockchain", "category": "advanced", "color": "#2f54eb"},
            {"key": "ocr", "name": "OCR Documents", "icon": "ScanOutlined", "path": "/ocr", "category": "advanced", "color": "#8c8c8c"},
            
            # Utilitaires
            {"key": "settings", "name": "Paramètres", "icon": "SettingOutlined", "path": "/settings", "category": "utilities", "color": "#8c8c8c"},
            
            # Banque & Assurance
            {"key": "credit-scoring", "name": "Credit Scoring IA", "icon": "FundFilled", "path": "/banking/credit-scoring", "category": "banking", "color": "#1890ff"},
            {"key": "fraud-detection-banking", "name": "Détection Fraude", "icon": "SafetyCertificateFilled", "path": "/banking/fraud-detection", "category": "banking", "color": "#f5222d"},
            {"key": "aml-compliance", "name": "Anti-Blanchiment", "icon": "SafetyCertificateOutlined", "path": "/banking/aml", "category": "banking", "color": "#722ed1"},
            {"key": "churn-prediction-banking", "name": "Prédiction Attrition", "icon": "FallOutlined", "path": "/banking/churn-prediction", "category": "banking", "color": "#ff4d4f"},
            {"key": "kyc-automation", "name": "KYC Automatisé", "icon": "ScanOutlined", "path": "/banking/kyc", "category": "banking", "color": "#52c41a"},
            {"key": "claims-processing", "name": "Traitement Sinistres", "icon": "FileTextOutlined", "path": "/insurance/claims", "category": "banking", "color": "#fa8c16"},
            {"key": "fraud-detection-insurance", "name": "Fraude Assurance", "icon": "SafetyCertificateFilled", "path": "/insurance/fraud-detection", "category": "banking", "color": "#f5222d"},
            {"key": "risk-scoring-insurance", "name": "Scoring des Risques", "icon": "FundOutlined", "path": "/insurance/risk-scoring", "category": "banking", "color": "#eb2f96"},
            {"key": "catastrophe-modeling", "name": "Modélisation Catastrophes", "icon": "WarningOutlined", "path": "/insurance/catastrophe", "category": "banking", "color": "#fb923c"},
            {"key": "document-intelligence", "name": "Intelligence Documentaire", "icon": "BookOutlined", "path": "/shared/document-intelligence", "category": "banking", "color": "#1890ff"},
            
            # Dashboards Clients
            {"key": "banking-dashboard", "name": "Dashboard Banque", "icon": "BankOutlined", "path": "/banking-dashboard", "category": "clients", "color": "#1890ff"},
            {"key": "insurance-dashboard", "name": "Dashboard Assurance", "icon": "InsuranceOutlined", "path": "/insurance-dashboard", "category": "clients", "color": "#1890ff"},
            {"key": "enterprise-dashboard", "name": "Dashboard Entreprise", "icon": "ApartmentOutlined", "path": "/enterprise-dashboard", "category": "clients", "color": "#fb923c"},
        ]

        for m_data in modules_data:
            module = Module(**m_data, version="1.0.0", author="NEXUM")
            db.add(module)
        
        db.commit()
        logger.info(f"Successfully seeded {len(modules_data)} modules!")
    except Exception as e:
        logger.error(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
