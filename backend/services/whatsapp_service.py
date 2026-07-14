# app/services/whatsapp_service.py
# Service de communication WhatsApp (simulation/mock pour intégrations futures)
import logging

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        logger.info("📱 WhatsAppService (Mock/Fallback) initialisé")

    async def send_message(self, to_phone: str, message: str) -> dict:
        """
        Simule l'envoi d'un message WhatsApp.
        """
        logger.info(f"📤 WhatsApp envoyé à {to_phone}: {message[:50]}...")
        return {
            "status": "sent",
            "to": to_phone,
            "message_snippet": message[:100],
            "provider": "simulation"
        }

    async def receive_message(self, payload: dict) -> dict:
        """
        Simule la réception d'un webhook WhatsApp.
        """
        logger.info(f"📥 WhatsApp reçu: {payload}")
        return {
            "status": "processed",
            "sender": payload.get("from"),
            "content": payload.get("text")
        }

whatsapp_service = WhatsAppService()
