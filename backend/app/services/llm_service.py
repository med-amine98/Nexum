# app/services/llm_service.py
import requests
import json
import os
from typing import List, Dict
import logging
logger = logging.getLogger(__name__)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("LLM_MODEL", "mistral")

class LLMService:
    def __init__(self):
        self.url = f"{OLLAMA_URL}/api/generate"
        self.model = MODEL_NAME
        logger.info(f"✅ LLM Service initialisé avec {self.model}")
    
    def generate(self, prompt: str, context: List[str] = None) -> str:
        """Génère une réponse avec le LLM"""
        system_prompt = """Tu es un assistant bancaire expert. 
        Utilise le contexte fourni pour répondre de manière précise et professionnelle.
        Si tu ne connais pas la réponse, dis-le honnêtement.
        Réponds en français."""
        
        full_prompt = system_prompt + "\n\n"
        
        if context:
            full_prompt += "CONTEXTE:\n" + "\n".join(context) + "\n\n"
        
        full_prompt += f"QUESTION: {prompt}\n\nRÉPONSE:"
        
        try:
            response = requests.post(
                self.url,
                json={
                    "model": self.model,
                    "prompt": full_prompt,
                    "stream": False,
                    "temperature": 0.3,
                    "max_tokens": 500
                },
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json().get("response", "Je n'ai pas pu générer de réponse.")
            else:
                return None
        except Exception as e:
            logger.error(f"Erreur LLM: {e}")
            return None
    
    def summarize_conversation(self, messages: List[Dict]) -> str:
        """Résume une conversation pour apprentissage"""
        conversation = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
        
        prompt = f"""Résume cette conversation en 2-3 phrases pour en extraire l'information clé:
        
{conversation}

RÉSUMÉ:"""
        
        try:
            response = requests.post(
                self.url,
                json={"model": self.model, "prompt": prompt, "stream": False},
                timeout=30
            )
            if response.status_code == 200:
                return response.json().get("response", "")
        except:
            pass
        return ""

llm_service = LLMService()