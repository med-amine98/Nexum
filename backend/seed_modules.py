from app.database import SessionLocal
from app.services.module_service import ModuleService

def seed():
    db = SessionLocal()
    try:
        service = ModuleService(db)
        service.seed_initial_data()
        logger.info("Database seeded successfully!")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
