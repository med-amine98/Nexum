# data/auto_learn_from_logs.py
import requests
import json
import time
import os
from datetime import datetime, timedelta
from collections import Counter
from typing import List, Dict

API_URL = "http://localhost:8000/api/v1"

# Fichier de log pour les conversations
LOG_FILE = "data/conversation_logs.json"
LEARNED_FILE = "data/learned_knowledge.json"

def load_logs() -> List[Dict]:
    """Charge les logs de conversations"""
    if not os.path.exists(LOG_FILE):
        return []
    with open(LOG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_logs(logs: List[Dict]):
    """Sauvegarde les logs de conversations"""
    os.makedirs("data", exist_ok=True)
    with open(LOG_FILE, 'w', encoding='utf-8') as f:
        json.dump(logs[-1000:], f, ensure_ascii=False, indent=2)  # Garder 1000 logs max

def load_learned() -> List[Dict]:
    """Charge les connaissances apprises"""
    if not os.path.exists(LEARNED_FILE):
        return []
    with open(LEARNED_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_learned(learned: List[Dict]):
    """Sauvegarde les connaissances apprises"""
    os.makedirs("data", exist_ok=True)
    with open(LEARNED_FILE, 'w', encoding='utf-8') as f:
        json.dump(learned, f, ensure_ascii=False, indent=2)

def log_conversation(assistant: str, question: str, answer: str, feedback: int = None):
    """Enregistre une conversation dans les logs"""
    logs = load_logs()
    logs.append({
        "timestamp": datetime.now().isoformat(),
        "assistant": assistant,
        "question": question,
        "answer": answer[:500],  # Tronquer les longues réponses
        "feedback": feedback,
        "learned": False
    })
    save_logs(logs)

def analyze_common_questions() -> Dict:
    """Analyse les questions fréquentes"""
    logs = load_logs()
    if not logs:
        return {}
    
    # Compter les questions par assistant
    questions_by_assistant = {
        "risk": [],
        "growth": [],
        "predict": [],
        "copilot": []
    }
    
    for log in logs:
        assistant = log.get("assistant", "copilot")
        question = log.get("question", "").lower()
        if question:
            questions_by_assistant[assistant].append(question)
    
    # Trouver les questions fréquentes
    frequent_questions = {}
    for assistant, questions in questions_by_assistant.items():
        if questions:
            counter = Counter(questions)
            frequent_questions[assistant] = counter.most_common(5)
    
    return frequent_questions

def analyze_unanswered_questions() -> List[Dict]:
    """Analyse les questions qui n'ont pas reçu de bonne réponse"""
    logs = load_logs()
    if not logs:
        return []
    
    # Questions avec feedback négatif (<= 2)
    negative_feedback = [log for log in logs if log.get("feedback") and log["feedback"] <= 2]
    
    return negative_feedback

def generate_learning_from_logs():
    """Génère des connaissances à partir des logs"""
    learned = load_learned()
    frequent = analyze_common_questions()
    unanswered = analyze_unanswered_questions()
    
    logger.info("\n" + "=" * 60)
    logger.info("📊 ANALYSE DES CONVERSATIONS")
    logger.info("=" * 60)
    
    # 1. Afficher les questions fréquentes
    logger.info("\n🔍 QUESTIONS FRÉQUENTES:")
    for assistant, questions in frequent.items():
        logger.info(f"\n  📁 {assistant.upper()}:")
        for question, count in questions:
            logger.info(f"     • {question[:60]}... ({count} fois)")
    
    # 2. Afficher les questions sans bonne réponse
    if unanswered:
        logger.warning("\n⚠️ QUESTIONS SANS BONNE RÉPONSE:")
        for log in unanswered:
            logger.info(f"     • [{log['assistant']}] {log['question'][:60]}... (feedback: {log['feedback']})")
    
    # 3. Générer des connaissances à partir des questions fréquentes
    logger.info("\n📚 GÉNÉRATION DE CONNAISSANCES...")
    new_learned = 0
    
    for assistant, questions in frequent.items():
        for question, count in questions:
            if count >= 3:  # Si posée plus de 3 fois
                # Vérifier si déjà appris
                exists = any(l.get("question") == question for l in learned)
                if not exists:
                    learned.append({
                        "id": len(learned),
                        "assistant": assistant,
                        "question": question,
                        "answer": f"Question fréquente sur '{question}'. À compléter par un expert.",
                        "source": "auto_learn",
                        "frequency": count,
                        "created_at": datetime.now().isoformat()
                    })
                    new_learned += 1
    
    if new_learned > 0:
        save_learned(learned)
        logger.info(f"   ✅ {new_learned} nouvelles connaissances générées")
    else:
        logger.info("   ℹ️ Aucune nouvelle connaissance à générer")
    
    return {"frequent_questions": frequent, "unanswered": unanswered, "new_learned": new_learned}

def send_to_qdrant(assistant: str, question: str, answer: str):
    """Envoie une nouvelle connaissance à Qdrant"""
    try:
        response = requests.post(
            f"{API_URL}/assistant/learn",
            json={
                "assistant": assistant,
                "content": f"Q: {question}\nR: {answer}",
                "metadata": {
                    "source": "auto_learn",
                    "original_question": question,
                    "learned_at": datetime.now().isoformat()
                }
            }
        )
        return response.status_code == 200
    except Exception as e:
        logger.error(f"   ❌ Erreur envoi: {e}")
        return False

def analyze_and_learn():
    """Analyse les conversations et apprend automatiquement"""
    
    logger.info("\n" + "=" * 70)
    logger.info("🤖 AUTO-APPRENTISSAGE - DÉMARRAGE")
    logger.info("=" * 70)
    logger.info(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Récupérer les statistiques d'apprentissage
    try:
        response = requests.get(f"{API_URL}/assistant/learning-stats")
        if response.status_code == 200:
            stats = response.json()
            logger.info(f"\n📊 Statistiques actuelles:")
            logger.info(f"   • Connaissances apprises: {stats.get('learned_knowledge_count', 0)}")
            logger.info(f"   • Feedbacks enregistrés: {stats.get('feedback_count', 0)}")
    except Exception as e:
        logger.warning(f"⚠️ Impossible de récupérer les stats: {e}")
    
    # 2. Analyser les logs
    result = generate_learning_from_logs()
    
    # 3. Envoyer les nouvelles connaissances à Qdrant
    if result.get("new_learned", 0) > 0:
        learned = load_learned()
        logger.info("\n📤 ENVOI À QDRANT...")
        sent = 0
        for item in learned[-result["new_learned"]:]:
            if send_to_qdrant(item["assistant"], item["question"], item["answer"]):
                sent += 1
        logger.info(f"   ✅ {sent} connaissances envoyées à Qdrant")
    
    logger.info("\n" + "=" * 70)
    logger.info("✅ AUTO-APPRENTISSAGE TERMINÉ")
    logger.info("=" * 70)
    
    return result

def continuous_analysis(interval_seconds: int = 3600):
    """Analyse continue toutes les X secondes"""
    logger.info(f"\n🔄 Lancement de l'analyse continue (intervalle: {interval_seconds}s)")
    
    while True:
        try:
            analyze_and_learn()
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
        
        logger.info(f"\n💤 Prochaine analyse dans {interval_seconds // 60} minutes...")
        time.sleep(interval_seconds)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--continuous":
        continuous_analysis()
    else:
        analyze_and_learn()