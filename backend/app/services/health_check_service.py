import logging
from app.core.database import engine
from app.qdrant_service import client as qdrant_client
from app.neo4j_service import driver as neo4j_driver
from app.config import settings
from app.email_reporter import send_email_report
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

def check_qdrant():
    try:
        qdrant_client.get_collections()
        logger.info("✅ Qdrant connection OK")
        return True
    except Exception as e:
        logger.error(f"❌ Qdrant health check failed: {e}")
        return False

def check_postgres():
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("✅ PostgreSQL connection OK")
        return True
    except Exception as e:
        logger.error(f"❌ PostgreSQL health check failed: {e}")
        return False

def check_neo4j():
    try:
        with neo4j_driver.session() as session:
            session.run("RETURN 1")
        logger.info("✅ Neo4j connection OK")
        return True
    except Exception as e:
        logger.error(f"❌ Neo4j health check failed: {e}")
        return False

def check_openai():
    if not getattr(settings, "OPENAI_API_KEY", None):
        logger.warning("⚠️ OpenAI API key not set – skipping OpenAI health check")
        return True
    try:
        import openai
        openai.api_key = settings.OPENAI_API_KEY
        openai.Model.list()
        logger.info("✅ OpenAI connection OK")
        return True
    except Exception as e:
        logger.error(f"❌ OpenAI health check failed: {e}")
        return False

def run_health_checks():
    failures = []
    if not check_qdrant():
        failures.append("Qdrant")
    if not check_postgres():
        failures.append("PostgreSQL")
    if not check_neo4j():
        failures.append("Neo4j")
    if not check_openai():
        failures.append("OpenAI")
    if failures:
        subject = "🚨 Service Health Alert"
        body = f"<p>The following services reported issues at {datetime.utcnow().isoformat()} UTC:</p><ul>{''.join([f'<li>{s}</li>' for s in failures])}</ul>"
        recipients = getattr(settings, "ADMIN_EMAILS", [])
        if recipients:
            try:
                send_email_report(subject, body, recipients)
                logger.info("⚠️ Alert email sent to administrators")
            except Exception as e:
                logger.error(f"❌ Failed to send alert email: {e}")
        else:
            logger.warning("⚠️ No ADMIN_EMAILS configured – cannot send alert email")
    else:
        logger.info("✅ All services healthy")

_scheduler = None

def start_health_check_scheduler():
    global _scheduler
    if _scheduler:
        logger.warning("⚠️ Health check scheduler already running")
        return _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(run_health_checks, "interval", minutes=5, id="health_check_job", replace_existing=True)
    _scheduler.start()
    logger.info("🚀 Health check scheduler started (every 5 minutes)")
    return _scheduler

def stop_health_check_scheduler():
    global _scheduler
    if _scheduler:
        _scheduler.shutdown()
        logger.info("🛑 Health check scheduler stopped")
        _scheduler = None
