from kafka import KafkaConsumer
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GroverAnalyzer:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'transactions-enriched',
            bootstrap_servers=['neura-kafka:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        logger.info("🧠 Grover Analyzer (backend) démarré")
    
    def analyze(self, transaction):
        amount = transaction.get('amount', 0)
        fraud_score = transaction.get('fraud_score', 0)
        
        analysis = {
            "transaction_id": transaction.get('transaction_id', 'unknown'),
            "amount": amount,
            "fraud_score": fraud_score,
            "risk_level": transaction.get('risk_level', 'low'),
            "analysis": {
                "is_suspicious": fraud_score > 0.4,
                "amount_category": "high" if amount > 50000 else ("medium" if amount > 10000 else "low"),
                "patterns_detected": [],
                "recommendation": "approve" if fraud_score < 0.3 else ("review" if fraud_score < 0.6 else "block"),
                "analyzed_at": datetime.now().isoformat(),
                "analyzed_by": "grover-backend"
            }
        }
        
        if amount > 50000:
            analysis['analysis']['patterns_detected'].append("large_transaction")
        if fraud_score > 0.7:
            analysis['analysis']['patterns_detected'].append("high_fraud_risk")
        if transaction.get('sender', {}).get('history') == "multiple_transactions":
            analysis['analysis']['patterns_detected'].append("frequent_transactions")
        
        return analysis
    
    def run(self):
        logger.info("📡 En attente des transactions...")
        count = 0
        
        for msg in self.consumer:
            transaction = msg.value
            analysis = self.analyze(transaction)
            count += 1
            
            if analysis['analysis']['is_suspicious']:
                logger.warning(f"🚨 Transaction suspecte: {transaction.get('transaction_id')} | Score: {analysis['fraud_score']:.2f} | {analysis['analysis']['recommendation']}")
                if analysis['analysis']['patterns_detected']:
                    logger.info(f"   Patterns: {', '.join(analysis['analysis']['patterns_detected'])}")
            else:
                logger.info(f"✅ {transaction.get('transaction_id')} | Score: {analysis['fraud_score']:.2f} | {analysis['analysis']['recommendation']}")
            
            if count % 10 == 0:
                logger.info(f"📊 {count} transactions analysées")

if __name__ == "__main__":
    GroverAnalyzer().run()
