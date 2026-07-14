# scripts/migrate_blockchain.py
"""
Script de migration pour les tables blockchain
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text
from app.models.blockchain import Base

def migrate():
    """Exécute les migrations"""
    print("🔧 Migration des tables blockchain...")
    
    with engine.connect() as conn:
        # 1. Ajouter les colonnes pour blockchain_transactions
        try:
            conn.execute(text("""
                ALTER TABLE blockchain_transactions 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
            """))
            conn.execute(text("""
                ALTER TABLE blockchain_transactions 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            """))
            print("✅ Colonnes ajoutées à blockchain_transactions")
        except Exception as e:
            print(f"⚠️ Erreur blockchain_transactions: {e}")
        
        # 2. Ajouter les colonnes pour blockchain_blocks
        try:
            conn.execute(text("""
                ALTER TABLE blockchain_blocks 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW()
            """))
            conn.execute(text("""
                ALTER TABLE blockchain_blocks 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
            """))
            print("✅ Colonnes ajoutées à blockchain_blocks")
        except Exception as e:
            print(f"⚠️ Erreur blockchain_blocks: {e}")
        
        # 3. Mettre à jour les valeurs existantes
        try:
            conn.execute(text("""
                UPDATE blockchain_transactions 
                SET created_at = timestamp 
                WHERE created_at IS NULL
            """))
            conn.execute(text("""
                UPDATE blockchain_blocks 
                SET created_at = timestamp 
                WHERE created_at IS NULL
            """))
            print("✅ Valeurs mises à jour")
        except Exception as e:
            print(f"⚠️ Erreur mise à jour: {e}")
        
        conn.commit()
    
    print("✅ Migration terminée!")

if __name__ == "__main__":
    migrate()