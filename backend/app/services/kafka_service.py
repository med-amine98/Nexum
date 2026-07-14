# app/services/kafka_service.py - Correction des configs
"""
Service Kafka - Connexion réelle au conteneur neura-kafka
"""

import json
import logging
from typing import Dict, Any, Optional, List
from kafka import KafkaProducer, KafkaConsumer, KafkaAdminClient
from kafka.admin import NewTopic
from kafka.errors import TopicAlreadyExistsError
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

class KafkaService:
    """Service Kafka pour l'envoi et la réception de messages"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS
        self.producer = None
        self.admin_client = None
        self.is_connected = False
        self._connect()
        logger.info(f"✅ KafkaService initialisé ({self.bootstrap_servers})")
    
    def _connect(self):
        """Connecte à Kafka - VERSION CORRIGÉE"""
        try:
            # ✅ Supprimer api_version_auto_timeout_ms qui n'est pas reconnu
            self.producer = KafkaProducer(
                bootstrap_servers=[self.bootstrap_servers],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks=1,
                request_timeout_ms=10000,
                retries=3
            )
            
            # Créer l'admin client
            self.admin_client = KafkaAdminClient(
                bootstrap_servers=[self.bootstrap_servers],
                request_timeout_ms=10000
            )
            
            self.is_connected = True
            logger.info(f"✅ Connecté à Kafka sur {self.bootstrap_servers}")
            
        except Exception as e:
            logger.error(f"❌ Erreur connexion Kafka: {e}")
            self.is_connected = False
    
    def ensure_topics(self, topics: List[str]):
        """Crée les topics s'ils n'existent pas"""
        if not self.is_connected:
            self._connect()
            if not self.is_connected:
                return
        
        try:
            existing_topics = self.admin_client.list_topics()
            new_topics = []
            
            for topic in topics:
                if topic not in existing_topics:
                    new_topics.append(NewTopic(
                        name=topic,
                        num_partitions=3,
                        replication_factor=1
                    ))
            
            if new_topics:
                self.admin_client.create_topics(new_topics)
                logger.info(f"✅ Topics créés: {[t.name for t in new_topics]}")
                
        except TopicAlreadyExistsError:
            pass
        except Exception as e:
            logger.error(f"❌ Erreur création topics: {e}")
    
    def send_transaction(self, transaction: Dict[str, Any]) -> bool:
        """Envoie une transaction au topic Kafka"""
        if not self.is_connected or not self.producer:
            self._connect()
            if not self.is_connected or not self.producer:
                return False
        
        try:
            future = self.producer.send(
                settings.KAFKA_TOPIC_TRANSACTIONS,
                value=transaction
            )
            result = future.get(timeout=10)
            logger.debug(f"✅ Transaction envoyée: {transaction.get('transaction_id')}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur envoi Kafka: {e}")
            return False
    
    def send_alert(self, alert: Dict[str, Any]) -> bool:
        """Envoie une alerte au topic Kafka"""
        if not self.is_connected or not self.producer:
            self._connect()
            if not self.is_connected or not self.producer:
                return False
        
        try:
            future = self.producer.send(
                settings.KAFKA_TOPIC_ALERTS,
                value=alert
            )
            future.get(timeout=10)
            logger.info(f"✅ Alerte envoyée: {alert.get('transaction_id')}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur envoi alerte: {e}")
            return False
    
    def send_analytics(self, data: Dict[str, Any]) -> bool:
        """Envoie des données d'analytics"""
        if not self.is_connected or not self.producer:
            return False
        
        try:
            future = self.producer.send(
                settings.KAFKA_TOPIC_ANALYTICS,
                value=data
            )
            future.get(timeout=10)
            return True
        except Exception as e:
            logger.error(f"❌ Erreur envoi analytics: {e}")
            return False

# Instance globale
kafka_service = KafkaService()