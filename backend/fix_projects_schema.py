from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# URL de la base de données (adapter selon l'environnement)
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://odoo:odoo@localhost:5432/erp")

engine = create_engine(DATABASE_URL)

def fix_projects_table():
    with engine.connect() as conn:
        try:
            # Liste exhaustive des colonnes à vérifier
            # (nom, type_sql, valeur_par_defaut)
            columns_to_ensure = [
                ('company_id', 'INTEGER', None),
                ('project_id', 'VARCHAR(50)', None),
                ('status', 'VARCHAR(20)', "'active'"),
                ('priority', 'VARCHAR(20)', "'medium'"),
                ('current_phase', 'VARCHAR(20)', "'planning'"),
                ('progress', 'FLOAT', '0.0'),
                ('health_score', 'FLOAT', '0.0'),
                ('performance_score', 'FLOAT', '0.0'),
                ('security_score', 'FLOAT', '0.0'),
                ('innovation_score', 'FLOAT', '0.0'),
                ('growth_score', 'FLOAT', '0.0'),
                ('ai_risk_score', 'FLOAT', '0.0'),
                ('ai_completion_prediction', 'TIMESTAMP', 'NULL'),
                ('ai_resource_optimization', 'JSON', "'{}'"),
                ('ai_insights', 'JSON', "'{}'"),
                ('last_ai_update', 'TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('kpi_revenue', 'FLOAT', '0.0'),
                ('kpi_orders', 'INTEGER', '0'),
                ('kpi_clients', 'INTEGER', '0'),
                ('kpi_alerts', 'INTEGER', '0'),
                ('kpi_trends', 'JSON', "'{}'"),
                ('project_manager_id', 'INTEGER', 'NULL'),
                ('team_members', 'JSON', "'[]'"),
                ('start_date', 'TIMESTAMP', 'NULL'),
                ('end_date', 'TIMESTAMP', 'NULL')
            ]
            
            for col_name, col_type, default_val in columns_to_ensure:
                res = conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='{col_name}'"))
                if not res.fetchone():
                    logger.info(f"➕ Ajout de la colonne '{col_name}' ({col_type})...")
                    conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col_name} {col_type}"))
                    if default_val:
                        conn.execute(text(f"UPDATE projects SET {col_name} = {default_val} WHERE {col_name} IS NULL"))
            
            # Cas particuliers pour company_id et project_id
            conn.execute(text("UPDATE projects SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL"))
            conn.execute(text("UPDATE projects SET project_id = 'PROJ-' || id WHERE project_id IS NULL"))
            
            conn.commit()
            logger.info("🚀 Table 'projects' mise à jour avec succès (tous les champs AI/KPI inclus).")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la mise à jour: {e}")
            conn.rollback()

if __name__ == "__main__":
    fix_projects_table()
