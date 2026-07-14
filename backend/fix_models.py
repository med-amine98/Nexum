import sys
import os
import logging
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import clear_mappers, sessionmaker

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_all_models():
    """Force le rechargement de tous les modèles"""
    logger.info("=" * 60)
    logger.info("🔧 CORRECTION DES MODÈLES SQLALCHEMY")
    logger.info("=" * 60)
    
    try:
        # Importer tous les modèles
        from app.database import Base, engine
        from app.models import (
            # Produits et Stock
            Product, Category, Location, StockMovement,
            # Ventes
            SaleOrder, SaleOrderLine,
            # Achats
            PurchaseOrder, PurchaseOrderLine,
            # Comptabilité
            Invoice, Payment, Tax,
            # RH
            Employee, Leave, Department,
            # Partenaires
            Partner, Supplier,
            # Risques
            Risk, RiskIncident, RiskAction,
            # Notifications
            Notification,
            # Fraude
            FraudAlert, FraudRule, FraudCase, TransactionHistory,
            # Blockchain
            Block, Transaction, Node, SmartContract,
            # Insights
            Insight, Keyword, PerformanceMetric, MarketTrend,
            # Prédictions
            SalesPrediction, MetricPrediction, PredictionModel, PredictionResult,
            # Performance
            SystemMetric, ServiceStatus, PerformanceHistory, RequestLog, ErrorLog, Alert,
            # Authentification
            User, Company, UserSession, PasswordReset, EmailVerification, AuditLog,
            # Modules
            Module, ModuleCategory, ModuleTag, UserModule,
            # Fraude Bancaire
            FraudTransaction, FraudBankingAlert, FraudBankingRule, FraudBankingStats,
            # Fraude Assurance
            FraudInsuranceClaim, FraudInsuranceIndicator, FraudInsuranceRule, FraudInsuranceNetwork,
            # Profile
            ProfileActivity,
            # Credit Scoring
            CreditRequest, CreditHistory, CreditRule
        )
        
        logger.info(f"✅ Modèles importés: {len(Base.metadata.tables)}")
        
        # Vider le cache
        clear_mappers()
        logger.info("✅ Cache des mappings vidé")
        
        # Recréer les métadonnées
        Base.metadata.clear()
        logger.info("✅ Métadonnées vidées")
        
        # Recréer toutes les tables (optionnel)
        Base.metadata.create_all(bind=engine)
        logger.info("✅ Tables recréées avec succès")
        
        # Vérifier les tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        logger.info(f"📊 Tables dans la base: {len(tables)}")
        
        # Vérifier spécifiquement les tables problématiques
        for table in ['insights', 'sales_predictions', 'metric_predictions', 'credit_requests']:
            if table in tables:
                columns = inspector.get_columns(table)
                logger.info(f"   • {table}: {len(columns)} colonnes")
        
        logger.info("=" * 60)
        logger.info("✅ CORRECTION TERMINÉE")
        logger.info("=" * 60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    fix_all_models()
