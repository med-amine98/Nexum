import os
import sys
# Force PostgreSQL host to localhost when running outside of docker
os.environ["POSTGRES_HOST"] = "127.0.0.1"
os.environ["DATABASE_URL"] = "postgresql://odoo:odoo@127.0.0.1:5432/erp"

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.module import Module, UserModule
from app.models.auth import User
from app.models.company import Company

db = SessionLocal()

logger.info("--- COMPANIES ---")
companies = db.query(Company).all()
for c in companies:
    logger.info(f"Company ID: {c.id}, Name: {c.name}, Sub Tier: {c.subscription_tier}, Expires: {c.subscription_expires}")

logger.info("\n--- USERS ---")
users = db.query(User).all()
for u in users:
    logger.info(f"User ID: {u.id}, Email: {u.email}, Company ID: {u.company_id}")

logger.info("\n--- INSTALLED USER MODULES ---")
um = db.query(UserModule).all()
for u in um:
    logger.info(f"UserModule ID: {u.id}, User ID: {u.user_id}, Module ID: {u.module_id}, Installed: {u.is_installed}, Paid: {u.is_paid}, Company: {u.company_id}")

logger.info("\n--- ALL MODULES ---")
mods = db.query(Module).all()
logger.info(f"Total modules: {len(mods)}")
for m in mods[:10]:
    logger.info(f"Module ID: {m.id}, Key: {m.key}, Name: {m.name}")
if len(mods) > 10:
    logger.info("...")

db.close()
