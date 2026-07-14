# backend/test_email.py
import os
from dotenv import load_dotenv
from app.services.email_service import EmailService

# Charger les variables d'environnement
load_dotenv()

def test_send_email():
    """Test simple d'envoi d'email"""
    
    # Vérification
    print("=" * 60)
    print("📧 TEST D'ENVOI D'EMAIL")
    print("=" * 60)
    
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    print(f"SMTP_USER: {smtp_user}")
    print(f"SMTP_PASSWORD: {'OK' if smtp_password else 'MISSING'}")
    
    if not smtp_user or not smtp_password:
        print("\n❌ Configuration SMTP manquante !")
        print("Définissez les variables dans .env :")
        print("  SMTP_USER=aminehechmi4@gmail.com")
        print("  SMTP_PASSWORD=ioqujrqxinjftxwg")
        return
    
    # Envoyer un email de test
    to_email = input("\n📧 Email destinataire (ou appuyez sur Entrée pour tester@example.com): ").strip()
    if not to_email:
        to_email = "test@example.com"
    
    success, message = EmailService.send_email(
        to_email=to_email,
        subject="🧪 Test Nexum ERP",
        body="""
        <h1 style="color: #667eea;">🧪 Email de Test</h1>
        <p>Ceci est un email de test envoyé depuis Nexum ERP.</p>
        <p>Si vous recevez cet email, la configuration SMTP fonctionne correctement !</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Nexum ERP - Copyright 2025</p>
        """,
        is_html=True
    )
    
    print(f"\n📤 Résultat: {'✅ SUCCÈS' if success else '❌ ÉCHEC'}")
    print(f"   Message: {message}")

if __name__ == "__main__":
    test_send_email()