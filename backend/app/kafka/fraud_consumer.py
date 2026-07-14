# app/kafka/fraud_consumer.py
"""
Consommateur Kafka pour les transactions
"""

import json
import logging
import asyncio
from kafka import KafkaConsumer
from typing import Dict, Any
from datetime import datetime

from app.core.config import settings
from app.services.fraud_classifier import fraud_classifier

logger = logging.getLogger(__name__)

class FraudConsumer:
    """Consommateur Kafka pour les transactions"""
    
    def __init__(self):
        self.consumer = None
        self.topic = settings.KAFKA_TOPIC_TRANSACTIONS
        self.group_id = settings.KAFKA_CONSUMER_GROUP
        self.bootstrap_servers = settings.KAFKA_BOOTSTRAP_SERVERS
        self.running = False
        logger.info(f"📨 FraudConsumer initialisé: {self.topic}")
    
    async def start(self):
        """Démarre le consommateur"""
        try:
            self.consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=[self.bootstrap_servers],
                group_id=self.group_id,
                auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
                enable_auto_commit=settings.KAFKA_ENABLE_AUTO_COMMIT,
                value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                consumer_timeout_ms=settings.KAFKA_CONSUMER_TIMEOUT_MS,
                api_version_auto_timeout_ms=5000
            )
            
            self.running = True
            logger.info(f"✅ FraudConsumer démarré sur {self.topic}")
            
            while self.running:
                for message in self.consumer:
                    if not self.running:
                        break
                    
                    transaction = message.value
                    await self.process_transaction(transaction)
                    
        except Exception as e:
            logger.error(f"❌ Erreur consumer: {e}")
            self.running = False
    
    async def process_transaction(self, transaction: Dict[str, Any]):
        """Traite une transaction"""
        try:
            result = await fraud_classifier.classify_transaction(transaction)
            
            if result.get("fraud_detected"):
                logger.info(f"🚨 FRAUDE: {result.get('fraud_type_name')} - {result.get('transaction_id')}")
            
        except Exception as e:
            logger.error(f"❌ Erreur traitement: {e}")
    
    def stop(self):
        """Arrête le consommateur"""
        self.running = False
        if self.consumer:
            self.consumer.close()
            logger.info("🛑 FraudConsumer arrêté")

# Instance globale
fraud_consumer = FraudConsumer()