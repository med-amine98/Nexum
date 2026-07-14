# backend/app/services/expert_dispatcher.py
import aiohttp
from datetime import datetime
from typing import Dict
import logging
logger = logging.getLogger(__name__)
class ExpertDispatcher:
    """Gestion et envoi des experts"""
    
    async def dispatch_expert(self, analysis_id: str, need_expert_data: Dict):
        """Envoyer un expert sur site"""
        
        expert_data = {
            "analysis_id": analysis_id,
            "need_expert": need_expert_data["need_expert"],
            "urgency": need_expert_data["urgency"],
            "reasons": need_expert_data["reasons"],
            "expert_type": need_expert_data["expert_type"],
            "dispatched_at": datetime.now().isoformat(),
            "estimated_arrival": self.get_estimated_arrival(need_expert_data["urgency"])
        }
        
        # Envoyer notification
        async with aiohttp.ClientSession() as session:
            await session.post(
                "http://backend:8000/api/v1/notifications/expert-dispatched",
                json=expert_data
            )
        
        logger.info(f"📞 EXPERT ENVOYÉ: {expert_data}")
        return expert_data
    
    def get_estimated_arrival(self, urgency: str) -> str:
        """Estimer le temps d'arrivée de l'expert"""
        if urgency == "critique":
            return "2 heures"
        elif urgency == "urgent":
            return "4 heures"
        else:
            return "24 heures"