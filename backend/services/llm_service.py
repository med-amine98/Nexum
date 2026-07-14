# app/services/llm_service.py
import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration de Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    logger.warning("⚠️ GOOGLE_API_KEY manquante dans .env — le service LLM fonctionnera en mode dégradé")
else:
    genai.configure(api_key=GOOGLE_API_KEY)

# Modèle recommandé : gemini-1.5-flash (rapide et performant)
# ou gemini-1.5-pro (plus puissant mais plus lent)
MODEL_NAME = "gemini-1.5-flash"

class GeminiService:
    def __init__(self):
        self._model = None
        self.chat_history = {}
    
    @property
    def model(self):
        if self._model is None:
            if not GOOGLE_API_KEY:
                raise RuntimeError("GOOGLE_API_KEY non configurée. Ajoutez-la dans .env")
            self._model = genai.GenerativeModel(MODEL_NAME)
        return self._model
    
    async def generate_response(
        self, 
        query: str, 
        context: str = "", 
        system_prompt: str = None,
        temperature: float = 0.3,
        max_tokens: int = 2048
    ) -> dict:
        """
        Génère une réponse avec Gemini.
        """
        try:
            # Construire le prompt complet
            if system_prompt:
                full_prompt = f"{system_prompt}\n\nContexte : {context}\n\nQuestion : {query}"
            else:
                full_prompt = f"""
Tu es un assistant IA expert pour l'écosystème Nexum. 
Tu aides les utilisateurs sur les données de vente, risques, stock, support, etc.

Contexte fourni :
{context}

Question de l'utilisateur : {query}

Réponds de manière claire, structurée et professionnelle en français.
Si des données chiffrées sont disponibles, mentionne-les avec précision.
"""
            
            # Appel à Gemini
            response = self.model.generate_content(
                full_prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "top_p": 0.95,
                    "top_k": 40,
                }
            )
            
            # Extraire le texte
            if response.candidates and len(response.candidates) > 0:
                answer = response.candidates[0].content.parts[0].text
            else:
                answer = response.text if hasattr(response, 'text') else "Désolé, je n'ai pas pu générer de réponse."
            
            return {
                "response": answer,
                "model": MODEL_NAME,
                "usage": {
                    "prompt_tokens": 0,  # Gemini ne retourne pas ce détail simplement
                    "completion_tokens": 0,
                    "total_tokens": 0
                },
                "confidence": 0.85
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur Gemini: {e}")
            return {
                "response": f"Erreur lors de l'appel à l'IA : {str(e)}",
                "error": str(e),
                "confidence": 0.0
            }
    
    async def generate_structured_response(self, query: str, data: dict) -> dict:
        """
        Génère une réponse structurée à partir de données (tableaux, graphiques, etc.).
        """
        prompt = f"""
Analyse les données suivantes et réponds à la question.
Données : {data}
Question : {query}

Retourne une réponse structurée avec :
1. Un résumé textuel (en français)
2. Les chiffres clés
3. Une recommandation
4. Les éventuels risques détectés

Format : JSON avec les clés : summary, key_numbers, recommendation, risks
"""
        response = await self.generate_response(prompt, temperature=0.2)
        return response

# Instance globale
gemini_service = GeminiService()