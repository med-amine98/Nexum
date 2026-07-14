# app/services/email_service.py
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class EmailService:

    # =========================
    # SMTP CONFIG
    # =========================
    @staticmethod
    def _smtp_config():
        """Récupère la configuration SMTP depuis les variables d'environnement"""
        return {
            "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", 587)),
            "user": os.getenv("SMTP_USER"),
            "password": os.getenv("SMTP_PASSWORD"),
            "from_email": os.getenv("SMTP_FROM", os.getenv("SMTP_USER")),
            "starttls": os.getenv("SMTP_STARTTLS", "true").lower() == "true",
        }

    # =========================
    # CORE SEND EMAIL
    # =========================
    @staticmethod
    def send_email(to_email: str, subject: str, body: str, is_html: bool = False) -> Tuple[bool, str]:
        """
        Envoie un email via SMTP
        
        Args:
            to_email: Destinataire
            subject: Sujet
            body: Corps du message
            is_html: Si True, le corps est en HTML
        
        Returns:
            (success, message)
        """
        cfg = EmailService._smtp_config()

        # Vérifier que les credentials sont configurés
        if not cfg["user"] or not cfg["password"]:
            logger.error("❌ SMTP credentials manquantes")
            logger.info(f"📧 Simulation d'envoi à {to_email}: {subject}")
            return False, "SMTP non configuré"

        try:
            # Créer le message
            msg = MIMEMultipart()
            msg["From"] = f"Nexum ERP <{cfg['from_email']}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            # Attacher le corps
            msg.attach(MIMEText(body, "html" if is_html else "plain", "utf-8"))

            # Connexion SMTP
            logger.info(f"📧 Connexion à {cfg['host']}:{cfg['port']}...")
            
            with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
                server.ehlo()
                
                if cfg["starttls"]:
                    server.starttls()
                    server.ehlo()
                
                logger.info(f"🔐 Authentification avec {cfg['user']}...")
                server.login(cfg["user"], cfg["password"])
                
                logger.info(f"📤 Envoi à {to_email}...")
                server.send_message(msg)

            logger.info(f"✅ Email envoyé → {to_email}")
            return True, "Email envoyé avec succès"

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"❌ Erreur d'authentification SMTP: {e}")
            logger.info("💡 Vérifiez votre mot de passe et que l'accès aux applications moins sécurisées est activé")
            return False, f"Erreur d'authentification: {e}"
            
        except smtplib.SMTPException as e:
            logger.error(f"❌ Erreur SMTP: {e}")
            return False, f"Erreur SMTP: {e}"
            
        except Exception as e:
            logger.error(f"❌ Erreur inattendue: {e}")
            return False, str(e)

    # =========================
    # 📧 EMAILS PRÉDÉFINIS
    # =========================

    @staticmethod
    def send_welcome_email_with_credentials(email: str, name: str, password: str, sector: str) -> Tuple[bool, str]:
        """
        Email de bienvenue avec identifiants
        """
        sector_names = {
            "BANK": "Banque & Finance",
            "INSURANCE": "Assurance",
            "ENTERPRISE": "Entreprise",
            "bank": "Banque & Finance",
            "insurance": "Assurance",
            "enterprise": "Entreprise"
        }
        sector_name = sector_names.get(sector.upper(), "Entreprise")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px; }}
                .credentials {{ background: white; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea; }}
                .btn {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }}
                .footer {{ text-align: center; color: #999; font-size: 12px; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Bienvenue sur Nexum !</h1>
                    <p>Votre compte a été créé avec succès</p>
                </div>
                <div class="content">
                    <h2>Bonjour {name},</h2>
                    <p>Nous sommes ravis de vous accueillir sur la plateforme Nexum.</p>
                    
                    <div class="credentials">
                        <h3>📋 Vos identifiants de connexion</h3>
                        <p><strong>🌐 Secteur :</strong> {sector_name}</p>
                        <p><strong>📧 Email :</strong> {email}</p>
                        <p><strong>🔑 Mot de passe :</strong> <code style="background: #f0f0f0; padding: 4px 8px; border-radius: 4px;">{password}</code></p>
                        <p style="color: #f59e0b; font-size: 13px; margin-top: 10px;">⚠️ Nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
                    </div>
                    
                    <p style="text-align: center;">
                        <a href="http://localhost:3000/login" class="btn">🔐 Se connecter</a>
                    </p>
                    
                    <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <p style="margin: 0; color: #2e7d32;">
                            <strong>✅ Ce que vous pouvez faire :</strong>
                        </p>
                        <ul style="color: #2e7d32;">
                            <li>📊 Accéder à votre tableau de bord</li>
                            <li>🤖 Utiliser les assistants IA</li>
                            <li>📦 Gérer vos commandes</li>
                            <li>📈 Suivre vos performances</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p>© 2025 Nexum - Tous droits réservés</p>
                        <p style="font-size: 11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(email, f"Bienvenue sur Nexum - {sector_name}", html, True)

    @staticmethod
    def send_social_login_welcome(email: str, name: str, sector: str) -> Tuple[bool, str]:
        """
        Email de bienvenue pour les connexions sociales
        """
        sector_names = {
            "BANK": "Banque & Finance",
            "INSURANCE": "Assurance",
            "ENTERPRISE": "Entreprise",
            "banking": "Banque & Finance",
            "insurance": "Assurance",
            "enterprise": "Entreprise"
        }
        sector_name = sector_names.get(sector.upper() if sector else "ENTERPRISE", "Entreprise")
        
        html = f"""
        <div style="font-family:Arial;padding:20px;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
                <h1>🎉 Bienvenue sur Nexum !</h1>
                <p>Connexion via réseau social</p>
            </div>
            <div style="padding:30px;background:#f8f9fa;border-radius:0 0 10px 10px;">
                <h2>Bonjour {name},</h2>
                <p>Nous sommes ravis de vous accueillir sur Nexum !</p>
                <p>Vous vous êtes connecté via votre compte social. Votre espace a été automatiquement configuré pour le secteur : <strong>{sector_name}</strong></p>
                
                <div style="background:white;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #667eea;">
                    <h3>📋 Informations de votre compte</h3>
                    <p><strong>📧 Email :</strong> {email}</p>
                    <p><strong>🌐 Secteur :</strong> {sector_name}</p>
                </div>
                
                <p style="text-align:center;">
                    <a href="http://localhost:3000/dashboard" style="display:inline-block;padding:12px 24px;background:#667eea;color:white;text-decoration:none;border-radius:5px;">
                        🚀 Accéder à mon dashboard
                    </a>
                </p>
                
                <hr style="margin:30px 0;border-color:#e5e7eb;">
                <p style="color:#999;font-size:12px;text-align:center;">
                    © 2025 Nexum - Tous droits réservés
                </p>
            </div>
        </div>
        """
        
        return EmailService.send_email(email, f"Bienvenue sur Nexum - {sector_name}", html, True)

    @staticmethod
    def send_payment_confirmation(email: str, amount: float, plan_name: str, invoice_url: str = None) -> Tuple[bool, str]:
        """
        Email de confirmation de paiement
        """
        html = f"""
        <div style="font-family:Arial;padding:20px;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
                <h1>✅ Paiement confirmé !</h1>
            </div>
            <div style="padding:30px;background:#f8f9fa;border-radius:0 0 10px 10px;">
                <h2>Merci pour votre confiance !</h2>
                <p>Votre paiement a été traité avec succès.</p>
                
                <div style="background:white;padding:20px;border-radius:10px;margin:20px 0;">
                    <p><strong>💳 Montant :</strong> {amount}€</p>
                    <p><strong>📦 Plan :</strong> {plan_name}</p>
                    <p><strong>📅 Date :</strong> {datetime.now().strftime('%d/%m/%Y')}</p>
                </div>
                
                {f"<p><a href='{invoice_url}' style='display:inline-block;padding:10px 20px;background:#667eea;color:white;text-decoration:none;border-radius:5px;'>📄 Télécharger la facture</a></p>" if invoice_url else ""}
                
                <p>Votre abonnement est maintenant actif. Vous pouvez accéder à toutes les fonctionnalités de votre plan.</p>
                
                <hr style="margin:30px 0;border-color:#e5e7eb;">
                <p style="color:#999;font-size:12px;text-align:center;">
                    © 2025 Nexum - Tous droits réservés
                </p>
            </div>
        </div>
        """
        
        return EmailService.send_email(email, "Confirmation de paiement Nexum", html, True)

    @staticmethod
    def send_reset_password(email: str, reset_link: str) -> Tuple[bool, str]:
        """
        Email de réinitialisation de mot de passe
        """
        html = f"""
        <div style="font-family:Arial;padding:20px;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg, #f59e0b 0%, #d97706 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0;">
                <h1>🔐 Réinitialisation du mot de passe</h1>
            </div>
            <div style="padding:30px;background:#f8f9fa;border-radius:0 0 10px 10px;">
                <p>Bonjour,</p>
                <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
                
                <p style="text-align:center;margin:30px 0;">
                    <a href="{reset_link}" style="display:inline-block;padding:12px 24px;background:#f59e0b;color:white;text-decoration:none;border-radius:5px;">
                        🔑 Réinitialiser mon mot de passe
                    </a>
                </p>
                
                <p style="color:#6b7280;font-size:13px;">⚠️ Ce lien expire dans 15 minutes.</p>
                <p style="color:#6b7280;font-size:13px;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
                
                <hr style="margin:30px 0;border-color:#e5e7eb;">
                <p style="color:#999;font-size:12px;text-align:center;">
                    © 2025 Nexum - Tous droits réservés
                </p>
            </div>
        </div>
        """
        
        return EmailService.send_email(email, "Réinitialisation du mot de passe", html, True)


# =========================
# TEST
# =========================

def test_email():
    """Test l'envoi d'email"""
    print("=" * 60)
    print("📧 TEST D'ENVOI D'EMAIL")
    print("=" * 60)
    
    # Vérifier les variables d'environnement
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    print(f"SMTP_USER: {'✅' if smtp_user else '❌'} {smtp_user}")
    print(f"SMTP_PASSWORD: {'✅' if smtp_password else '❌'} (masked)")
    
    if not smtp_user or not smtp_password:
        print("\n❌ Configuration SMTP incomplète !")
        print("\n💡 Définissez les variables d'environnement :")
        print("   SMTP_USER=your_email@gmail.com")
        print("   SMTP_PASSWORD=your_app_password")
        return
    
    # Test d'envoi
    test_email = "test@example.com"  # Remplacez par votre email pour le test
    success, message = EmailService.send_email(
        to_email=test_email,
        subject="🧪 Test Nexum Email",
        body="<h1>Test</h1><p>Ceci est un email de test de Nexum ERP.</p>",
        is_html=True
    )
    
    print(f"\n📤 Envoi à {test_email}: {'✅' if success else '❌'}")
    print(f"   Message: {message}")


if __name__ == "__main__":
    test_email()


# Instance globale
email_service = EmailService()