# app/core/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import subprocess
import os
import requests
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# ---- Tâche 1 : Mise à jour des connaissances (Qdrant) ----
def update_knowledge():
    """Exécute le script de peuplement des collections Qdrant."""
    script_path = "/app/populate_qdrant_local.py"
    if os.path.exists(script_path):
        try:
            subprocess.run(["python", script_path], check=True)
            logger.info("✅ Mise à jour des connaissances effectuée")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Erreur lors de l'exécution du script : {e}")
    else:
        logger.warning("⚠️ Script de mise à jour introuvable")

# ---- Tâche 2 : Génération de rapport hebdomadaire ----
def generate_weekly_report():
    """
    Génère un rapport de risques (via l'assistant Risk) et le stocke dans MinIO.
    """
    try:
        # Interroger l'assistant Risk via l'API interne
        response = requests.post(
            "http://localhost:8000/api/v1/assistants/chat",
            json={"agent_name": "risk", "query": "Donne-moi un rapport de risques pour la semaine", "user_id": 1},
            timeout=30
        )
        if response.status_code == 200:
            data = response.json()
            report_text = data.get("response", "Aucun rapport généré")
            # Stocker dans MinIO
            from app.minio_client import get_minio_service
            minio = get_minio_service()
            object_name = f"reports/risk_report_{datetime.now().strftime('%Y%m%d')}.txt"
            minio.upload_bytes(
                bucket_name="erp-analytics",
                object_name=object_name,
                data=report_text.encode('utf-8'),
                content_type="text/plain"
            )
            logger.info(f"✅ Rapport généré et stocké dans MinIO : {object_name}")
        else:
            logger.error(f"❌ Erreur API : {response.status_code} - {response.text}")
    except Exception as e:
        logger.error(f"❌ Erreur lors de la génération du rapport : {e}")

# ---- Création du scheduler avec les deux tâches ----
scheduler = BackgroundScheduler()

# Mise à jour des connaissances tous les jours à 3h du matin
scheduler.add_job(
    update_knowledge,
    CronTrigger(hour=3, minute=0),
    id="update_knowledge",
    replace_existing=True
)

# Rapport hebdomadaire tous les lundis à 8h
scheduler.add_job(
    generate_weekly_report,
    CronTrigger(day_of_week='mon', hour=8),
    id="weekly_report",
    replace_existing=True
)

scheduler.start()

# ---- Arrêt propre à la fermeture ----
import atexit
atexit.register(lambda: scheduler.shutdown())