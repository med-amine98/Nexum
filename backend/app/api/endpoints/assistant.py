from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from gtts import gTTS
import os
import uuid
import random
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Dossier temporaire pour les fichiers audio
TEMP_AUDIO_DIR = "temp_audio"
os.makedirs(TEMP_AUDIO_DIR, exist_ok=True)

# Scenarios for autonomous learning
AUTONOMOUS_SCENARIOS = [
    {
        "initiator": "predict",
        "msg": "J'ai détecté une déviation de 0.05% sur le modèle de prévision. Ajustement des poids synaptiques en cours...",
        "responder": "risk",
        "respMsg": "Je confirme la déviation. J'intègre cette variance dans la matrice de modélisation des risques."
    },
    {
        "initiator": "risk",
        "msg": "Alerte de sécurité : analyse heuristique d'un pattern inhabituel sur les transactions entrantes.",
        "responder": "copilot",
        "respMsg": "Renforcement des pare-feux en cours. Je lance le protocole d'apprentissage de sécurité."
    },
    {
        "initiator": "growth",
        "msg": "Apprentissage des ventes : le secteur retail montre une hausse de 12%. Optimisation de l'algorithme marketing.",
        "responder": "predict",
        "respMsg": "Mes réseaux de neurones confirment la tendance. Je mets à jour nos prédictions cibles."
    },
    {
        "initiator": "elena",
        "msg": "Analyse cognitive des ressources : 3 de nos modèles de langage nécessitent un fine-tuning.",
        "responder": "james",
        "respMsg": "Compris Elena, je lance le pipeline de ré-entrainement sur le nouveau corpus de données."
    },
    {
        "initiator": "sophie",
        "msg": "J'ai consolidé toutes vos données récentes. Compilation du nouveau graphe de connaissances...",
        "responder": "copilot",
        "respMsg": "Mémoire collective synchronisée. Notre taux de précision global vient de passer à 99.8%."
    }
]

# Simple mapping for user chat
CHAT_RESPONSES = {
    "risque": {"assistant": "risk", "msg": "J'analyse actuellement les vecteurs de risques. La situation est stable mais sous surveillance continue."},
    "croissance": {"assistant": "growth", "msg": "Les indicateurs de croissance sont positifs. Nos modèles suggèrent une opportunité d'expansion au prochain trimestre."},
    "prédiction": {"assistant": "predict", "msg": "Mes modèles de séries temporelles anticipent une variance de 2% la semaine prochaine."},
    "default": {"assistant": "copilot", "msg": "Je transmets votre requête au réseau neuronal pour une analyse approfondie."}
}

@router.get("/assistants3d/autonomous-learning")
async def get_autonomous_learning_scenario():
    """Returns a random autonomous learning scenario between two assistants."""
    scenario = random.choice(AUTONOMOUS_SCENARIOS)
    return scenario

from pydantic import BaseModel
class ChatRequest(BaseModel):
    message: str

@router.post("/assistants3d/chat")
async def chat_with_assistants(request: ChatRequest):
    """Processes a user message and returns a response from an assistant."""
    msg_lower = request.message.lower()
    
    if "risque" in msg_lower or "danger" in msg_lower or "alerte" in msg_lower:
        return CHAT_RESPONSES["risque"]
    elif "croiss" in msg_lower or "vente" in msg_lower or "profit" in msg_lower:
        return CHAT_RESPONSES["croissance"]
    elif "préd" in msg_lower or "futur" in msg_lower or "tendance" in msg_lower:
        return CHAT_RESPONSES["prédiction"]
    else:
        # Fallback to a random assistant if no keyword matches, or copilot
        fallback = CHAT_RESPONSES["default"]
        # Add some variation
        assistants = ["copilot", "elena", "james", "sophie"]
        fallback["assistant"] = random.choice(assistants)
        return fallback

@router.get("/speak")
async def speak(text: str, background_tasks: BackgroundTasks, lang: str = "fr"):
    """Génère un fichier audio à partir du texte."""
    try:
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(TEMP_AUDIO_DIR, filename)
        
        tts = gTTS(text=text, lang=lang)
        tts.save(filepath)
        
        # Supprimer le fichier après l'envoi
        background_tasks.add_task(os.remove, filepath)
        
        return FileResponse(
            filepath, 
            media_type="audio/mpeg", 
            filename="speech.mp3"
        )
    except Exception as e:
        logger.error(f"Erreur TTS: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/visemes")
async def get_visemes(text: str):
    """Génère des données de synchronisation labiale simplifiées."""
    # Simulation de visemes basée sur la longueur du texte
    # Dans une version réelle, on utiliserait Rhubarb ou un outil de traitement phonétique
    words = text.split()
    visemes = []
    current_time = 0
    
    for word in words:
        duration = len(word) * 0.1  # Estimation grossière
        visemes.append({
            "time": current_time,
            "type": "mouth_open" if len(word) % 2 == 0 else "mouth_wide",
            "duration": duration
        })
        current_time += duration
        
    return visemes
