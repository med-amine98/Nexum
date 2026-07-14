"""
Migration : Ajout de company_id et user_id sur conversations, messages et tasks
pour garantir l'isolation des données par entreprise (multi-tenant).

Exécuter avec : python migrate_assistant_company_id.py
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from app.config import settings

DATABASE_URL = settings.DATABASE_URL
# Si le script est exécuté depuis l'hôte Windows (en dehors de Docker), remplacer "postgres" par "localhost"
if "@postgres:" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("@postgres:", "@localhost:")

engine = create_engine(DATABASE_URL)


def safe_add_column(conn, table: str, column: str, col_type: str, extra: str = ""):
    """Ajoute une colonne si elle n'existe pas déjà et si la table existe."""
    # Check if table exists
    table_check = text("SELECT tablename FROM pg_tables WHERE tablename = :table")
    if not conn.execute(table_check, {"table": table}).fetchone():
        print(f"  [i] Table {table} n'existe pas, on passe.")
        return

    check = text(f"""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = :table AND column_name = :col
    """)
    result = conn.execute(check, {"table": table, "col": column})
    if not result.fetchone():
        stmt = f"ALTER TABLE {table} ADD COLUMN {column} {col_type} {extra};"
        conn.execute(text(stmt))
        print(f"  [+] {table}.{column} ajoute")
    else:
        print(f"  [i] {table}.{column} deja present")


def safe_add_index(conn, index_name: str, table: str, column: str):
    """Crée un index si il n'existe pas et si la table existe."""
    # Check if table exists
    table_check = text("SELECT tablename FROM pg_tables WHERE tablename = :table")
    if not conn.execute(table_check, {"table": table}).fetchone():
        print(f"  [i] Table {table} n'existe pas, on passe l'index.")
        return

    check = text(f"""
        SELECT indexname FROM pg_indexes
        WHERE tablename = :table AND indexname = :idx
    """)
    result = conn.execute(check, {"table": table, "idx": index_name})
    if not result.fetchone():
        conn.execute(text(f"CREATE INDEX {index_name} ON {table} ({column});"))
        print(f"  [+] Index {index_name} cree")
    else:
        print(f"  [i] Index {index_name} deja present")


def run_migration():
    with engine.begin() as conn:
        print("\n Migration: Isolation multi-tenant pour les assistants\n")

        # ── TABLE: conversations ──────────────────────────────────────────────
        print(" Table: conversations")
        safe_add_column(conn, "conversations", "company_id", "INTEGER", "REFERENCES companies(id) ON DELETE SET NULL")
        safe_add_column(conn, "conversations", "user_id", "INTEGER", "REFERENCES users(id) ON DELETE SET NULL")
        safe_add_index(conn, "idx_conversations_company_id", "conversations", "company_id")
        safe_add_index(conn, "idx_conversations_user_id", "conversations", "user_id")

        # ── TABLE: messages ───────────────────────────────────────────────────
        print("\n Table: messages")
        safe_add_column(conn, "messages", "company_id", "INTEGER", "REFERENCES companies(id) ON DELETE SET NULL")
        safe_add_column(conn, "messages", "user_id", "INTEGER", "REFERENCES users(id) ON DELETE SET NULL")
        safe_add_column(conn, "messages", "metadata", "JSONB", "DEFAULT '{}'")
        safe_add_index(conn, "idx_messages_company_id", "messages", "company_id")
        safe_add_index(conn, "idx_messages_user_id", "messages", "user_id")

        # ── TABLE: assistants ─────────────────────────────────────────────────
        print("\n Table: assistants")
        # company_id était nullable=True mais sans FK — on s'assure qu'il existe
        safe_add_column(conn, "assistants", "company_id", "INTEGER", "REFERENCES companies(id) ON DELETE SET NULL")
        safe_add_index(conn, "idx_assistants_company_id", "assistants", "company_id")

        # ── TABLE: tasks ──────────────────────────────────────────────────────
        print("\n Table: tasks")
        safe_add_column(conn, "tasks", "company_id", "INTEGER", "REFERENCES companies(id) ON DELETE SET NULL")
        safe_add_column(conn, "tasks", "user_id", "INTEGER", "REFERENCES users(id) ON DELETE SET NULL")
        safe_add_index(conn, "idx_tasks_company_id", "tasks", "company_id")

        print("\n Migration terminee avec succes !")


if __name__ == "__main__":
    run_migration()
