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
        Envoie un email via SMTP avec logs détaillés
        """
        cfg = EmailService._smtp_config()

        print("\n" + "=" * 60)
        print("📧 TENTATIVE D'ENVOI D'EMAIL")
        print("=" * 60)
        print(f"   To: {to_email}")
        print(f"   Subject: {subject}")
        print(f"   SMTP Host: {cfg['host']}:{cfg['port']}")
        print(f"   SMTP User: {cfg['user']}")
        print(f"   SMTP Password: {'✅' if cfg['password'] else '❌'}")
        print("=" * 60)

        if not cfg["user"] or not cfg["password"]:
            logger.error("SMTP credentials missing")
            return False, "SMTP non configuré"

        try:
            msg = MIMEMultipart()
            msg["From"] = f"Nexum ERP <{cfg['from_email']}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "html" if is_html else "plain", "utf-8"))

            print(f"🔌 Connexion à {cfg['host']}:{cfg['port']}...")
            
            with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
                server.ehlo()
                print("📡 EHLO envoyé")

                if cfg["starttls"]:
                    print("🔒 STARTTLS...")
                    server.starttls()
                    server.ehlo()

                print(f"🔐 Authentification avec {cfg['user']}...")
                server.login(cfg["user"], cfg["password"])
                
                print(f"📤 Envoi à {to_email}...")
                server.send_message(msg)

            print("✅ Email envoyé avec succès !")
            print("=" * 60 + "\n")
            
            logger.info(f"✅ Email envoyé → {to_email}")
            return True, "Email envoyé"

        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ Erreur d'authentification: {e}")
            print("💡 Vérifiez votre mot de passe et activez l'accès aux applications moins sécurisées")
            logger.error(f"❌ Erreur d'authentification SMTP: {e}")
            return False, f"Erreur d'authentification: {e}"

        except smtplib.SMTPException as e:
            print(f"❌ Erreur SMTP: {e}")
            logger.error(f"❌ Erreur SMTP: {e}")
            return False, f"Erreur SMTP: {e}"

        except Exception as e:
            print(f"❌ Erreur inattendue: {e}")
            logger.error(f"❌ Erreur inattendue: {e}")
            return False, str(e)

    # =========================
    # 🟢 ERP EMAILS (SAAS READY)
    # =========================

    @staticmethod
    def send_welcome_email(email: str, name: str):
        """Email de bienvenue simple"""
        html = f"""
        <div style="font-family:Arial;padding:20px">
            <h2>Bienvenue {name} 👋</h2>
            <p>Votre compte ERP a été créé avec succès.</p>
            <p>Vous pouvez maintenant vous connecter à votre dashboard.</p>
            <br>
            <b>Nexum ERP System</b>
        </div>
        """
        return EmailService.send_email(email, "Bienvenue sur Nexum ERP", html, True)

    @staticmethod
    def send_welcome_email_with_credentials(email: str, name: str, password: str, sector: str):
        """
        Email de bienvenue avec identifiants et secteur
        """
        sector_names = {
            "BANK": "Banque & Finance",
            "INSURANCE": "Assurance",
            "ENTERPRISE": "Entreprise"
        }
        sector_name = sector_names.get(sector, "Entreprise")
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 30px; }}
                .credentials {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea; }}
                .credentials p {{ margin: 8px 0; }}
                .credentials code {{ background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; }}
                .btn {{ display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .btn-success {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); }}
                .btn-container {{ text-align: center; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; }}
                .sector-badge {{ display: inline-block; padding: 4px 12px; background: #667eea20; color: #667eea; border-radius: 20px; font-size: 14px; font-weight: bold; }}
                .login-section {{ background: #f0f7ff; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px solid #dbeafe; }}
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
                    <p>Nous sommes ravis de vous accueillir sur Nexum. Votre compte a été créé avec succès.</p>
                    
                    <div class="credentials">
                        <h3>📋 Vos identifiants de connexion</h3>
                        <p><strong>🌐 Secteur :</strong> <span class="sector-badge">{sector_name}</span></p>
                        <p><strong>📧 Email :</strong> {email}</p>
                        <p><strong>🔑 Mot de passe :</strong> <code>{password}</code></p>
                    </div>
                    
                    <div class="login-section">
                        <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                            🚀 Accédez à votre dashboard {sector_name}
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
                            Cliquez sur le bouton ci-dessous pour vous connecter
                        </p>
                        <div class="btn-container">
                            <a href="{frontend_url}/login?email={email}&sector={sector}" class="btn">🔐 Se connecter</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">
                            Vous serez automatiquement redirigé vers votre tableau de bord.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Nexum - Tous droits réservés</p>
                    <p style="font-size: 11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(email, f"Bienvenue sur Nexum - {sector_name}", html, True)

    @staticmethod
    def send_social_login_welcome(email: str, name: str, sector: str):
        """
        Email de bienvenue pour les connexions sociales
        """
        sector_names = {
            "BANK": "Banque & Finance",
            "INSURANCE": "Assurance",
            "ENTERPRISE": "Entreprise"
        }
        sector_name = sector_names.get(sector, "Entreprise")
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")
        password = os.getenv("TEMP_PASSWORD", "Mot de passe temporaire")  # À remplacer par un vrai mot de passe
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .content {{ padding: 30px; }}
                .info-box {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea; }}
                .info-box p {{ margin: 8px 0; }}
                .btn {{ display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }}
                .btn-success {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); }}
                .btn-container {{ text-align: center; margin: 20px 0; }}
                .footer {{ text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; }}
                .sector-badge {{ display: inline-block; padding: 4px 12px; background: #667eea20; color: #667eea; border-radius: 20px; font-size: 14px; font-weight: bold; }}
                .verify-box {{ background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }}
                .login-section {{ background: #f0f7ff; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px solid #dbeafe; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Bienvenue sur Nexum !</h1>
                    <p>Connexion via réseau social</p>
                </div>
                <div class="content">
                    <h2>Bonjour {name},</h2>
                    <p>Nous sommes ravis de vous accueillir sur Nexum !</p>
                    <p>Vous vous êtes connecté via votre compte social. Votre espace a été automatiquement configuré pour le secteur : <strong>{sector_name}</strong></p>
                    
                    <div class="info-box">
                        <h3>📋 Informations de votre compte</h3>
                        <p><strong>🌐 Secteur :</strong> <span class="sector-badge">{sector_name}</span></p>
                        <p><strong>📧 Email :</strong> {email}</p>
                    </div>
                    
                    <div class="verify-box">
                        <h3>📧 Vérifiez votre email</h3>
                        <p>Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
                        <div class="btn-container">
                            <a href="{frontend_url}/login?email={email}&sector={sector}" class="btn btn-success">✅ Vérifier mon email</a>
                        </div>
                    </div>
                    
                    <div class="login-section">
                        <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                            🚀 Accédez à votre dashboard {sector_name}
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
                            Cliquez sur le bouton ci-dessous pour vous connecter
                        </p>
                        <div class="btn-container">
                            <a href="{frontend_url}/login?email={email}&sector={sector}" class="btn">🔐 Se connecter</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">
                            Vous serez automatiquement redirigé vers votre tableau de bord.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Nexum - Tous droits réservés</p>
                    <p style="font-size: 11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(email, f"Bienvenue sur Nexum - {sector_name}", html, True)

    @staticmethod
    def send_complete_welcome_email(
        email: str, 
        name: str, 
        password: str, 
        sector: str, 
        sector_display: str,
        verification_link: str = None,
        is_new_user: bool = True
    ):
        """
        Email de bienvenue complet avec mot de passe, secteur et lien de vérification
        """
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3003")
        login_link = f"{frontend_url}/login?token={login_token}"
        
        if is_new_user:
            subject = f"🎉 Bienvenue sur Nexum - {sector_display}"
            title = "Bienvenue sur Nexum"
            subtitle = "Votre compte a été créé avec succès"
        else:
            subject = f"🔐 Connexion à Nexum - {sector_display}"
            title = "Connexion à Nexum"
            subtitle = "Votre compte a été mis à jour"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{title}</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #f4f4f4; padding: 20px; margin: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }}
                .header h1 {{ margin: 0; font-size: 28px; }}
                .header p {{ margin: 10px 0 0; opacity: 0.9; }}
                .content {{ padding: 30px; }}
                .content h2 {{ color: #1a1a2e; margin-top: 0; }}
                .content p {{ color: #475569; line-height: 1.6; }}
                .info-box {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #667eea; }}
                .info-box p {{ margin: 8px 0; }}
                .info-box code {{ background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; }}
                .sector-badge {{ display: inline-block; padding: 4px 12px; background: #667eea20; color: #667eea; border-radius: 20px; font-size: 14px; font-weight: bold; }}
                .btn {{ display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }}
                .btn-success {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); }}
                .btn-container {{ text-align: center; margin: 30px 0; }}
                .verify-box {{ background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; }}
                .verify-box h3 {{ color: #065f46; margin-top: 0; }}
                .footer {{ text-align: center; padding: 20px; background: #f8f9fa; color: #999; font-size: 12px; border-top: 1px solid #e5e7eb; }}
                .footer p {{ margin: 4px 0; }}
                .warning {{ font-size: 13px; color: #d97706; }}
                .login-section {{ background: #f0f7ff; padding: 20px; border-radius: 10px; margin: 20px 0; text-align: center; border: 1px solid #dbeafe; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{'🎉' if is_new_user else '🔐'} {title}</h1>
                    <p>{subtitle}</p>
                </div>
                <div class="content">
                    <h2>Bonjour {name},</h2>
                    <p>
                        {'Nous sommes ravis de vous accueillir sur Nexum. Votre compte a été créé avec succès.' if is_new_user else 'Nous vous confirmons votre connexion à Nexum.'}
                    </p>
                    
                    <div class="info-box">
                        <p><strong>🌐 Secteur :</strong> <span class="sector-badge">{sector_display}</span></p>
                        <p><strong>📧 Email :</strong> {email}</p>
                        {f'<p><strong>🔑 Mot de passe :</strong> <code>{password}</code></p>' if is_new_user else ''}
                        <p><strong>📅 Date :</strong> {datetime.now().strftime('%d/%m/%Y à %H:%M')}</p>
                    </div>
                    
                    {f'''
                    <div class="verify-box">
                        <h3>📧 Vérifiez votre email</h3>
                        <p>Pour activer votre compte et sécuriser votre accès, cliquez sur le bouton ci-dessous :</p>
                        <div class="btn-container">
                            <a href="{verification_link}" class="btn btn-success">✅ Vérifier mon email</a>
                        </div>
                        <p class="warning">⚠️ Ce lien expire dans 24 heures.</p>
                    </div>
                    ''' if is_new_user and verification_link else ''}
                    
                    <div class="login-section">
                        <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                            🚀 Accédez à votre dashboard {sector_display}
                        </p>
                        <p style="color: #64748b; font-size: 14px; margin-bottom: 16px;">
                            Cliquez sur le bouton ci-dessous pour vous connecter
                        </p>
                        <div class="btn-container">
                            <a href="{login_link}" class="btn">🔐 Se connecter</a>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px;">
                            Vous serez automatiquement redirigé vers votre tableau de bord.
                        </p>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2025 Nexum - Tous droits réservés</p>
                    <p style="font-size: 11px;">Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
                    <p style="font-size: 11px; color: #cbd5e1;">Nexum ERP - La solution complète pour votre entreprise</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return EmailService.send_email(email, subject, html, True)

    @staticmethod
    def send_reset_password(email: str, reset_link: str):
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

    @staticmethod
    def send_invoice_email(email: str, invoice_html: str):
        return EmailService.send_email(
            email,
            "Votre facture Nexum ERP",
            invoice_html,
            True
        )

    @staticmethod
    def send_payment_confirmation(email: str, amount: float, plan_name: str, invoice_url: str = None):
        """Email de confirmation de paiement"""
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
            </div>
        </div>
        """
        return EmailService.send_email(email, "Confirmation de paiement Nexum", html, True)

    # =========================
    # ATTACHMENT EMAIL
    # =========================
    @staticmethod
    def send_email_with_attachment(to_email: str, subject: str, body: str, file_path: str):

        cfg = EmailService._smtp_config()

        if not cfg["user"] or not cfg["password"]:
            return False, "SMTP non configuré"

        try:
            msg = MIMEMultipart()
            msg["From"] = f"Nexum Billing <{cfg['from_email']}>"
            msg["To"] = to_email
            msg["Subject"] = subject

            msg.attach(MIMEText(body, "html", "utf-8"))

            # Attachment
            with open(file_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())

            encoders.encode_base64(part)

            filename = os.path.basename(file_path)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{filename}"'
            )

            msg.attach(part)

            with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(cfg["user"], cfg["password"])
                server.send_message(msg)

            logger.info(f"✅ Email avec pièce jointe envoyé → {to_email}")
            return True, "OK"

        except Exception as e:
            logger.error(f"❌ Attachment email error: {e}")
            return False, str(e)


# instance ready (optionnel)
email_service = EmailService()