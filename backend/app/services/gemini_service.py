# app/services/gemini_service.py
import os
import logging
from typing import List, Dict, Optional, Any

# Configuration du logging
logger = logging.getLogger(__name__)

# ============================================
# GESTION DE L'API GEMINI
# ============================================

# Tentative d'import de la nouvelle bibliothèque
USE_NEW_LIBRARY = False
genai = None
types = None
genai_old = None

try:
    from google import genai
    from google.genai import types
    USE_NEW_LIBRARY = True
    print("✅ Utilisation de google.genai (nouvelle version)")
except ImportError:
    print("ℹ️ google.genai non trouvé, tentative avec google.generativeai...")
    try:
        import google.generativeai as genai_old
        print("⚠️ Utilisation de google.generativeai (ancienne version)")
    except ImportError:
        print("❌ Aucune bibliothèque Gemini installée")

# Variable d'environnement
GENAI_API_KEY = os.getenv("GENAI_API_KEY")
if not GENAI_API_KEY:
    logger.warning("⚠️ GENAI_API_KEY non définie dans les variables d'environnement")

DEFAULT_MODEL = "gemini-1.5-flash"


# ============================================
# FONCTION PRINCIPALE
# ============================================

async def generate_solution(
    subject: str,
    description: str,
    kb_articles: List[Dict[str, str]],
    sector: str = "entreprise"
) -> str:
    """
    Génère une solution pour un ticket en utilisant Gemini.
    """
    # Construire le contexte
    kb_context = ""
    if kb_articles:
        kb_context = "Articles de la base de connaissances :\n"
        for i, article in enumerate(kb_articles, 1):
            title = article.get("title", "Sans titre")
            content = article.get("content", "")[:500]
            kb_context += f"{i}. {title} : {content}\n"
    else:
        kb_context = "Aucun article pertinent trouvé."
    
    # Prompt
    prompt = f"""
Tu es un expert en support client spécialisé dans le secteur {sector}. 
Ton rôle est de proposer une solution claire et structurée pour résoudre le problème suivant.

**Ticket :**
- Sujet : {subject}
- Description : {description}

**Base de connaissances :**
{kb_context}

**Consignes :**
1. Si des articles sont pertinents, cite-les et adapte leur contenu au problème.
2. Propose des étapes concrètes et précises (sous forme de liste numérotée).
3. Si la base de connaissances ne contient pas d'information utile, donne une solution générique mais professionnelle.
4. Termine par une recommandation.
5. Rédige en français, avec un ton professionnel.

**Solution :**
"""
    
    # Si aucune API n'est disponible, retourner la solution de fallback
    if not GENAI_API_KEY:
        logger.warning("⚠️ GENAI_API_KEY non définie, utilisation du fallback")
        return _generate_fallback_solution(subject, description, sector)
    
    try:
        if USE_NEW_LIBRARY and genai is not None:
            # ✅ Nouvelle API
            client = genai.Client(api_key=GENAI_API_KEY)
            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=1024,
                )
            )
            return response.text.strip()
        
        elif genai_old is not None:
            # 🔄 Ancienne API
            genai_old.configure(api_key=GENAI_API_KEY)
            model = genai_old.GenerativeModel(DEFAULT_MODEL)
            response = model.generate_content(prompt)
            return response.text.strip()
        
        else:
            logger.error("❌ Aucune API Gemini disponible")
            return _generate_fallback_solution(subject, description, sector)
            
    except Exception as e:
        logger.error(f"❌ Erreur Gemini: {e}")
        return _generate_fallback_solution(subject, description, sector)


# ============================================
# VERSION SYNC
# ============================================

def generate_solution_sync(
    subject: str,
    description: str,
    kb_articles: List[Dict[str, str]],
    sector: str = "entreprise"
) -> str:
    """Version synchrone de generate_solution."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(
        generate_solution(subject, description, kb_articles, sector)
    )


# ============================================
# FALLBACK
# ============================================

def _generate_fallback_solution(subject: str, description: str, sector: str) -> str:
    """Solution de fallback."""
    return f"""
📋 **Solution proposée**

**Problème :** {subject}

**Description :** {description}

**Étapes à suivre :**

1. **Vérification** : Assurez-vous que toutes les informations sont disponibles.
2. **Analyse** : Identifiez la cause racine du problème.
3. **Actions** : Appliquez les correctifs appropriés.
4. **Validation** : Vérifiez que le problème est résolu.
5. **Documentation** : Documentez la solution.

**Recommandations :**
- Si le problème persiste, contactez le support technique.
- Suivez les procédures de sécurité.

---
💡 *Solution générée automatiquement.*
"""


# ============================================
# FONCTIONS DE TEST
# ============================================

async def test_gemini_connection() -> Dict[str, Any]:
    """Teste la connexion à l'API Gemini."""
    try:
        if not GENAI_API_KEY:
            return {
                "success": False,
                "error": "GENAI_API_KEY non définie",
                "api_key_configured": False
            }
        
        if USE_NEW_LIBRARY and genai is not None:
            client = genai.Client(api_key=GENAI_API_KEY)
            response = client.models.generate_content(
                model=DEFAULT_MODEL,
                contents="Dis 'Bonjour'",
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=50,
                )
            )
            return {
                "success": True,
                "api_version": "google.genai",
                "response": response.text.strip()[:100],
                "model": DEFAULT_MODEL,
                "api_key_configured": True
            }
        
        elif genai_old is not None:
            genai_old.configure(api_key=GENAI_API_KEY)
            model = genai_old.GenerativeModel(DEFAULT_MODEL)
            response = model.generate_content("Dis 'Bonjour'")
            return {
                "success": True,
                "api_version": "google.generativeai",
                "response": response.text.strip()[:100],
                "model": DEFAULT_MODEL,
                "api_key_configured": True
            }
        
        else:
            return {
                "success": False,
                "error": "Aucune bibliothèque Gemini installée",
                "api_key_configured": bool(GENAI_API_KEY)
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "api_key_configured": bool(GENAI_API_KEY)
        }


def get_gemini_info() -> Dict[str, Any]:
    """Retourne des informations sur la configuration Gemini."""
    return {
        "api_key_configured": bool(GENAI_API_KEY),
        "api_version": "google.genai" if USE_NEW_LIBRARY else "google.generativeai" if genai_old else "none",
        "model": DEFAULT_MODEL,
        "available": bool(GENAI_API_KEY) and (USE_NEW_LIBRARY or genai_old is not None)
    }


# ============================================
# POINT D'ENTRÉE
# ============================================

if __name__ == "__main__":
    import asyncio
    info = get_gemini_info()
    print("\n📋 Configuration Gemini:")
    print(f"   API Key configurée: {info['api_key_configured']}")
    print(f"   Version: {info['api_version']}")
    print(f"   Modèle: {info['model']}")
    print(f"   Disponible: {info['available']}")
    
    if info['available']:
        result = asyncio.run(test_gemini_connection())
        print(f"\n📊 Test: {result}")