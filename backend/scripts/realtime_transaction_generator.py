# backend/scripts/realtime_transaction_generator.py
"""
Générateur de transactions en temps réel pour le pipeline anti-fraude
Ce script génère des transactions et les envoie dans Kafka pour traitement complet
"""

import json
import random
import time
import uuid
from datetime import datetime
from kafka import KafkaProducer
import redis
import threading
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration - MODIFIÉ POUR WINDOWS
# Utilise localhost au lieu de kafka (nom du conteneur Docker)
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')
TOPIC_RAW = 'transactions-raw'
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = 6379

class RealtimeTransactionGenerator:
    def __init__(self):
        try:
            logger.info(f"Tentative de connexion à Kafka sur {KAFKA_BOOTSTRAP_SERVERS}")
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                max_block_ms=10000,  # Timeout de connexion
                request_timeout_ms=10000,
                api_version_auto_timeout_ms=10000
            )
            logger.info(f"✅ Connecté à Kafka sur {KAFKA_BOOTSTRAP_SERVERS}")
        except Exception as e:
            logger.error(f"❌ Impossible de se connecter à Kafka: {e}")
            logger.info("Assurez-vous que Kafka est en cours d'exécution sur localhost:9092")
            raise
        
        try:
            logger.info(f"Tentative de connexion à Redis sur {REDIS_HOST}:{REDIS_PORT}")
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=0,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Tester la connexion Redis
            self.redis_client.ping()
            logger.info(f"✅ Connecté à Redis sur {REDIS_HOST}:{REDIS_PORT}")
        except Exception as e:
            logger.warning(f"⚠️ Impossible de se connecter à Redis: {e}")
            logger.info("Continuer sans Redis (les statistiques ne seront pas sauvegardées)")
            self.redis_client = None
            
        self.running = True
        self.transaction_count = 0
        self.fraud_count = 0
        
    def generate_transaction(self):
        """Génère une transaction aléatoire avec différents patterns de fraude"""
        
        # Patterns de fraude avec probabilités
        fraud_patterns = [
            {"name": "normal", "probability": 0.65, "amount_range": (10, 500), "risk": "low"},
            {"name": "high_amount", "probability": 0.15, "amount_range": (5000, 20000), "risk": "medium"},
            {"name": "structuring", "probability": 0.05, "amount_range": (8000, 10000), "risk": "high"},
            {"name": "circular", "probability": 0.05, "amount_range": (1000, 5000), "risk": "high"},
            {"name": "velocity", "probability": 0.05, "amount_range": (500, 2000), "risk": "medium"},
            {"name": "mule", "probability": 0.03, "amount_range": (10000, 50000), "risk": "critical"},
            {"name": "identity_theft", "probability": 0.02, "amount_range": (5000, 25000), "risk": "critical"}
        ]
        
        # Sélectionner un pattern
        pattern = random.choices(
            fraud_patterns,
            weights=[p["probability"] for p in fraud_patterns]
        )[0]
        
        is_fraudulent = pattern["name"] != "normal"
        amount = random.uniform(pattern["amount_range"][0], pattern["amount_range"][1])
        
        # IP suspectes pour les fraudes
        suspicious_ips = [
            f"185.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            f"94.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            f"213.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        ]
        
        normal_ips = [
            f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
            f"10.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
        ]
        
        # Devices suspects
        suspicious_devices = [f"TOR_DEVICE_{random.randint(1000,9999)}", f"VPN_{random.randint(1000,9999)}", f"UNKNOWN_{random.randint(1000,9999)}"]
        normal_devices = [f"DEVICE_{random.randint(1000,9999)}", f"MOBILE_{random.randint(1000,9999)}", f"WEB_{random.randint(1000,9999)}"]
        
        transaction = {
            "transaction_id": str(uuid.uuid4()),
            "amount": round(amount, 2),
            "source_account": f"ACC_{random.randint(1000, 9999)}",
            "target_account": f"ACC_{random.randint(1000, 9999)}",
            "timestamp": datetime.now().isoformat(),
            "ip_address": random.choice(suspicious_ips if is_fraudulent else normal_ips),
            "device_id": random.choice(suspicious_devices if is_fraudulent else normal_devices),
            "channel": random.choice(["WEB", "MOBILE", "API", "ATM", "BRANCH"]),
            "transaction_type": pattern["name"],
            "is_fraudulent": is_fraudulent,
            "fraud_pattern": pattern["name"] if is_fraudulent else None,
            "risk_level": pattern["risk"] if is_fraudulent else "low",
            "metadata": {
                "user_agent": random.choice(["Chrome", "Firefox", "Safari", "Mobile App"]),
                "location": random.choice(["FR", "US", "UK", "DE", "ES", "RU"]),
                "session_id": f"SESS_{random.randint(10000, 99999)}"
            }
        }
        
        return transaction
    
    def send_to_kafka(self, transaction):
        """Envoie la transaction à Kafka"""
        try:
            key = transaction["transaction_id"]
            future = self.producer.send(TOPIC_RAW, value=transaction, key=key)
            record_metadata = future.get(timeout=5)
            fraud_marker = "🚨 FRAUDE" if transaction["is_fraudulent"] else "✅ NORMAL"
            logger.info(f"{fraud_marker} | {transaction['transaction_id'][:8]}... | {transaction['amount']:.2f}€ | Pattern: {transaction['transaction_type']}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur envoi Kafka: {e}")
            return False
    
    def update_redis_stats(self, transaction):
        """Met à jour les statistiques dans Redis"""
        if not self.redis_client:
            return
            
        try:
            # Incrémenter le compteur de transactions
            self.redis_client.incr("pipeline:total_transactions")
            
            if transaction["is_fraudulent"]:
                self.redis_client.incr("pipeline:total_frauds")
            
            # Stocker la transaction (expiration 24h)
            key = f"verdict:{transaction['transaction_id']}"
            self.redis_client.setex(key, 86400, json.dumps(transaction))
            
            # Mettre à jour les compteurs par pattern
            pattern_key = f"pipeline:pattern:{transaction['transaction_type']}"
            self.redis_client.incr(pattern_key)
            
        except Exception as e:
            logger.error(f"❌ Erreur mise à jour Redis: {e}")
    
    def run(self, interval=2):
        """Boucle principale de génération"""
        logger.info("🚀 Générateur de transactions en temps réel démarré")
        logger.info(f"📊 Intervalle: {interval} secondes")
        logger.info(f"📨 Topic Kafka: {TOPIC_RAW}")
        
        start_time = datetime.now()
        
        while self.running:
            try:
                # Générer une transaction
                transaction = self.generate_transaction()
                self.transaction_count += 1
                if transaction["is_fraudulent"]:
                    self.fraud_count += 1
                
                # Envoyer à Kafka
                if self.send_to_kafka(transaction):
                    self.update_redis_stats(transaction)
                
                # Afficher les statistiques périodiquement
                if self.transaction_count % 10 == 0:
                    elapsed = (datetime.now() - start_time).seconds
                    rate = (self.transaction_count / elapsed * 60) if elapsed > 0 else 0
                    fraud_rate = (self.fraud_count / self.transaction_count * 100) if self.transaction_count > 0 else 0
                    
                    logger.info(f"📊 STATS: {self.transaction_count} transactions | "
                              f"{self.fraud_count} fraudes ({fraud_rate:.1f}%) | "
                              f"{rate:.1f} tx/min")
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("⏹️ Arrêt demandé...")
                break
            except Exception as e:
                logger.error(f"❌ Erreur dans la boucle principale: {e}")
                time.sleep(5)
        
        self.stop()
    
    def stop(self):
        """Arrête le générateur"""
        self.running = False
        if hasattr(self, 'producer'):
            self.producer.flush()
            self.producer.close()
        logger.info(f"✅ Générateur arrêté. Total: {self.transaction_count} transactions, {self.fraud_count} fraudes")


if __name__ == "__main__":
    import sys
    
    # Vérifier si Kafka est accessible
    generator = RealtimeTransactionGenerator()
    
    try:
        generator.run(interval=1.5)  # Une transaction toutes les 1.5 secondes
    except KeyboardInterrupt:
        generator.stop()