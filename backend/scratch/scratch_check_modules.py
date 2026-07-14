from app.database import SessionLocal
from app.models.module import Module, UserModule

db = SessionLocal()

logger.info("--- ALL MODULES ---")
modules = db.query(Module).all()
for m in modules:
    logger.info(f"ID: {m.id} | Key: {m.key} | Name: {m.name} | Free: {m.is_free} | Price: {m.price} {m.currency} | Installed: {m.is_installed}")

logger.info("\n--- USER MODULES ---")
user_modules = db.query(UserModule).all()
for um in user_modules:
    logger.info(f"ID: {um.id} | Module ID: {um.module_id} | Co ID: {um.company_id} | Paid: {um.is_paid} | Installed: {um.is_installed}")

db.close()
