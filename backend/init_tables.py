from app.database import Base, engine
from app.models.blockchain import Block, Transaction, Node, SmartContract
from app.models.insight import Insight, Keyword, PerformanceMetric, MarketTrend

logger.info("🚀 Création des tables blockchain et insights...")
Base.metadata.create_all(bind=engine)
logger.info("✅ Tables créées avec succès")

from sqlalchemy import inspect
inspector = inspect(engine)
tables = inspector.get_table_names()
logger.info("📊 Tables dans la base de données:")
for table in tables:
    if table in ['blocks', 'transactions', 'nodes', 'smart_contracts', 
                 'insights', 'keywords', 'performance_metrics', 'market_trends']:
        logger.info(f"  - {table} ✓")
