#!/usr/bin/env python3
"""
Stockage des transactions dans PostgreSQL et MinIO
ÉTAPE 3: STOCKAGE
"""

import json
import io
import asyncio
import asyncpg
from minio import Minio
from minio.error import S3Error
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TransactionStorage:
    def __init__(self):
        self.pg_pool = None
        self.minio_client = None
        
    async def init_postgres(self):
        """Initialise la connexion PostgreSQL"""
        try:
            self.pg_pool = await asyncpg.create_pool(
                host="postgres",
                port=5432,
                user="odoo",
                password="odoo",
                database="erp",
                min_size=1,
                max_size=10
            )
            logger.info("✅ Connecté à PostgreSQL")
            
            # Créer les tables si elles n'existent pas
            await self.create_tables()
            return True
        except Exception as e:
            logger.error(f"❌ Erreur connexion PostgreSQL: {e}")
            return False
    
    async def create_tables(self):
        """Crée les tables nécessaires"""
        async with self.pg_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    transaction_id VARCHAR(36) PRIMARY KEY,
                    timestamp TIMESTAMP NOT NULL,
                    amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3),
                    sender_id VARCHAR(50),
                    recipient_id VARCHAR(50),
                    risk_score DECIMAL(5,4),
                    risk_level VARCHAR(10),
                    status VARCHAR(20),
                    is_fraudulent BOOLEAN,
                    fraud_type VARCHAR(50),
                    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_timestamp 
                ON transactions(timestamp DESC)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_sender 
                ON transactions(sender_id)
            """)
            
            await conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_transactions_risk 
                ON transactions(risk_score DESC)
            """)
            
            logger.info("✅ Tables PostgreSQL créées/vérifiées")
    
    def init_minio(self):
        """Initialise le client MinIO"""
        try:
            self.minio_client = Minio(
                "minio:9000",
                access_key="minioadmin",
                secret_key="minioadmin123",
                secure=False
            )
            logger.info("✅ Connecté à MinIO")
            
            # Vérifier que les buckets existent
            self.ensure_buckets()
            return True
        except Exception as e:
            logger.error(f"❌ Erreur connexion MinIO: {e}")
            return False
    
    def ensure_buckets(self):
        """Vérifie et crée les buckets nécessaires"""
        buckets = ["erp-documents", "erp-backups", "erp-analytics"]
        for bucket in buckets:
            if not self.minio_client.bucket_exists(bucket):
                self.minio_client.make_bucket(bucket)
                logger.info(f"✅ Bucket créé: {bucket}")
    
    async def store_transaction(self, transaction, preprocessed_data=None):
        """Stocke une transaction complète"""
        try:
            # 1. Stockage dans PostgreSQL
            await self.store_in_postgres(transaction, preprocessed_data)
            
            # 2. Stockage dans MinIO
            await self.store_in_minio(transaction, preprocessed_data)
            
            logger.info(f"✅ Transaction stockée: {transaction['transaction_id']}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur stockage transaction: {e}")
            return False
    
    async def store_in_postgres(self, transaction, preprocessed_data):
        """Stocke dans PostgreSQL"""
        async with self.pg_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO transactions (
                    transaction_id, timestamp, amount, currency,
                    sender_id, recipient_id, risk_score, risk_level,
                    status, is_fraudulent, fraud_type
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (transaction_id) DO UPDATE SET
                    risk_score = EXCLUDED.risk_score,
                    risk_level = EXCLUDED.risk_level,
                    status = EXCLUDED.status,
                    processed_at = CURRENT_TIMESTAMP
            """,
                transaction['transaction_id'],
                transaction['timestamp'],
                transaction['amount'],
                transaction.get('currency', 'EUR'),
                transaction['sender']['id'],
                transaction['recipient']['id'],
                preprocessed_data.get('combined_risk_score', 0) if preprocessed_data else 0,
                preprocessed_data.get('risk_level', 'UNKNOWN') if preprocessed_data else 'UNKNOWN',
                'processed',
                transaction.get('is_fraudulent', False),
                transaction.get('fraud_type')
            )
    
    async def store_in_minio(self, transaction, preprocessed_data):
        """Stocke dans MinIO"""
        # Préparer les données complètes
        full_data = {
            "raw_transaction": transaction,
            "preprocessed_data": preprocessed_data,
            "stored_at": datetime.utcnow().isoformat()
        }
        
        json_data = json.dumps(full_data, indent=2)
        json_bytes = json_data.encode('utf-8')
        
        # Stocker dans MinIO
        object_name = f"transactions/{transaction['transaction_id']}.json"
        self.minio_client.put_object(
            "erp-documents",
            object_name,
            io.BytesIO(json_bytes),
            len(json_bytes),
            content_type="application/json"
        )
        
        logger.info(f"📁 Document stocké: {object_name}")
    
    async def get_transaction(self, transaction_id):
        """Récupère une transaction depuis PostgreSQL"""
        async with self.pg_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM transactions WHERE transaction_id = $1",
                transaction_id
            )
            return dict(row) if row else None
    
    async def get_transaction_document(self, transaction_id):
        """Récupère le document depuis MinIO"""
        try:
            object_name = f"transactions/{transaction_id}.json"
            response = self.minio_client.get_object("erp-documents", object_name)
            data = json.loads(response.read())
            response.close()
            response.release_conn()
            return data
        except Exception as e:
            logger.error(f"Erreur lecture document: {e}")
            return None
    
    async def update_transaction_status(self, transaction_id, status, verdict=None):
        """Met à jour le statut d'une transaction"""
        async with self.pg_pool.acquire() as conn:
            await conn.execute("""
                UPDATE transactions 
                SET status = $2, 
                    is_fraudulent = $3,
                    processed_at = CURRENT_TIMESTAMP
                WHERE transaction_id = $1
            """, transaction_id, status, verdict == "FRAUD" if verdict else None)

# Instance globale
storage = TransactionStorage()

async def init_storage():
    """Initialise le stockage"""
    await storage.init_postgres()
    storage.init_minio()
    return storage