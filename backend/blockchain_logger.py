from kafka import KafkaConsumer
import json
import logging
from datetime import datetime
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BlockchainLogger:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'transactions-enriched',
            bootstrap_servers=['neura-kafka:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.blockchain = []
        logger.info("⛓️ Blockchain Logger démarré")
    
    def hash_transaction(self, transaction):
        tx_str = json.dumps(transaction, sort_keys=True)
        return hashlib.sha256(tx_str.encode()).hexdigest()
    
    def add_to_blockchain(self, transaction):
        tx_hash = self.hash_transaction(transaction)
        
        block = {
            'index': len(self.blockchain) + 1,
            'timestamp': datetime.now().isoformat(),
            'transaction_id': transaction.get('transaction_id', 'unknown'),
            'transaction_hash': tx_hash,
            'previous_hash': self.blockchain[-1]['block_hash'] if self.blockchain else 'genesis',
            'data': transaction
        }
        
        block['block_hash'] = self.hash_transaction(block)
        self.blockchain.append(block)
        
        logger.info(f"⛓️ Block #{block['index']} ajouté pour {transaction.get('transaction_id')}")
        return block
    
    def run(self):
        logger.info("📡 En attente des transactions...")
        
        for msg in self.consumer:
            try:
                transaction = msg.value
                block = self.add_to_blockchain(transaction)
                
                if len(self.blockchain) % 10 == 0:
                    logger.info(f"📊 {len(self.blockchain)} blocks dans la blockchain")
                
            except Exception as e:
                logger.error(f"❌ Erreur: {e}")

if __name__ == "__main__":
    logger = BlockchainLogger()
    logger.run()
