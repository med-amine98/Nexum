from app.database import SessionLocal
from app.models.sale import SaleOrder, OrderStatus

db = SessionLocal()
try:
    total = db.query(SaleOrder).count()
    logger.info(f"Total SaleOrders: {total}")
    
    statuses = db.query(SaleOrder.status).distinct().all()
    logger.info(f"Distinct statuses in DB: {[s[0] for s in statuses]}")
    
    # Check states too as there is both state and status
    states = db.query(SaleOrder.state).distinct().all()
    logger.info(f"Distinct states in DB: {[s[0] for s in states]}")
    
    for s in ["draft", "confirmed", "brouillon", "confirmé"]:
        count = db.query(SaleOrder).filter(SaleOrder.status == s).count()
        logger.info(f"Status '{s}': {count}")

finally:
    db.close()
