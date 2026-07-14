# app/services/scheduler.py
import asyncio
import threading
import time
from datetime import datetime
from typing import Optional
import logging
logger = logging.getLogger(__name__)
from app.services.learning_service import learning_service

class LearningScheduler:
    """Planificateur pour l'apprentissage automatique"""
    
    def __init__(self):
        self.is_running = False
        self.interval_seconds = 3600  # 1 heure par défaut
        self._task: Optional[asyncio.Task] = None
    
    async def scheduled_learning(self):
        """Tâche planifiée pour l'apprentissage et la facturation"""
        
        while self.is_running:
            now = datetime.now()
            
            try:
                # 🔄 APPRENTISSAGE (Toutes les heures)
                logger.info(f"\n🔄 [{now.strftime('%H:%M:%S')}] CYCLE DE MAINTENANCE")
                logger.info("-" * 50)
                
                stats = learning_service.get_learning_stats()
                logger.info(f"📊 Apprentissage: {stats}")
                
                # 📅 FACTURATION (Une fois par jour à minuit)
                if now.hour == 0:
                    logger.info("💰 [MINUIT] Lancement de la facturation et des rappels...")
                    from app.database import SessionLocal
                    from app.services.billing_service import billing_service
                    db = SessionLocal()
                    try:
                        # 1. Facturation auto (7 jours avant)
                        results = billing_service.check_expiring_subscriptions(db)
                        # 2. Rappels (3j et 0j avant)
                        reminders = billing_service.send_expiration_reminders(db)
                        # 3. Terminaisons après grâce
                        terminations = billing_service.process_grace_period_terminations(db)
                        logger.info(f"✅ {len(results)} factures, {reminders} rappels et {terminations} suspensions.")
                    finally:
                        db.close()
                
                logger.info(f"✅ Cycle de maintenance terminé")
                
            except Exception as e:
                logger.error(f"❌ Erreur dans scheduler: {e}")
            
            # Attendre 1 heure (3600s)
            await asyncio.sleep(3600)
    
    def start(self, interval_seconds: int = 3600):
        """Démarre le planificateur"""
        if self.is_running:
            logger.warning("⚠️ Le planificateur est déjà en cours d'exécution")
            return
        
        self.interval_seconds = interval_seconds
        self.is_running = True
        
        # Démarrer dans le loop actuel
        try:
            self._task = asyncio.create_task(self.scheduled_learning())
            logger.info(f"🚀 Planificateur démarré (intervalle: {interval_seconds // 60} minutes)")
        except Exception as e:
            logger.error(f"❌ Impossible de démarrer le planificateur: {e}")
    
    def stop(self):
        """Arrête le planificateur"""
        self.is_running = False
        if self._task:
            self._task.cancel()
        logger.info("🛑 Planificateur arrêté")

# Instance globale
scheduler = LearningScheduler()

def start_scheduler():
    """Démarre le planificateur au lancement de l'application"""
    scheduler.start()

def stop_scheduler():
    """Arrête le planificateur"""
    scheduler.stop()