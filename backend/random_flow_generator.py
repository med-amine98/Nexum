#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Générateur de flux aléatoire de transactions pour tester le pipeline complet
"""

import json
import random
import time
from datetime import datetime, timedelta
from kafka import KafkaProducer
import argparse
import logging
import signal
import sys

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RandomFlowGenerator:
    """Générateur de flux aléatoire de transactions"""
    
    def __init__(self, broker="neura-kafka:9092", topic="transactions"):
        self.broker = broker
        self.topic = topic
        self.producer = None
        self.running = True
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
                         "Quantum Technologies", "Nordic Banking Group", "Mediterranean Trade"]
        
        self.countries = ["FR", "US", "GB", "DE", "CH", "CA", "RU", "CN", "JP", "BR", 
                         "MA", "TN", "DZ", "EG", "SA", "AE", "IN", "SG", "AU", "NZ"]
        
        self.currencies = ["EUR", "USD", "GBP", "CHF", "CAD", "JPY"]
        
        self.transaction_types = ["transfer", "payment", "withdrawal", "deposit", 
                                  "investment", "salary", "rent", "subscription",
                                  "purchase", "refund", "dividend", "loan"]
        
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
    
    def signal_handler(self, sig, frame):
        logger.info("🛑 Arrêt demandé...")
        self.running = False
    
    def connect(self):
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=[self.broker],
                value_serializer=lambda x: json.dumps(x).encode('utf-8'),
                acks=1,
                retries=3,
                request_timeout_ms=30000
            )
            logger.info(f"✅ Connecté à Kafka: {self.broker}")
            return True
        except Exception as e:
            logger.error(f"❌ Erreur connexion: {e}")
            return False
    
    def generate_sender(self):
        first = random.choice(self.first_names)
        last = random.choice(self.last_names)
        return {
            "id": f"ACC-{random.randint(100, 999):03d}",
            "name": f"{first} {last}",
            "balance": round(random.uniform(100, 500000), 2),
            "country": random.choice(self.countries),
            "age": random.randint(18, 75)
        }
    
    def generate_recipient(self):
        if random.random() < 0.35:
            return {
                "id": f"ACC-R-{random.randint(100, 999):03d}",
                "name": random.choice(self.merchants),
                "country": random.choice(self.countries)
            }
        else:
            first = random.choice(self.first_names)
            last = random.choice(self.last_names)
            return {
                "id": f"ACC-R-{random.randint(100, 999):03d}",
                "name": f"{first} {last}",
                "country": random.choice(self.countries)
            }
    
    def generate_amount(self, scenario="normal"):
        if scenario == "fraud":
            return round(random.uniform(50000, 200000), 2)
        elif scenario == "suspicious":
            return round(random.uniform(15000, 80000), 2)
        else:  # normal
            ranges = [
                (1, 100, 0.25),
                (100, 500, 0.25),
                (500, 2000, 0.20),
                (2000, 10000, 0.20),
                (10000, 50000, 0.10)
            ]
            rand = random.random()
            cumulative = 0
            for low, high, prob in ranges:
                cumulative += prob
                if rand <= cumulative:
                    return round(random.uniform(low, high), 2)
            return round(random.uniform(1, 100), 2)
    
    def generate_transaction(self, scenario="normal"):
        sender = self.generate_sender()
        recipient = self.generate_recipient()
        amount = self.generate_amount(scenario)
        tx_type = random.choice(self.transaction_types)
        currency = random.choice(self.currencies)
        
        hours_ago = random.uniform(0, 72)
        timestamp = (datetime.now() - timedelta(hours=hours_ago)).isoformat()
        
        # Ajouter des métadonnées pour enrichir l'analyse
        is_cross_border = sender["country"] != recipient["country"]
        
        transaction = {
            "transaction_id": f"FLOW-{datetime.now().strftime('%Y%m%d%H%M%S')}-{random.randint(1000, 9999)}",
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
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36"
                ]),
                "device_id": f"DEV-{random.randint(1000, 9999)}",
                "session_id": f"SESS-{random.randint(100000, 999999):06x}",
                "source": "random_flow_generator",
                "generated_at": datetime.now().isoformat(),
                "transaction_type": tx_type,
                "sender_country": sender["country"],
                "recipient_country": recipient["country"],
                "is_cross_border": is_cross_border,
                "scenario": scenario
            }
        }
        
        return transaction
    
    def send_transaction(self, transaction):
        try:
            self.producer.send(self.topic, value=transaction)
            self.count += 1
            return True
        except Exception as e:
            logger.error(f"❌ Erreur envoi: {e}")
            return False
    
    def flush(self):
        if self.producer:
            self.producer.flush()
    
    def run_continuous(self, rate=2, fraud_rate=0.15):
        if not self.connect():
            return
        
        logger.info(f"🚀 Flux aléatoire démarré - {rate} tx/s")
        logger.info(f"📊 Taux de fraude: {fraud_rate*100:.1f}%")
        logger.info("=" * 60)
        
        interval = 1.0 / rate
        last_stats = time.time()
        stats = {"normal": 0, "suspicious": 0, "fraud": 0, "total": 0}
        
        try:
            while self.running:
                start = time.time()
                
                rand = random.random()
                if rand < fraud_rate:
                    scenario = "fraud"
                elif rand < fraud_rate * 2:
                    scenario = "suspicious"
                else:
                    scenario = "normal"
                
                tx = self.generate_transaction(scenario)
                self.send_transaction(tx)
                stats[scenario] = stats.get(scenario, 0) + 1
                stats["total"] += 1
                
                # Affichage coloré
                if scenario == "fraud":
                    emoji = "🔴"
                elif scenario == "suspicious":
                    emoji = "🟡"
                else:
                    emoji = "🟢"
                
                logger.info(f"{emoji} #{stats['total']} {tx['transaction_id'][:20]}... {tx['amount']:,.2f}€ {tx['currency']} "
                          f"{tx['sender']['name'][:12]} → {tx['recipient']['name'][:12]}")
                
                if time.time() - last_stats > 15:
                    logger.info("=" * 60)
                    logger.info(f"📊 STATS: {stats['total']} transactions")
                    logger.info(f"   🟢 Normales: {stats.get('normal', 0)}")
                    logger.info(f"   🟡 Suspectes: {stats.get('suspicious', 0)}")
                    logger.info(f"   🔴 Frauduleuses: {stats.get('fraud', 0)}")
                    logger.info(f"   💰 Taux fraude: {(stats.get('fraud', 0)/stats['total']*100):.1f}%")
                    logger.info("=" * 60)
                    last_stats = time.time()
                
                elapsed = time.time() - start
                if elapsed < interval:
                    time.sleep(interval - elapsed)
                
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
        finally:
            self.close()
    
    def run_batch(self, count=50):
        if not self.connect():
            return
        
        logger.info(f"🚀 Génération de {count} transactions...")
        logger.info("=" * 60)
        
        # Distribution: 10% fraude, 20% suspect, 70% normal
        fraud_count = int(count * 0.10)
        suspicious_count = int(count * 0.20)
        normal_count = count - fraud_count - suspicious_count
        
        scenarios = ["fraud"] * fraud_count + ["suspicious"] * suspicious_count + ["normal"] * normal_count
        random.shuffle(scenarios)
        
        stats = {"normal": 0, "suspicious": 0, "fraud": 0}
        
        for i, scenario in enumerate(scenarios):
            tx = self.generate_transaction(scenario)
            self.send_transaction(tx)
            stats[scenario] = stats.get(scenario, 0) + 1
            
            emoji = "🔴" if scenario == "fraud" else "🟡" if scenario == "suspicious" else "🟢"
            logger.info(f"{emoji} #{i+1} {tx['transaction_id'][:20]}... {tx['amount']:,.2f}€")
            
            time.sleep(random.uniform(0.05, 0.15))
        
        self.flush()
        
        logger.info("=" * 60)
        logger.info(f"✅ {count} transactions envoyées")
        logger.info(f"   🟢 Normales: {stats.get('normal', 0)}")
        logger.info(f"   🟡 Suspectes: {stats.get('suspicious', 0)}")
        logger.info(f"   🔴 Frauduleuses: {stats.get('fraud', 0)}")
        
        self.close()
    
    def close(self):
        if self.producer:
            self.producer.close()
        logger.info(f"🛑 Arrêté - {self.count} transactions envoyées")

def main():
    parser = argparse.ArgumentParser(description='Générateur de flux aléatoire')
    parser.add_argument('--mode', choices=['continuous', 'batch'], default='batch', 
                       help='Mode: continuous (flux continu) ou batch (lot)')
    parser.add_argument('--rate', type=int, default=2, help='Transactions par seconde (mode continu)')
    parser.add_argument('--count', type=int, default=50, help='Nombre de transactions (mode batch)')
    parser.add_argument('--fraud-rate', type=float, default=0.15, help='Taux de fraude (0-1)')
    parser.add_argument('--broker', type=str, default='neura-kafka:9092', help='Broker Kafka')
    parser.add_argument('--topic', type=str, default='transactions', help='Topic Kafka')
    
    args = parser.parse_args()
    
    generator = RandomFlowGenerator(broker=args.broker, topic=args.topic)
    
    if args.mode == 'continuous':
        generator.run_continuous(rate=args.rate, fraud_rate=args.fraud_rate)
    else:
        generator.run_batch(count=args.count)

if __name__ == "__main__":
    main()
