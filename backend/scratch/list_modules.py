import os
import sys
os.environ["POSTGRES_HOST"] = "127.0.0.1"
os.environ["DATABASE_URL"] = "postgresql://odoo:odoo@127.0.0.1:5432/erp"

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.module import Module, UserModule

db = SessionLocal()

logger.info("--- ALL MODULES IN DB ---")
mods = db.query(Module).all()
for m in mods:
    logger.info(f"ID: {m.id}, Key: {m.key}, Name: {m.name}, Price: {m.price}, Currency: {m.currency}")

db.close()
