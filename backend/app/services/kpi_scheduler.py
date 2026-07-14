# backend/app/services/kpi_scheduler.py
import logging
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services.email_reporter import send_email_report
from app.core.database import SessionLocal
from app.services.kpi_report import generate_kpi_report

logger = logging.getLogger(__name__)

# Scheduler instance (module‑level singleton)
_scheduler = BackgroundScheduler()


def _job_generate_and_send():
    """Generate the daily KPI PDF and email it to the configured recipients.
    This function is executed by the APScheduler at 02:00 each day.
    """
    logger.info("🚀 KPI job started")
    try:
        # 1️⃣ Create a DB session
        db = SessionLocal()
        # 2️⃣ Generate the report (returns path to PDF)
        pdf_path = generate_kpi_report(db)
        db.close()
        if not pdf_path:
            logger.error("❌ KPI report generation failed – no PDF produced")
            return
        # 3️⃣ Send email – recipients are defined in the config (SMTP settings)
        subject = f"📊 Daily KPI Report – {datetime.utcnow().strftime('%Y-%m-%d')}"
        body = "Please find attached the daily KPI report."
        # The email_reporter utility expects a list of recipient emails.
        # For simplicity we read a comma‑separated env var `KPI_RECIPIENTS`.
        from app.config import settings
        recipients = []
        if getattr(settings, "KPI_RECIPIENTS", None):
            recipients = [r.strip() for r in settings.KPI_RECIPIENTS.split(",") if r.strip()]
        else:
            logger.warning("⚠️ KPI_RECIPIENTS not configured – email not sent")
            return
        # Attach the PDF by passing its absolute path
        send_email_report(subject, body, recipients, attachment_path=pdf_path)
        logger.info("✅ KPI report emailed to %s", ", ".join(recipients))
    except Exception as e:
        logger.exception("❌ Unexpected error in KPI job: %s", e)


def start_kpi_job():
    """Configure and start the daily KPI scheduler.
    Called from `app/main.py` during application startup.
    """
    # Avoid double‑adding the job if the scheduler is already running.
    if _scheduler.running:
        logger.info("⏭️ KPI scheduler already running – skipping start")
        return
    # Schedule at 02:00 every day.
    trigger = CronTrigger(hour=2, minute=0)
    _scheduler.add_job(_job_generate_and_send, trigger, id="daily_kpi", replace_existing=True)
    _scheduler.start()
    logger.info("✅ KPI scheduler started – daily job at 02:00")


def stop_kpi_job():
    """Gracefully shut down the KPI scheduler (called on app shutdown)."""
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("🛑 KPI scheduler stopped")