import os
from datetime import datetime, timedelta
try:
    from fpdf import FPDF
    FPDF_AVAILABLE = True
except ImportError:
    FPDF_AVAILABLE = False
    FPDF = None
from app.models.company import Company
import logging
logger = logging.getLogger(__name__)
class BillingService:
    def __init__(self):
        self.invoice_dir = "storage/invoices"
        os.makedirs(self.invoice_dir, exist_ok=True)

    def generate_invoice_pdf(self, company: Company, amount: float, tier: str):
        """Génère une facture PDF professionnelle pour une entreprise"""
        if not FPDF_AVAILABLE:
            logger.warning(f"⚠️ PDF non disponible pour {company.name} (FPDF manquant)")
            return {"filename": None, "path": None}
            
        pdf = FPDF()
        pdf.add_page()
        
        # --- EN-TÊTE ---
        # Logo (Placeholder or default Nexum)
        # pdf.image("app/static/logo.png", 10, 8, 33) 
        
        pdf.set_font("helvetica", "B", 24)
        pdf.set_text_color(65, 88, 208) # Nexum Blue
        pdf.cell(0, 20, "NEXUM INTELLIGENCE HUB", 0, 1, "R")
        
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(100, 100, 100)
        pdf.cell(0, 5, "L'excellence par l'IA et la Blockchain", 0, 1, "R")
        pdf.ln(10)
        
        # --- INFOS SOCIÉTÉ ---
        pdf.set_font("helvetica", "B", 12)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(100, 10, "ÉMETTEUR", 0, 0)
        pdf.cell(0, 10, "CLIENT", 0, 1)
        
        pdf.set_font("helvetica", "", 10)
        # Colonne Gauche (Nexum)
        y_start = pdf.get_y()
        pdf.multi_cell(100, 5, "Nexum SAS\n123 Rue de la Technologie\n75001 Paris, France\nSIRET: 123 456 789 00012\nVAT: FR 12 345678901")
        
        # Colonne Droite (Client)
        pdf.set_xy(110, y_start)
        pdf.multi_cell(0, 5, f"{company.name}\n{company.address or 'Adresse non renseignée'}\n{company.city or ''} {company.postal_code or ''}\n{company.country or ''}\nEmail: {company.email or 'N/A'}")
        pdf.ln(10)
        
        # --- DÉTAILS FACTURE ---
        pdf.set_fill_color(65, 88, 208)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 11)
        pdf.cell(120, 10, " Description du service", 1, 0, "L", True)
        pdf.cell(35, 10, " Période", 1, 0, "C", True)
        pdf.cell(35, 10, " Prix (EUR)", 1, 1, "C", True)
        
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "", 10)
        pdf.cell(120, 12, f" Abonnement Nexum ERP - Tier {tier.upper()}", 1)
        pdf.cell(35, 12, " Mensuel", 1, 0, "C")
        pdf.cell(35, 12, f" {amount} EUR", 1, 1, "C")
        
        pdf.ln(10)
        
        # --- RÉCAPITULATIF ---
        pdf.set_font("helvetica", "B", 12)
        pdf.cell(120, 10, "", 0)
        pdf.cell(35, 10, "Total HT:", 0, 0, "R")
        pdf.cell(35, 10, f"{amount} EUR", 0, 1, "R")
        
        pdf.cell(120, 10, "", 0)
        pdf.cell(35, 10, "TVA (20%):", 0, 0, "R")
        pdf.cell(35, 10, f"{amount * 0.2:.2f} EUR", 0, 1, "R")
        
        pdf.set_font("helvetica", "B", 14)
        pdf.set_text_color(65, 88, 208)
        pdf.cell(120, 10, "", 0)
        pdf.cell(35, 10, "TOTAL TTC:", 0, 0, "R")
        pdf.cell(35, 10, f"{amount * 1.2:.2f} EUR", 0, 1, "R")
        
        # --- CONDITIONS ---
        pdf.ln(20)
        pdf.set_text_color(0, 0, 0)
        pdf.set_font("helvetica", "B", 10)
        pdf.cell(0, 10, "CONDITIONS DE PAIEMENT", 0, 1)
        pdf.set_font("helvetica", "", 9)
        pdf.multi_cell(0, 5, "Paiement dû sous 15 jours à réception de cette facture.\nMoyen de paiement : Virement bancaire ou prélèvement automatique.\nIBAN: FR76 1234 5678 9012 3456 7890 123\nBIC: NEXUMFRPP")
        
        # --- FOOTER ---
        filename = f"invoice_{company.id}_{datetime.now().strftime('%Y%m%d%H%M')}.pdf"
        filepath = os.path.join(self.invoice_dir, filename)
        pdf.output(filepath)
        
        # Envoi Email
        if company.email:
            from app.services.email_service import email_service
            subject = f"Votre facture Nexum ERP - {company.name}"
            body = f"""
            <html>
                <body>
                    <h2>Bonjour {company.name},</h2>
                    <p>Votre abonnement <b>{tier.upper()}</b> arrive à échéance prochainement.</p>
                    <p>Veuillez trouver ci-joint votre facture d'un montant de <b>{amount} EUR</b>.</p>
                    <p>Merci de votre confiance.</p>
                    <br/>
                    <p>L'équipe Nexum AI</p>
                </body>
            </html>
            """
            email_service.send_email_with_attachment(company.email, subject, body, filepath)

        return {
            "filename": filename,
            "path": filepath,
            "generated_at": datetime.now().isoformat()
        }

    def check_expiring_subscriptions(self, db_session):
        """Vérifie les abonnements expirant bientôt et génère les factures (7j avant)"""
        threshold = datetime.now() + timedelta(days=7)
        # On prend celles qui expirent exactement dans 7 jours pour ne générer qu'une fois
        expiring_companies = db_session.query(Company).filter(
            Company.subscription_expires >= threshold.replace(hour=0, minute=0, second=0),
            Company.subscription_expires <= threshold.replace(hour=23, minute=59, second=59),
            Company.is_active == True
        ).all()
        
        results = []
        for company in expiring_companies:
            prices = {"free": 0, "standard": 99, "premium": 299, "enterprise": 999}
            amount = prices.get(company.subscription_tier, 99)
            
            if amount > 0:
                invoice = self.generate_invoice_pdf(company, amount, company.subscription_tier)
                results.append({
                    "company_id": company.id,
                    "company_name": company.name,
                    "invoice": invoice
                })
        return results

    def send_expiration_reminders(self, db_session):
        """Envoie des rappels d'expiration (3j avant et le jour J)"""
        now = datetime.now()
        
        # 1. Rappel Urgent à 3 jours
        remind_3j = now + timedelta(days=3)
        companies_3j = db_session.query(Company).filter(
            Company.subscription_expires >= remind_3j.replace(hour=0, minute=0, second=0),
            Company.subscription_expires <= remind_3j.replace(hour=23, minute=59, second=59),
            Company.is_active == True
        ).all()

        # 2. Jour J (Suspension imminente)
        companies_0j = db_session.query(Company).filter(
            Company.subscription_expires >= now.replace(hour=0, minute=0, second=0),
            Company.subscription_expires <= now.replace(hour=23, minute=59, second=59),
            Company.is_active == True
        ).all()

        from app.services.email_service import email_service
        
        for company in companies_3j:
            subject = f"🚨 [NEXUM] Urgent : Votre abonnement expire dans 3 jours"
            body = f"Bonjour {company.name}, votre accès aux modules IA de Nexum sera suspendu dans 3 jours. Veuillez valider votre renouvellement."
            email_service.send_email(company.email, subject, body)
            
        for company in companies_0j:
            subject = f"⛔ [NEXUM] Dernier jour : Votre abonnement expire AUJOURD'HUI"
            body = f"Bonjour {company.name}, votre abonnement expire aujourd'hui. Une période de grâce de 48h a été activée pour éviter toute interruption de service."
            email_service.send_email(company.email, subject, body)
            
            # Activer la période de grâce
            company.grace_period_until = now + timedelta(hours=48)
            db_session.commit()

        return len(companies_3j) + len(companies_0j)

    def process_grace_period_terminations(self, db_session):
        """Désactive les entreprises dont la période de grâce est expirée"""
        now = datetime.now()
        expired_grace = db_session.query(Company).filter(
            Company.grace_period_until <= now,
            Company.is_active == True
        ).all()
        
        for company in expired_grace:
            company.is_active = False
            company.grace_period_until = None
            # Optionnel: Envoyer un email de suspension
            from app.services.email_service import email_service
            subject = "🚫 [NEXUM] Suspension de vos services"
            body = f"Bonjour {company.name}, votre période de grâce est terminée. Vos accès ont été suspendus. Veuillez régulariser votre situation."
            email_service.send_email(company.email, subject, body)
            
        db_session.commit()
        return len(expired_grace)

billing_service = BillingService()
