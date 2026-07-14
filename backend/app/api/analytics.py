# app/api/analytics.py
import uuid

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import sqlite3
import json
import asyncio
from collections import defaultdict, Counter
import logging

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)

# ==================== BASE DE DONNÉES ====================
DATABASE_PATH = "nexum_bank.db"

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_analytics_tables():
    """Initialise les tables d'analytics"""
    with get_db() as db:
        # Table des événements utilisateur
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                event_type TEXT,
                event_data TEXT,
                timestamp TEXT
            )
        ''')
        
        # Table des commandes utilisateur
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                command TEXT,
                args TEXT,
                response TEXT,
                timestamp TEXT
            )
        ''')
        
        # Table des messages
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                content TEXT,
                length INTEGER,
                has_question BOOLEAN,
                timestamp TEXT
            )
        ''')
        
        # Table des sessions vocales
        db.execute('''
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                start_time TEXT,
                end_time TEXT,
                duration REAL,
                channel_name TEXT
            )
        ''')
        
        # Table des intentions détectées
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_intents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                intent TEXT,
                confidence REAL,
                timestamp TEXT
            )
        ''')
        
        # Table des recommandations envoyées
        db.execute('''
            CREATE TABLE IF NOT EXISTS recommendations_sent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                recommendation_type TEXT,
                title TEXT,
                description TEXT,
                action TEXT,
                sent_at TEXT,
                clicked BOOLEAN DEFAULT 0,
                clicked_at TEXT
            )
        ''')
        
        # Table des clics utilisateur
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                action TEXT,
                metadata TEXT,
                timestamp TEXT
            )
        ''')
        
        # Table des profils utilisateur
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_profiles (
                user_id TEXT PRIMARY KEY,
                points INTEGER DEFAULT 0,
                balance REAL DEFAULT 1000,
                bonus_streak INTEGER DEFAULT 0,
                last_bonus TEXT,
                member_since TEXT,
                engagement_score INTEGER DEFAULT 0,
                updated_at TEXT
            )
        ''')
        
        # Index pour accélérer les requêtes
        db.execute('CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_user_commands_user_id ON user_commands(user_id)')
        db.execute('CREATE INDEX IF NOT EXISTS idx_user_messages_user_id ON user_messages(user_id)')
        
        logger.info("✅ Tables analytics initialisées")

# ==================== COLLECTE DE DONNÉES ====================

def log_event(user_id: str, event_type: str, event_data: dict = None):
    """Enregistre un événement utilisateur"""
    with get_db() as db:
        db.execute(
            'INSERT INTO user_events (user_id, event_type, event_data, timestamp) VALUES (?, ?, ?, ?)',
            (user_id, event_type, json.dumps(event_data or {}), datetime.now().isoformat())
        )

def log_command(user_id: str, command: str, args: list, response: str = None):
    """Enregistre une commande utilisateur"""
    with get_db() as db:
        db.execute(
            'INSERT INTO user_commands (user_id, command, args, response, timestamp) VALUES (?, ?, ?, ?, ?)',
            (user_id, command, json.dumps(args), response, datetime.now().isoformat())
        )
    log_event(user_id, "command", {"command": command, "args": args})

def log_message(user_id: str, content: str):
    """Enregistre un message utilisateur"""
    with get_db() as db:
        db.execute(
            'INSERT INTO user_messages (user_id, content, length, has_question, timestamp) VALUES (?, ?, ?, ?, ?)',
            (user_id, content[:500], len(content), "?" in content, datetime.now().isoformat())
        )
    log_event(user_id, "message", {"length": len(content), "has_question": "?" in content})

def log_click(user_id: str, action: str, metadata: dict = None):
    """Enregistre un clic/action utilisateur"""
    with get_db() as db:
        db.execute(
            'INSERT INTO user_clicks (user_id, action, metadata, timestamp) VALUES (?, ?, ?, ?)',
            (user_id, action, json.dumps(metadata or {}), datetime.now().isoformat())
        )
    log_event(user_id, "click", {"action": action})

def log_intent(user_id: str, intent: str, confidence: float = 0.8):
    """Enregistre une intention détectée"""
    with get_db() as db:
        db.execute(
            'INSERT INTO user_intents (user_id, intent, confidence, timestamp) VALUES (?, ?, ?, ?)',
            (user_id, intent, confidence, datetime.now().isoformat())
        )
    log_event(user_id, "intent", {"intent": intent, "confidence": confidence})

def log_voice_session(user_id: str, session_id: str, start_time: datetime, end_time: datetime = None, channel_name: str = None):
    """Enregistre une session vocale"""
    if end_time:
        duration = (end_time - start_time).total_seconds()
        with get_db() as db:
            db.execute(
                'UPDATE voice_sessions SET end_time = ?, duration = ? WHERE id = ?',
                (end_time.isoformat(), duration, session_id)
            )
    else:
        with get_db() as db:
            db.execute(
                'INSERT INTO voice_sessions (id, user_id, start_time, channel_name) VALUES (?, ?, ?, ?)',
                (session_id, user_id, start_time.isoformat(), channel_name)
            )

def update_user_profile(user_id: str):
    """Met à jour le profil utilisateur avec les données réelles"""
    with get_db() as db:
        # Compter les commandes
        commands_count = db.execute('SELECT COUNT(*) as count FROM user_commands WHERE user_id = ?', (user_id,)).fetchone()['count']
        messages_count = db.execute('SELECT COUNT(*) as count FROM user_messages WHERE user_id = ?', (user_id,)).fetchone()['count']
        clicks_count = db.execute('SELECT COUNT(*) as count FROM user_clicks WHERE user_id = ?', (user_id,)).fetchone()['count']
        voice_count = db.execute('SELECT COUNT(*) as count FROM voice_sessions WHERE user_id = ?', (user_id,)).fetchone()['count']
        
        # Calculer le score d'engagement
        engagement_score = min(100, (commands_count * 2) + (messages_count * 1) + (clicks_count * 1) + (voice_count * 5))
        
        # Mettre à jour ou créer le profil
        db.execute('''
            INSERT OR REPLACE INTO user_profiles 
            (user_id, engagement_score, updated_at) 
            VALUES (?, ?, ?)
        ''', (user_id, engagement_score, datetime.now().isoformat()))

# ==================== ANALYSE DES INTENTIONS ====================

INTENT_KEYWORDS = {
    "consulter_solde": ["solde", "argent", "combien j'ai", "mon compte"],
    "consulter_points": ["points", "fidélité", "récompense"],
    "simuler_credit": ["credit", "prêt", "emprunt", "financement"],
    "faire_virement": ["virement", "transférer", "envoyer argent", "payer"],
    "obtenir_bonus": ["bonus", "récompense", "cadeau"],
    "contacter_support": ["aide", "support", "assistance", "problème", "bug"],
    "produits_bancaires": ["livret", "épargne", "placement", "assurance"],
    "historique": ["historique", "transactions", "mouvements"]
}

def detect_intent_from_command(command: str, args: list) -> tuple:
    """Détecte l'intention à partir d'une commande"""
    intent_mapping = {
        "solde": "consulter_solde",
        "points": "consulter_points",
        "credit": "simuler_credit",
        "capacite": "simuler_credit",
        "send": "faire_virement",
        "bonus": "obtenir_bonus",
        "aide": "contacter_support",
        "historique": "historique",
        "acheter": "produits_bancaires"
    }
    intent = intent_mapping.get(command, "autre")
    confidence = 0.95 if intent != "autre" else 0.5
    return intent, confidence

def detect_intent_from_message(message: str) -> list:
    """Détecte les intentions à partir d'un message texte"""
    detected_intents = []
    message_lower = message.lower()
    
    for intent, keywords in INTENT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in message_lower:
                detected_intents.append((intent, 0.7))
                break
    
    return detected_intents

def detect_interests(user_id: str) -> Dict[str, int]:
    """Détecte les centres d'intérêt basés sur l'activité réelle"""
    with get_db() as db:
        # Récupérer toutes les commandes
        commands = db.execute('SELECT command, args FROM user_commands WHERE user_id = ?', (user_id,)).fetchall()
        
    interests = defaultdict(int)
    
    interest_keywords = {
        "credit": ["credit", "pret", "emprunt", "capacite"],
        "epargne": ["epargne", "livret", "placement", "interet"],
        "virement": ["send", "virement", "transfert"],
        "assurance": ["assurance", "protection", "garantie"],
        "points": ["points", "bonus", "recompense", "acheter"]
    }
    
    for cmd in commands:
        cmd_lower = cmd['command'].lower()
        args_lower = json.loads(cmd['args']) if cmd['args'] else []
        
        for interest, keywords in interest_keywords.items():
            if any(kw in cmd_lower for kw in keywords):
                interests[interest] += 1
            for arg in args_lower:
                if isinstance(arg, str) and any(kw in arg.lower() for kw in keywords):
                    interests[interest] += 1
    
    return dict(interests)

# ==================== GÉNÉRATION DE RECOMMANDATIONS ====================

def generate_recommendations(user_id: str) -> List[Dict]:
    """Génère des recommandations basées sur l'activité réelle de l'utilisateur"""
    recommendations = []
    
    with get_db() as db:
        # Récupérer les infos utilisateur
        profile = db.execute('SELECT * FROM user_profiles WHERE user_id = ?', (user_id,)).fetchone()
        commands = db.execute('SELECT command FROM user_commands WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20', (user_id,)).fetchall()
        
        # Récupérer le solde réel
        balance_result = db.execute('SELECT balance FROM accounts_euros WHERE user_id = ?', (user_id,)).fetchone()
        balance = balance_result['balance'] if balance_result else 1000
        
        # Récupérer les points réels
        points_result = db.execute('SELECT balance FROM accounts_points WHERE user_id = ?', (user_id,)).fetchone()
        points = points_result['balance'] if points_result else 0
    
    # Analyser les commandes récentes
    recent_commands = [c['command'] for c in commands[:10]]
    
    # Recommandation basée sur le solde
    if balance < 200:
        recommendations.append({
            "type": "credit",
            "title": "💳 Découvert autorisé",
            "description": f"Votre solde est de {balance:.2f}€. Activez votre découvert autorisé pour plus de sérénité.",
            "action": "!activer decouvert",
            "priority": "high"
        })
    elif balance > 5000:
        recommendations.append({
            "type": "epargne",
            "title": "📈 Placement avantageux",
            "description": "Faites fructifier votre épargne avec notre livret à 3%",
            "action": "!simuler epargne",
            "priority": "medium"
        })
    
    # Recommandation basée sur les points
    if points > 1000:
        recommendations.append({
            "type": "points",
            "title": "⭐ Utilisez vos points",
            "description": f"Vous avez {points} points à dépenser dans notre boutique !",
            "action": "!acheter 1",
            "priority": "medium"
        })
    
    # Recommandation basée sur l'historique des commandes
    if "credit" in recent_commands:
        recommendations.append({
            "type": "credit",
            "title": "📊 Simulation crédit personnalisée",
            "description": "Basé sur vos recherches, découvrez notre offre de crédit à taux réduit",
            "action": "!credit 10000 36",
            "priority": "high"
        })
    
    if "send" in recent_commands:
        recommendations.append({
            "type": "virement",
            "title": "💸 Virements automatiques",
            "description": "Programmez vos virements récurrents pour ne plus y penser",
            "action": "!virement auto",
            "priority": "low"
        })
    
    # Recommandation par défaut si aucune
    if not recommendations:
        recommendations.append({
            "type": "aide",
            "title": "🎯 Découvrez nos services",
            "description": "Tapez !aide pour découvrir toutes les commandes disponibles",
            "action": "!aide",
            "priority": "low"
        })
    
    return recommendations

# ==================== STATISTIQUES RÉELLES ====================

def get_user_stats(user_id: str) -> Dict:
    """Récupère les statistiques réelles d'un utilisateur"""
    with get_db() as db:
        # Commandes
        commands_count = db.execute('SELECT COUNT(*) as count FROM user_commands WHERE user_id = ?', (user_id,)).fetchone()['count']
        
        # Messages
        messages_count = db.execute('SELECT COUNT(*) as count FROM user_messages WHERE user_id = ?', (user_id,)).fetchone()['count']
        
        # Clics
        clicks_count = db.execute('SELECT COUNT(*) as count FROM user_clicks WHERE user_id = ?', (user_id,)).fetchone()['count']
        
        # Sessions vocales
        voice_count = db.execute('SELECT COUNT(*) as count FROM voice_sessions WHERE user_id = ?', (user_id,)).fetchone()['count']
        
        # Intentions
        intents = db.execute('SELECT intent, COUNT(*) as count FROM user_intents WHERE user_id = ? GROUP BY intent', (user_id,)).fetchall()
        
        # Dernière activité
        last_command = db.execute('SELECT timestamp FROM user_commands WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', (user_id,)).fetchone()
        last_message = db.execute('SELECT timestamp FROM user_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', (user_id,)).fetchone()
        
        # Solde et points réels
        balance_result = db.execute('SELECT balance FROM accounts_euros WHERE user_id = ?', (user_id,)).fetchone()
        points_result = db.execute('SELECT balance FROM accounts_points WHERE user_id = ?', (user_id,)).fetchone()
        
        # Bonus streak
        bonus_result = db.execute('SELECT streak FROM daily_bonus WHERE user_id = ?', (user_id,)).fetchone()
        
        # Profil
        profile = db.execute('SELECT * FROM user_profiles WHERE user_id = ?', (user_id,)).fetchone()
    
    last_activity = None
    if last_command:
        last_activity = last_command['timestamp']
    elif last_message:
        last_activity = last_message['timestamp']
    
    return {
        "commands_count": commands_count,
        "messages_count": messages_count,
        "clicks_count": clicks_count,
        "voice_sessions_count": voice_count,
        "points": points_result['balance'] if points_result else 0,
        "balance": balance_result['balance'] if balance_result else 1000,
        "bonus_streak": bonus_result['streak'] if bonus_result else 0,
        "engagement_score": profile['engagement_score'] if profile else 0,
        "last_activity": last_activity,
        "intents": {intent['intent']: intent['count'] for intent in intents}
    }

def get_recent_commands(user_id: str, limit: int = 20) -> List[Dict]:
    """Récupère les commandes récentes"""
    with get_db() as db:
        results = db.execute('''
            SELECT command, args, timestamp FROM user_commands 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        ''', (user_id, limit)).fetchall()
    
    return [{"command": r['command'], "args": json.loads(r['args']) if r['args'] else [], "timestamp": r['timestamp']} for r in results]

def get_recent_messages(user_id: str, limit: int = 20) -> List[Dict]:
    """Récupère les messages récents"""
    with get_db() as db:
        results = db.execute('''
            SELECT content, timestamp FROM user_messages 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        ''', (user_id, limit)).fetchall()
    
    return [{"content": r['content'], "timestamp": r['timestamp']} for r in results]

def get_recent_clicks(user_id: str, limit: int = 50) -> List[Dict]:
    """Récupère les clics récents"""
    with get_db() as db:
        results = db.execute('''
            SELECT action, metadata, timestamp FROM user_clicks 
            WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
        ''', (user_id, limit)).fetchall()
    
    return [{"action": r['action'], "metadata": json.loads(r['metadata']) if r['metadata'] else {}, "timestamp": r['timestamp']} for r in results]

def get_voice_sessions(user_id: str) -> List[Dict]:
    """Récupère les sessions vocales"""
    with get_db() as db:
        results = db.execute('''
            SELECT id, start_time, end_time, duration, channel_name FROM voice_sessions 
            WHERE user_id = ? ORDER BY start_time DESC
        ''', (user_id,)).fetchall()
    
    return [{"id": r['id'], "start_time": r['start_time'], "end_time": r['end_time'], "duration": r['duration'], "channel": r['channel_name']} for r in results]

def get_recommendations_sent(user_id: str) -> List[Dict]:
    """Récupère les recommandations envoyées"""
    with get_db() as db:
        results = db.execute('''
            SELECT recommendation_type, title, description, action, sent_at, clicked 
            FROM recommendations_sent WHERE user_id = ? ORDER BY sent_at DESC LIMIT 10
        ''', (user_id,)).fetchall()
    
    return [{"type": r['recommendation_type'], "title": r['title'], "description": r['description'], "action": r['action'], "sent_at": r['sent_at'], "clicked": bool(r['clicked'])} for r in results]

# ==================== ENDPOINTS API ====================

@router.get("/user/{user_id}/profile")
async def get_user_analytics_profile(user_id: str):
    """Récupère le profil analytique complet d'un utilisateur (données réelles)"""
    
    # Mettre à jour le profil avant d'envoyer
    update_user_profile(user_id)
    
    # Récupérer les données réelles
    stats = get_user_stats(user_id)
    interests = detect_interests(user_id)
    recommendations = generate_recommendations(user_id)
    recent_commands = get_recent_commands(user_id, 20)
    recent_messages = get_recent_messages(user_id, 10)
    recent_clicks = get_recent_clicks(user_id, 50)
    voice_sessions = get_voice_sessions(user_id)
    recommendations_sent = get_recommendations_sent(user_id)
    
    # Calculer l'activité horaire
    hourly_activity = [0] * 24
    with get_db() as db:
        clicks_by_hour = db.execute('''
            SELECT strftime("%H", timestamp) as hour, COUNT(*) as count 
            FROM user_clicks WHERE user_id = ? GROUP BY hour
        ''', (user_id,)).fetchall()
        for row in clicks_by_hour:
            hour = int(row['hour'])
            hourly_activity[hour] = row['count']
    
    # Calculer l'activité par jour
    daily_activity = []
    with get_db() as db:
        last_7_days = db.execute('''
            SELECT date(timestamp) as day, COUNT(*) as count 
            FROM user_events WHERE user_id = ? AND timestamp > datetime("now", "-7 days")
            GROUP BY date(timestamp)
        ''', (user_id,)).fetchall()
        daily_activity = [{"day": r['day'], "count": r['count']} for r in last_7_days]
    
    # Compter les intentions
    intents_count = {}
    with get_db() as db:
        intents = db.execute('''
            SELECT intent, COUNT(*) as count FROM user_intents 
            WHERE user_id = ? GROUP BY intent
        ''', (user_id,)).fetchall()
        intents_count = {r['intent']: r['count'] for r in intents}
    
    return {
        "profile": {
            "user_id": user_id,
            "commands_count": stats["commands_count"],
            "messages_count": stats["messages_count"],
            "clicks_count": stats["clicks_count"],
            "voice_sessions_count": stats["voice_sessions_count"],
            "points": stats["points"],
            "balance": stats["balance"],
            "bonus_streak": stats["bonus_streak"],
            "member_since": None,  # À récupérer depuis accounts_euros created_at
            "engagement_score": stats["engagement_score"],
            "last_activity": stats["last_activity"]
        },
        "analytics": {
            "intents": intents_count,
            "interests": interests,
            "recommendations": recommendations,
            "recent_commands": recent_commands,
            "recent_messages": recent_messages,
            "recent_clicks": recent_clicks,
            "voice_sessions": voice_sessions,
            "hourly_activity": hourly_activity,
            "daily_activity": daily_activity,
            "recommendations_sent": recommendations_sent,
            "activity_score": min(100, stats["commands_count"] * 2 + stats["messages_count"] * 1)
        }
    }

@router.post("/user/{user_id}/track/command")
async def track_command(user_id: str, data: dict):
    """Track une commande utilisateur depuis Discord"""
    command = data.get("command")
    args = data.get("args", [])
    response = data.get("response")
    
    log_command(user_id, command, args, response)
    
    # Détecter l'intention
    intent, confidence = detect_intent_from_command(command, args)
    log_intent(user_id, intent, confidence)
    
    # Mettre à jour le profil
    update_user_profile(user_id)
    
    # Générer et envoyer des recommandations si besoin
    recommendations = generate_recommendations(user_id)
    
    return {"success": True, "recommendations": recommendations[:2] if recommendations else []}

@router.post("/user/{user_id}/track/message")
async def track_message(user_id: str, data: dict):
    """Track un message utilisateur depuis Discord"""
    content = data.get("content", "")
    
    log_message(user_id, content)
    
    # Détecter les intentions dans le message
    intents = detect_intent_from_message(content)
    for intent, confidence in intents:
        log_intent(user_id, intent, confidence)
    
    update_user_profile(user_id)
    
    return {"success": True}

@router.post("/user/{user_id}/track/click")
async def track_click(user_id: str, data: dict):
    """Track un clic utilisateur"""
    action = data.get("action")
    metadata = data.get("metadata", {})
    
    log_click(user_id, action, metadata)
    update_user_profile(user_id)
    
    return {"success": True}

@router.post("/user/{user_id}/track/voice/start")
async def track_voice_start(user_id: str, data: dict):
    """Démarre le tracking d'une session vocale"""
    session_id = data.get("session_id", str(uuid.uuid4()))
    channel_name = data.get("channel_name")
    
    log_voice_session(user_id, session_id, datetime.now(), channel_name=channel_name)
    update_user_profile(user_id)
    
    return {"success": True, "session_id": session_id}

@router.post("/user/{user_id}/track/voice/end")
async def track_voice_end(user_id: str, data: dict):
    """Termine le tracking d'une session vocale"""
    session_id = data.get("session_id")
    
    with get_db() as db:
        db.execute(
            'UPDATE voice_sessions SET end_time = ?, duration = (strftime("%s", ?) - strftime("%s", start_time)) WHERE id = ? AND user_id = ?',
            (datetime.now().isoformat(), datetime.now().isoformat(), session_id, user_id)
        )
    
    update_user_profile(user_id)
    
    return {"success": True}

@router.post("/user/{user_id}/track/recommendation/click")
async def track_recommendation_click(user_id: str, data: dict):
    """Track quand un utilisateur clique sur une recommandation"""
    recommendation_title = data.get("title")
    
    with get_db() as db:
        db.execute('''
            UPDATE recommendations_sent 
            SET clicked = 1, clicked_at = ? 
            WHERE user_id = ? AND title = ? AND clicked = 0
        ''', (datetime.now().isoformat(), user_id, recommendation_title))
    
    log_click(user_id, "recommendation_click", {"title": recommendation_title})
    
    return {"success": True}

@router.get("/user/{user_id}/recommendations")
async def get_user_recommendations(user_id: str):
    """Récupère les recommandations personnalisées pour un utilisateur"""
    recommendations = generate_recommendations(user_id)
    return {"recommendations": recommendations}

@router.post("/user/{user_id}/recommendations/send")
async def send_recommendation(user_id: str, data: dict):
    """Enregistre qu'une recommandation a été envoyée à l'utilisateur"""
    rec = data.get("recommendation", {})
    
    with get_db() as db:
        db.execute('''
            INSERT INTO recommendations_sent (user_id, recommendation_type, title, description, action, sent_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (user_id, rec.get("type"), rec.get("title"), rec.get("description"), rec.get("action"), datetime.now().isoformat()))
    
    return {"success": True}

@router.get("/dashboard/stats")
async def get_global_stats():
    """Statistiques globales pour le dashboard"""
    with get_db() as db:
        total_users = db.execute('SELECT COUNT(DISTINCT user_id) as count FROM user_profiles').fetchone()['count']
        total_commands = db.execute('SELECT COUNT(*) as count FROM user_commands').fetchone()['count']
        total_messages = db.execute('SELECT COUNT(*) as count FROM user_messages').fetchone()['count']
        total_voice = db.execute('SELECT COUNT(*) as count FROM voice_sessions').fetchone()['count']
        
        # Top intentions
        top_intents = db.execute('''
            SELECT intent, COUNT(*) as count FROM user_intents 
            GROUP BY intent ORDER BY count DESC LIMIT 5
        ''').fetchall()
        
        # Activité récente
        recent_activity = db.execute('''
            SELECT date(timestamp) as day, COUNT(*) as count 
            FROM user_events 
            WHERE timestamp > datetime("now", "-7 days")
            GROUP BY date(timestamp)
        ''').fetchall()
    
    return {
        "total_users": total_users,
        "total_commands": total_commands,
        "total_messages": total_messages,
        "total_voice_sessions": total_voice,
        "top_intents": [{"intent": r['intent'], "count": r['count']} for r in top_intents],
        "activity_timeline": [{"date": r['day'], "count": r['count']} for r in recent_activity]
    }

# ==================== INITIALISATION ====================
init_analytics_tables()
logger.info("✅ Module analytics chargé (collecte réelle depuis Discord)")