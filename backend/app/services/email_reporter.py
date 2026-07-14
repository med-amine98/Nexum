# backend/app/services/email_reporter.py
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import List, Optional

logger = logging.getLogger(__name__)


def send_email_report(
    subject: str,
    body: str,
    recipients: List[str],
    attachment_path: Optional[str] = None
) -> bool:
    """
    Envoie un rapport par email
    
    Args:
        subject: Sujet de l'email
        body: Corps du message
        recipients: Liste des destinataires
        attachment_path: Chemin du fichier à attacher (optionnel)
    
    Returns:
        True si l'envoi a réussi, False sinon
    """
    
    # Configuration SMTP depuis variables d'environnement
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", 587))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", smtp_user)
    
    if not smtp_user or not smtp_password:
        logger.warning("⚠️ Configuration SMTP manquante, email non envoyé")
        logger.info(f"📧 Simulation d'envoi d'email à {recipients}: {subject}")
        return False
    
    try:
        # Créer le message
        msg = MIMEMultipart()
        msg['From'] = smtp_from
        msg['To'] = ', '.join(recipients)
        msg['Subject'] = subject
        
        # Corps du message
        msg.attach(MIMEText(body, 'plain'))
        
        # Attacher un fichier si spécifié
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, 'rb') as f:
                part = MIMEBase('application', 'octet-stream')
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename={os.path.basename(attachment_path)}'
                )
                msg.attach(part)
        
        # Envoyer l'email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logger.info(f"✅ Email envoyé à {recipients}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur envoi email: {e}")
        return False


def send_kpi_report_email(
    report_path: str,
    recipients: List[str],
    period: str = "daily"
) -> bool:
    """
    Envoie un rapport KPI par email
    
    Args:
        report_path: Chemin du fichier rapport
        recipients: Liste des destinataires
        period: Période du rapport (daily, weekly, monthly)
    
    Returns:
        True si l'envoi a réussi
    """
    from datetime import datetime
    
    subject = f"📊 Rapport KPI {period} - {datetime.now().strftime('%Y-%m-%d')}"
    body = f"""
Bonjour,

Veuillez trouver ci-joint le rapport KPI {period} du {datetime.now().strftime('%d/%m/%Y')}.

Ce rapport contient les indicateurs clés de performance:
- Chiffre d'affaires
- Commandes
- Clients
- Risques détectés

Cordialement,
L'équipe Neura ERP
    """
    
    return send_email_report(subject, body.strip(), recipients, report_path)