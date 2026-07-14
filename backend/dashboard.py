from kafka import KafkaConsumer
import json
import logging
from datetime import datetime
import os
import time

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Dashboard:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'transactions-enriched',
            bootstrap_servers=['neura-kafka:9092'],
            group_id='dashboard-consumer',
            auto_offset_reset='latest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.stats = {
            'total': 0,
            'high': 0,
            'medium': 0,
            'low': 0,
            'amounts': []
        }
    
    def run(self):
        logger.info("📊 Dashboard démarré")
        logger.info("=" * 70)
        
        for msg in self.consumer:
            tx = msg.value
            self.stats['total'] += 1
            self.stats['amounts'].append(tx.get('amount', 0))
            
            risk = tx.get('risk_level', 'low')
            if risk == 'high':
                self.stats['high'] += 1
            elif risk == 'medium':
                self.stats['medium'] += 1
            else:
                self.stats['low'] += 1
            
            # Afficher le tableau de bord périodiquement
            if self.stats['total'] % 5 == 0:
                os.system('clear' if os.name == 'posix' else 'cls')
                print("=" * 70)
                print(f"📊 DASHBOARD - {datetime.now().strftime('%H:%M:%S')}")
                print("=" * 70)
                print(f"📈 Transactions: {self.stats['total']}")
                print(f"🔴 Haut risque: {self.stats['high']}")
                print(f"🟡 Moyen risque: {self.stats['medium']}")
                print(f"🟢 Bas risque: {self.stats['low']}")
                if self.stats['amounts']:
                    avg = sum(self.stats['amounts'][-50:]) / len(self.stats['amounts'][-50:])
                    max_amt = max(self.stats['amounts'][-50:])
                    min_amt = min(self.stats['amounts'][-50:])
                    print(f"💰 Moyenne: {avg:,.2f}€")
                    print(f"📈 Max: {max_amt:,.2f}€")
                    print(f"📉 Min: {min_amt:,.2f}€")
                print("=" * 70)

if __name__ == "__main__":
    Dashboard().run()
