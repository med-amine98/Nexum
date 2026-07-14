# backend/app/services/mongo_unified_service.py - Version corrigée
from datetime import datetime
import logging
from typing import Dict, List, Any, Optional

# Import conditionnel pour éviter les erreurs de linting
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, OperationFailure
    PY_MONGO_AVAILABLE = True
except ImportError:
    PY_MONGO_AVAILABLE = False
    MongoClient = None
    ConnectionFailure = None
    OperationFailure = None

logger = logging.getLogger(__name__)

class MongoDBUnifiedService:
    """Service MongoDB unifié pour tous les secteurs"""
    
    def __init__(self):
        if not PY_MONGO_AVAILABLE:
            logger.warning("⚠️ pymongo n'est pas installé, le service MongoDB sera désactivé")
            self.enabled = False
            return
        
        self.enabled = True
        try:
            self.client = MongoClient(
                'mongodb://admin:password@neura-mongodb:27017',
                serverSelectionTimeoutMS=5000
            )
            # Vérifier la connexion
            self.client.admin.command('ping')
            
            # Bases de données par secteur
            self.db_banking = self.client['nexum_banking']
            self.db_enterprise = self.client['nexum_enterprise']
            self.db_insurance = self.client['nexum_insurance']
            self.db_common = self.client['nexum_common']
            
            # Collections Banque
            self.banking_transactions = self.db_banking['transactions']
            self.banking_accounts = self.db_banking['accounts']
            self.banking_alerts = self.db_banking['fraud_alerts']
            
            # Collections Entreprise
            self.enterprise_employees = self.db_enterprise['employees']
            self.enterprise_projects = self.db_enterprise['projects']
            self.enterprise_products = self.db_enterprise['products']
            self.enterprise_orders = self.db_enterprise['orders']
            self.enterprise_stock = self.db_enterprise['stock_alerts']
            
            # Collections Assurance
            self.insurance_policies = self.db_insurance['policies']
            self.insurance_claims = self.db_insurance['claims']
            self.insurance_clients = self.db_insurance['clients']
            self.insurance_payments = self.db_insurance['payments']
            
            # Collections communes
            self.common_logs = self.db_common['system_logs']
            self.common_metrics = self.db_common['performance_metrics']
            self.common_models = self.db_common['ml_models']
            
            logger.info("✅ MongoDB Unified Service initialisé")
        except Exception as e:
            logger.error(f"❌ Erreur de connexion MongoDB: {e}")
            self.enabled = False
    
    # ============================================
    # MÉTHODES BANQUE
    # ============================================
    
    def save_banking_transaction(self, transaction: Dict) -> Optional[str]:
        """Sauvegarde une transaction bancaire"""
        if not self.enabled:
            return None
        try:
            result = self.banking_transactions.insert_one({
                **transaction,
                'timestamp': datetime.now(),
                'sector': 'banking'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde transaction: {e}")
            return None
    
    def get_banking_transactions(self, limit: int = 100, filter_dict: Dict = None) -> List[Dict]:
        """Récupère les transactions bancaires"""
        if not self.enabled:
            return []
        try:
            query = filter_dict or {}
            return list(self.banking_transactions.find(query).sort('timestamp', -1).limit(limit))
        except Exception as e:
            logger.error(f"Erreur récupération transactions: {e}")
            return []
    
    def create_banking_alert(self, transaction: Dict, severity: str, reason: str) -> Optional[str]:
        """Crée une alerte de fraude bancaire"""
        if not self.enabled:
            return None
        try:
            result = self.banking_alerts.insert_one({
                'transaction_id': transaction.get('transaction_id'),
                'amount': transaction.get('amount'),
                'severity': severity,
                'reason': reason,
                'status': 'open',
                'timestamp': datetime.now(),
                'sector': 'banking'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur création alerte: {e}")
            return None
    
    # ============================================
    # MÉTHODES ENTREPRISE
    # ============================================
    
    def save_employee(self, employee: Dict) -> Optional[str]:
        """Sauvegarde un employé"""
        if not self.enabled:
            return None
        try:
            result = self.enterprise_employees.insert_one({
                **employee,
                'created_at': datetime.now(),
                'sector': 'enterprise'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde employé: {e}")
            return None
    
    def save_project(self, project: Dict) -> Optional[str]:
        """Sauvegarde un projet"""
        if not self.enabled:
            return None
        try:
            result = self.enterprise_projects.insert_one({
                **project,
                'created_at': datetime.now(),
                'sector': 'enterprise'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde projet: {e}")
            return None
    
    def save_product(self, product: Dict) -> Optional[str]:
        """Sauvegarde un produit"""
        if not self.enabled:
            return None
        try:
            result = self.enterprise_products.insert_one({
                **product,
                'created_at': datetime.now(),
                'sector': 'enterprise'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde produit: {e}")
            return None
    
    def save_order(self, order: Dict) -> Optional[str]:
        """Sauvegarde une commande"""
        if not self.enabled:
            return None
        try:
            result = self.enterprise_orders.insert_one({
                **order,
                'order_date': datetime.now(),
                'sector': 'enterprise'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde commande: {e}")
            return None
    
    # ============================================
    # MÉTHODES ASSURANCE
    # ============================================
    
    def save_policy(self, policy: Dict) -> Optional[str]:
        """Sauvegarde un contrat d'assurance"""
        if not self.enabled:
            return None
        try:
            result = self.insurance_policies.insert_one({
                **policy,
                'created_at': datetime.now(),
                'sector': 'insurance'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde contrat: {e}")
            return None
    
    def save_claim(self, claim: Dict) -> Optional[str]:
        """Sauvegarde un sinistre"""
        if not self.enabled:
            return None
        try:
            result = self.insurance_claims.insert_one({
                **claim,
                'created_at': datetime.now(),
                'sector': 'insurance'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde sinistre: {e}")
            return None
    
    def get_claims(self, limit: int = 100, filter_dict: Dict = None) -> List[Dict]:
        """Récupère les sinistres"""
        if not self.enabled:
            return []
        try:
            query = filter_dict or {}
            return list(self.insurance_claims.find(query).sort('timestamp', -1).limit(limit))
        except Exception as e:
            logger.error(f"Erreur récupération sinistres: {e}")
            return []
    
    def save_insurance_client(self, client: Dict) -> Optional[str]:
        """Sauvegarde un client d'assurance"""
        if not self.enabled:
            return None
        try:
            result = self.insurance_clients.insert_one({
                **client,
                'created_at': datetime.now(),
                'sector': 'insurance'
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur sauvegarde client: {e}")
            return None
    
    # ============================================
    # MÉTHODES COMMUNES
    # ============================================
    
    def log_system_event(self, level: str, component: str, message: str, details: Dict = None) -> Optional[str]:
        """Log un événement système"""
        if not self.enabled:
            return None
        try:
            result = self.common_logs.insert_one({
                'level': level,
                'component': component,
                'message': message,
                'details': details or {},
                'timestamp': datetime.now()
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur log: {e}")
            return None
    
    def record_metric(self, component: str, metric: str, value: float, sector: str, unit: str = 'ms') -> Optional[str]:
        """Enregistre une métrique de performance"""
        if not self.enabled:
            return None
        try:
            result = self.common_metrics.insert_one({
                'component': component,
                'metric': metric,
                'value': value,
                'unit': unit,
                'sector': sector,
                'timestamp': datetime.now()
            })
            return str(result.inserted_id)
        except Exception as e:
            logger.error(f"Erreur enregistrement métrique: {e}")
            return None
    
    # ============================================
    # MÉTHODES STATISTIQUES
    # ============================================
    
    def get_sector_stats(self) -> Dict:
        """Récupère les statistiques par secteur"""
        if not self.enabled:
            return {}
        try:
            return {
                'banking': {
                    'transactions': self.banking_transactions.count_documents({}),
                    'alerts': self.banking_alerts.count_documents({}),
                    'accounts': self.banking_accounts.count_documents({})
                },
                'enterprise': {
                    'employees': self.enterprise_employees.count_documents({}),
                    'projects': self.enterprise_projects.count_documents({}),
                    'products': self.enterprise_products.count_documents({}),
                    'orders': self.enterprise_orders.count_documents({})
                },
                'insurance': {
                    'policies': self.insurance_policies.count_documents({}),
                    'claims': self.insurance_claims.count_documents({}),
                    'clients': self.insurance_clients.count_documents({}),
                    'payments': self.insurance_payments.count_documents({})
                }
            }
        except Exception as e:
            logger.error(f"Erreur statistiques: {e}")
            return {}

# Instance globale
mongo_service = MongoDBUnifiedService()