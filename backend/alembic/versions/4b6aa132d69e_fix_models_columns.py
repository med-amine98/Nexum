"""fix_models_columns

Revision ID: 001
Revises: 
Create Date: 2026-03-21 14:55:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Ajouter les colonnes manquantes à sale_orders
    op.execute("""
        DO $$ 
        BEGIN
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS amount_untaxed DECIMAL(15,2) DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS amount_tax DECIMAL(15,2) DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS state VARCHAR(20) DEFAULT 'draft';
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS user_id INTEGER;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS company_id INTEGER;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
        END $$;
    """)
    
    # Ajouter les colonnes manquantes à products
    op.execute("""
        DO $$ 
        BEGIN
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS code VARCHAR(50);
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS cost DECIMAL(15,2) DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock DECIMAL(15,2) DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS max_stock DECIMAL(15,2) DEFAULT 0;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
        END $$;
    """)
    
    # Ajouter les colonnes manquantes à purchase_orders
    op.execute("""
        DO $$ 
        BEGIN
            BEGIN
                ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS expected_date TIMESTAMP;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS delivery_date TIMESTAMP;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS reference VARCHAR(100);
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
            BEGIN
                ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS created_by INTEGER;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
        END $$;
    """)
    
    # S'assurer que la colonne id existe
    op.execute("""
        DO $$ 
        BEGIN
            BEGIN
                ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
            EXCEPTION
                WHEN duplicate_column THEN NULL;
            END;
        END $$;
    """)


def downgrade():
    # Supprimer les colonnes ajoutées (optionnel)
    pass
