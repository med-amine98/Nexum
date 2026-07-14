import json
import time
import random
import uuid
import requests
from datetime import datetime
from kafka import KafkaProducer
import threading
import logging
from typing import Dict, Any, List, Optional
import argparse

# Configuration pour Docker
KAFKA_BROKERS = ["neura-kafka:9092"]
TOPIC = "transactions"
BACKEND_URL = "http://neura-backend:8000/api/v1"
PIPELINE_URL = f"{BACKEND_URL}/pipeline"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TransactionGenerator:
    """Générateur de transactions - NEUTRE, le pipeline détermine le risque"""
    
    def __init__(self, rate: int = 3):
        self.rate = rate
        self.running = False
        self.producer = None
        self.transaction_count = 0
        self.results = []
        
        # Données réalistes SANS indication de risque
        self.senders = [
            {"id": "ACC-001", "name": "Jean Dupont", "balance": 150000, "country": "FR", "age": 45},
            {"id": "ACC-002", "name": "Marie Martin", "balance": 85000, "country": "FR", "age": 32},
            {"id": "ACC-003", "name": "Pierre Durand", "balance": 220000, "country": "FR", "age": 58},
            {"id": "ACC-004", "name": "Sophie Bernard", "balance": 5000, "country": "FR", "age": 27},
            {"id": "ACC-005", "name": "Thomas Petit", "balance": 95000, "country": "FR", "age": 41},
            {"id": "ACC-006", "name": "Isabelle Roux", "balance": 120000, "country": "FR", "age": 36},
            {"id": "ACC-007", "name": "Nicolas Laurent", "balance": 30000, "country": "FR", "age": 29},
            {"id": "ACC-008", "name": "Claire Moreau", "balance": 180000, "country": "FR", "age": 52},
            {"id": "ACC-009", "name": "Michel Lefevre", "balance": 2000, "country": "FR", "age": 24},
            {"id": "ACC-010", "name": "Laura Garcia", "balance": 75000, "country": "ES", "age": 38},
            {"id": "ACC-011", "name": "Ahmed Benali", "balance": 45000, "country": "MA", "age": 33},
            {"id": "ACC-012", "name": "Yuki Tanaka", "balance": 8000, "country": "JP", "age": 26},
            {"id": "ACC-013", "name": "David Wilson", "balance": 200000, "country": "US", "age": 49},
            {"id": "ACC-014", "name": "Elena Petrova", "balance": 15000, "country": "RU", "age": 31},
            {"id": "ACC-015", "name": "Carlos Silva", "balance": 60000, "country": "BR", "age": 44},
        ]
        
        self.recipients = [
            {"id": "ACC-R-001", "name": "TechCorp SAS", "country": "FR"},
            {"id": "ACC-R-002", "name": "FinancePro Ltd", "country": "GB"},
            {"id": "ACC-R-003", "name": "InnovTech Group", "country": "DE"},
            {"id": "ACC-R-004", "name": "Global Solutions", "country": "US"},
            {"id": "ACC-R-005", "name": "DataAnalytica Inc", "country": "CA"},
            {"id": "ACC-R-006", "name": "CloudServices Europe", "country": "NL"},
            {"id": "ACC-R-007", "name": "SecurityNet Systems", "country": "RU"},
            {"id": "ACC-R-008", "name": "Blockchain Ventures", "country": "KY"},
            {"id": "ACC-R-009", "name": "AI Innovations Lab", "country": "US"},
            {"id": "ACC-R-010", "name": "Quantum Technologies", "country": "CH"},
            {"id": "ACC-R-011", "name": "Nordic Banking Group", "country": "SE"},
            {"id": "ACC-R-012", "name": "Mediterranean Trade", "country": "IT"},
        ]
        
        self.transaction_types = ["transfer", "payment", "withdrawal", "deposit", "investment"]
        self.currencies = ["EUR", "USD", "GBP", "CHF", "CAD"]
        self.countries = ["FR", "US", "GB", "DE", "CH", "CA", "RU", "CN", "JP", "BR", "MA", "TN"]

    def connect_kafka(self) -> bool:
        """Établit la connexion avec Kafka"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=KAFKA_BROKERS,
                value_serializer=lambda x: json.dumps(x).encode('utf-8'),
                acks='all',
                retries=3,
                request_timeout_ms=30000,
                api_version_auto_timeout_ms=10000
            )
            logger.info(f"✅ Connecté à Kafka: {KAFKA_BROKERS}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur de connexion Kafka: {e}")
            return False

    def generate_transaction(self) -> Dict[str, Any]:
        """Génère une transaction NEUTRE - Sans aucune indication de risque"""
        self.transaction_count += 1
        
        sender = random.choice(self.senders)
        recipient = random.choice(self.recipients)
        
        amount = round(random.uniform(0.01, 150000), 2)
        tx_type = random.choice(self.transaction_types)
        currency = random.choice(self.currencies)
        timestamp = datetime.now().isoformat()
        
        transaction = {
            "transaction_id": f"TX-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
            "timestamp": timestamp,
            "amount": amount,
            "currency": currency,
            "type": tx_type,
            "sender": {
                "id": sender["id"],
                "name": sender["name"],
                "balance": round(sender["balance"], 2),
                "country": sender["country"],
                "age": sender["age"]
            },
            "recipient": {
                "id": recipient["id"],
                "name": recipient["name"],
                "country": recipient["country"]
            },
            "metadata": {
                "ip": f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "user_agent": random.choice([
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36"
                ]),
                "device_id": f"DEV-{random.randint(1000, 9999)}",
                "session_id": f"SESS-{uuid.uuid4().hex[:8]}",
                "source": "real_time_generator",
                "generated_at": datetime.now().isoformat(),
                "transaction_type": tx_type,
                "sender_country": sender["country"],
                "recipient_country": recipient["country"],
                "is_cross_border": sender["country"] != recipient["country"]
            }
        }
        
        return transaction

    def send_transaction(self, transaction: Dict[str, Any]) -> Optional[Dict]:
        """Envoie une transaction à Kafka"""
        try:
            future = self.producer.send(TOPIC, transaction)
            result = future.get(timeout=10)
            
            logger.info(
                f"📤 TX {transaction['transaction_id']}: "
                f"{transaction['amount']:,.2f} {transaction['currency']} "
                f"de {transaction['sender']['name']} "
                f"vers {transaction['recipient']['name']}"
            )
            
            return transaction
            
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
            return None

    def run_stream(self):
        """Démarre le flux en temps réel"""
        if not self.connect_kafka():
            logger.error("❌ Impossible de démarrer le flux")
            return
        
        self.running = True
        logger.info(f"🚀 Flux démarré - {self.rate} tx/s")
        logger.info(f"📡 Topic: {TOPIC} - Brokers: {KAFKA_BROKERS}")
        logger.info("-" * 70)
        
        interval = 1.0 / self.rate
        count = 0
        
        try:
            while self.running:
                start_time = time.time()
                
                tx = self.generate_transaction()
                self.send_transaction(tx)
                count += 1
                
                if count % 10 == 0:
                    logger.info(f"📊 {count} transactions envoyées")
                
                elapsed = time.time() - start_time
                if elapsed < interval:
                    time.sleep(interval - elapsed)
                    
        except KeyboardInterrupt:
            logger.info("\n🛑 Arrêt demandé")
        finally:
            self.stop()

    def stop(self):
        self.running = False
        if self.producer:
            self.producer.flush()
            self.producer.close()
        
        logger.info(f"🛑 Flux arrêté - {self.transaction_count} transactions générées")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Flux en temps réel pour Nexum')
    parser.add_argument('--rate', type=int, default=3, help='Transactions par seconde')
    
    args = parser.parse_args()
    
    generator = TransactionGenerator(rate=args.rate)
    try:
        generator.run_stream()
    except KeyboardInterrupt:
        generator.stop()
