from app.database import Base, engine
from app.models import *
Base.metadata.create_all(bind=engine)
logger.info("✅ Toutes les tables ont été créées avec succès")
