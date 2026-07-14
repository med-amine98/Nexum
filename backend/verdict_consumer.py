from kafka import KafkaConsumer
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class VerdictConsumer:
    """Consomme et affiche les verdicts du pipeline"""
    
    def __init__(self):
        self.consumer = KafkaConsumer(
            'transactions-enriched',
            bootstrap_servers=['neura-kafka:9092'],
            group_id='verdict-consumer',
            auto_offset_reset='latest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.running = False
        self.stats = {
            'total': 0,
            'critical': 0,
            'suspicious': 0,
            'safe': 0
        }

    def analyze_verdict(self, verdict):
        """Analyse le verdict et retourne le niveau de risque"""
        fraud_score = verdict.get('fraud_score', 0)
        risk_level = verdict.get('risk_level', 'low')
        
        if fraud_score > 0.7 or risk_level == 'high':
            return '🔴 CRITIQUE', '🚨 FRAUDE'
        elif fraud_score > 0.4 or risk_level == 'medium':
            return '🟡 SUSPECT', '⚠️ SUSPECT'
        else:
            return '🟢 SAFE', '✅ LÉGITIME'

    def consume(self):
        """Affiche les verdicts en temps réel"""
        self.running = True
        logger.info("📡 En attente des verdicts du pipeline...")
        logger.info("=" * 70)
        
        for msg in self.consumer:
            if not self.running:
                break
            
            verdict = msg.value
            self.stats['total'] += 1
            
            fraud_score = verdict.get('fraud_score', 0)
            risk_level = verdict.get('risk_level', 'low')
            tx_id = verdict.get('transaction_id', 'N/A')
            amount = verdict.get('amount', 0)
            
            # Analyser le verdict
            emoji, status = self.analyze_verdict(verdict)
            
            # Mettre à jour les stats
            if 'CRITIQUE' in emoji:
                self.stats['critical'] += 1
            elif 'SUSPECT' in emoji:
                self.stats['suspicious'] += 1
            else:
                self.stats['safe'] += 1
            
            # Afficher
            logger.info(
                f"{emoji} | "
                f"ID: {tx_id[:20]}... | "
                f"Score: {fraud_score:.0%} | "
                f"Risque: {risk_level.upper()} | "
                f"Montant: {amount:,.2f}€"
            )
            
            # Stats périodiques
            if self.stats['total'] % 10 == 0:
                logger.info(
                    f"📊 STATS: {self.stats['total']} verdicts | "
                    f"🔴 {self.stats['critical']} | "
                    f"🟡 {self.stats['suspicious']} | "
                    f"🟢 {self.stats['safe']}"
                )
                logger.info("-" * 70)

if __name__ == "__main__":
    consumer = VerdictConsumer()
    try:
        consumer.consume()
    except KeyboardInterrupt:
        consumer.running = False
        logger.info("🛑 Consommateur arrêté")
