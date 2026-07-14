from app.database import engine
from app.models.document_intelligence import Document

def recreate_table():
    logger.info("🔨 Recréation de la table documents...")
    
    logger.info("   Suppression de l'ancienne table...")
    Document.__table__.drop(bind=engine, checkfirst=True)
    logger.info("   ✅ Ancienne table supprimée")
    
    logger.info("   Création de la nouvelle table...")
    Document.__table__.create(bind=engine)
    logger.info("   ✅ Nouvelle table créée")
    
    logger.info("\n✅ Table documents recréée avec succès !")
    logger.info("   Structure de la table :")
    for column in Document.__table__.columns:
        logger.info(f"   - {column.name}: {column.type}")

if __name__ == "__main__":
    recreate_table()
