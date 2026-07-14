#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Générateur de transactions aléatoires pour tester le pipeline complet
"""

import json
import random
import time
from datetime import datetime, timedelta
from kafka import KafkaProducer
from typing import Dict, List, Any
import argparse
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TransactionGenerator:
    """Générateur de transactions aléatoires réalistes"""
    
    def __init__(self, kafka_broker: str = "neura-kafka:9092", topic: str = "transactions"):
        self.kafka_broker = kafka_broker
        self.topic = topic
        self.producer = None
        self.count = 0
        
        # Données réalistes
        self.first_names = ["Jean", "Marie", "Pierre", "Sophie", "Thomas", "Isabelle", 
                           "Nicolas", "Claire", "Michel", "Laura", "Ahmed", "Yuki",
                           "David", "Elena", "Carlos", "Fatima", "Mei", "Ivan",
                           "Amara", "Oliver", "Emma", "Lucas", "Chloe", "Hugo"]
        
        self.last_names = ["Dupont", "Martin", "Durand", "Bernard", "Petit", "Roux",
                          "Laurent", "Moreau", "Lefevre", "Garcia", "Benali", "Tanaka",
                          "Wilson", "Petrova", "Silva", "El-Khoury", "Chen", "Ivanov",
                          "Diallo", "Smith", "Jones", "Williams", "Brown", "Taylor"]
        
        self.merchants = ["TechCorp SAS", "FinancePro Ltd", "InnovTech Group", 
                         "Global Solutions", "DataAnalytica Inc", "CloudServices Europe",
                         "SecurityNet Systems", "Blockchain Ventures", "AI Innovations Lab",
                         "Quantum Technologies", "Nordic Banking Group", "Mediterranean Trade",
                         "East West Commerce", "South American Exports", "African Digital Hub",
                         "Asian Pacific Trade", "European Logistics", "North American Corp"]
        
        self.countries = ["FR", "US", "GB", "DE", "CH", "CA", "RU", "CN", "JP", "BR", 
                         "MA", "TN", "DZ", "EG", "SA", "AE", "IN", "SG", "AU", "NZ"]
        
        self.currencies = ["EUR", "USD", "GBP", "CHF", "CAD", "JPY", "CNY", "AED"]
        
        self.transaction_types = ["transfer", "payment", "withdrawal", "deposit", 
                                  "investment", "salary", "rent", "subscription",
                                  "purchase", "refund", "dividend", "loan", "donation"]
    
    def connect_kafka(self) -> bool:
        """Établit la connexion avec Kafka"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=[self.kafka_broker],
                value_serializer=lambda x: json.dumps(x).encode('utf-8'),
                acks=1,
                retries=3,
                request_timeout_ms=30000
            )
            logger.info(f"✅ Connecté à Kafka: {self.kafka_broker}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur connexion Kafka: {e}")
            return False
    
    def generate_sender(self) -> Dict:
        """Génère un expéditeur aléatoire"""
        first = random.choice(self.first_names)
        last = random.choice(self.last_names)
        return {
            "id": f"ACC-{random.randint(100, 999):03d}",
            "name": f"{first} {last}",
            "balance": round(random.uniform(100, 500000), 2),
            "country": random.choice(self.countries),
            "age": random.randint(18, 75)
        }
    
    def generate_recipient(self) -> Dict:
        """Génère un destinataire aléatoire"""
        if random.random() < 0.4:
            # Un merchant
            return {
                "id": f"ACC-R-{random.randint(100, 999):03d}",
                "name": random.choice(self.merchants),
                "country": random.choice(self.countries)
            }
        else:
            # Une personne
            first = random.choice(self.first_names)
            last = random.choice(self.last_names)
            return {
                "id": f"ACC-R-{random.randint(100, 999):03d}",
                "name": f"{first} {last}",
                "country": random.choice(self.countries)
            }
    
    def generate_transaction(self, include_fraud: bool = False) -> Dict:
        """Génère une transaction aléatoire"""
        sender = self.generate_sender()
        recipient = self.generate_recipient()
        
        # Types de montants différents pour créer des scénarios variés
        amount_ranges = [
            (1, 100, 0.4),      # Petites transactions
            (100, 1000, 0.3),   # Moyennes
            (1000, 10000, 0.2), # Grandes
            (10000, 150000, 0.1) # Très grandes
        ]
        
        # Sélectionner une tranche de montant
        rand = random.random()
        cumulative = 0
        chosen_range = (1, 100)
        for low, high, prob in amount_ranges:
            cumulative += prob
            if rand <= cumulative:
                chosen_range = (low, high)
                break
        
        amount = round(random.uniform(chosen_range[0], chosen_range[1]), 2)
        
        # Si on veut forcer une fraude
        if include_fraud:
            amount = round(random.uniform(50000, 200000), 2)
        
        # Type de transaction
        tx_type = random.choice(self.transaction_types)
        currency = random.choice(self.currencies)
        
        # Timestamp (dans les dernières 24h)
        hours_ago = random.uniform(0, 24)
        timestamp = (datetime.now() - timedelta(hours=hours_ago)).isoformat()
        
        # Construire la transaction
        transaction = {
            "transaction_id": f"TX-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
            "timestamp": timestamp,
            "amount": amount,
            "currency": currency,
            "type": tx_type,
            "sender": sender,
            "recipient": recipient,
            "metadata": {
                "ip": f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "user_agent": random.choice([
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0",
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0",
                    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 Chrome/120.0.0.0",
                    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
                ]),
                "device_id": f"DEV-{random.randint(1000, 9999)}",
                "session_id": f"SESS-{random.randint(100000, 999999):06x}",
                "source": "test_generator",
                "generated_at": datetime.now().isoformat(),
                "transaction_type": tx_type,
                "sender_country": sender["country"],
                "recipient_country": recipient["country"],
                "is_cross_border": sender["country"] != recipient["country"]
            }
        }
        
        return transaction
    
    def generate_scenario(self) -> List[Dict]:
        """Génère un scénario complet de transactions"""
        scenarios = []
        
        # 1. Transactions normales (70%)
        for _ in range(random.randint(5, 15)):
            scenarios.append(self.generate_transaction(include_fraud=False))
        
        # 2. Transactions suspectes (20%)
        for _ in range(random.randint(2, 5)):
            tx = self.generate_transaction(include_fraud=False)
            # Ajouter des caractéristiques suspectes
            tx["amount"] = round(random.uniform(15000, 80000), 2)
            tx["metadata"]["is_cross_border"] = True
            scenarios.append(tx)
        
        # 3. Transactions frauduleuses (10%)
        for _ in range(random.randint(1, 3)):
            scenarios.append(self.generate_transaction(include_fraud=True))
        
        # Mélanger
        random.shuffle(scenarios)
        return scenarios
    
    def send_transactions(self, transactions: List[Dict]):
        """Envoie les transactions à Kafka"""
        for tx in transactions:
            try:
                self.producer.send(self.topic, value=tx)
                self.count += 1
                logger.info(f"📤 #{self.count} {tx['transaction_id']}: {tx['amount']} {tx['currency']} "
                          f"de {tx['sender']['name']} vers {tx['recipient']['name']}")
                time.sleep(random.uniform(0.1, 0.5))
            except Exception as e:
                logger.error(f"❌ Erreur envoi: {e}")
        
        self.producer.flush()
        logger.info(f"✅ {len(transactions)} transactions envoyées")
    
    def run_continuous(self, rate: int = 3):
        """Exécute le générateur en continu"""
        if not self.connect_kafka():
            return
        
        logger.info(f"🚀 Générateur continu démarré - {rate} tx/s")
        logger.info("=" * 60)
        
        interval = 1.0 / rate
        batch_size = random.randint(1, 5)
        
        try:
            while True:
                start_time = time.time()
                
                # Générer un lot
                transactions = []
                for _ in range(batch_size):
                    include_fraud = random.random() < 0.1
                    transactions.append(self.generate_transaction(include_fraud))
                
                self.send_transactions(transactions)
                
                # Ajuster le rythme
                elapsed = time.time() - start_time
                if elapsed < interval * batch_size:
                    time.sleep(interval * batch_size - elapsed)
                
                # Changer la taille du lot
                batch_size = random.randint(1, 5)
                
        except KeyboardInterrupt:
            logger.info("🛑 Arrêt demandé")
        finally:
            if self.producer:
                self.producer.close()

def main():
    parser = argparse.ArgumentParser(description='Générateur de transactions aléatoires')
    parser.add_argument('--rate', type=int, default=3, help='Transactions par seconde')
    parser.add_argument('--count', type=int, default=None, help='Nombre de transactions à générer (mode unique)')
    parser.add_argument('--continuous', action='store_true', help='Mode continu')
    parser.add_argument('--broker', type=str, default='neura-kafka:9092', help='Broker Kafka')
    parser.add_argument('--topic', type=str, default='transactions', help='Topic Kafka')
    
    args = parser.parse_args()
    
    generator = TransactionGenerator(kafka_broker=args.broker, topic=args.topic)
    
    if args.continuous:
        generator.run_continuous(rate=args.rate)
    elif args.count:
        if not generator.connect_kafka():
            return
        
        logger.info(f"🚀 Génération de {args.count} transactions...")
        logger.info("=" * 60)
        
        for i in range(args.count):
            include_fraud = random.random() < 0.15
            tx = generator.generate_transaction(include_fraud)
            generator.send_transactions([tx])
            time.sleep(random.uniform(0.05, 0.2))
        
        generator.producer.flush()
        logger.info(f"✅ {args.count} transactions générées")
    else:
        # Mode par défaut: générer un scénario
        if not generator.connect_kafka():
            return
        
        scenarios = generator.generate_scenario()
        generator.send_transactions(scenarios)

if __name__ == "__main__":
    main()
