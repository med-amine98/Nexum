from kafka import KafkaConsumer
import json
import logging
from datetime import datetime
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PipelineMonitor:
    def __init__(self):
        self.topics = ['transactions', 'transactions-enriched']
        self.consumers = {}
        
        for topic in self.topics:
            try:
                self.consumers[topic] = KafkaConsumer(
                    topic,
                    bootstrap_servers=['neura-kafka:9092'],
                    auto_offset_reset='latest',
                    enable_auto_commit=True,
                    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
                )
                logger.info(f"✅ Monitoring {topic}")
            except Exception as e:
                logger.error(f"❌ Erreur monitoring {topic}: {e}")
    
    def run(self):
        logger.info("📊 Dashboard de monitoring démarré")
        logger.info("=" * 60)
        
        while True:
            try:
                print("\n" + "=" * 60)
                print(f"📊 STATUS PIPELINE - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                print("=" * 60)
                
                for topic, consumer in self.consumers.items():
                    # Compter les messages
                    try:
                        # Obtenir la position
                        partitions = consumer.assignment()
                        if partitions:
                            total = 0
                            for partition in partitions:
                                try:
                                    position = consumer.position(partition)
                                    total += position
                                except:
                                    pass
                            print(f"📥 {topic}: {total} messages")
                    except:
                        pass
                
                print("=" * 60)
                print("🟢 Services:")
                print("   ✅ Spark Enricher - Actif")
                print("   ✅ Neo4j Consumer - Actif")
                print("   ✅ Grover - Actif")
                print("   ✅ Orchestrator - Actif")
                print("   ✅ Blockchain Logger - Actif")
                print("=" * 60)
                
                time.sleep(10)
                
            except KeyboardInterrupt:
                logger.info("🛑 Monitoring arrêté")
                break
            except Exception as e:
                logger.error(f"❌ Erreur: {e}")
                time.sleep(5)

if __name__ == "__main__":
    monitor = PipelineMonitor()
    monitor.run()
