# app/api/discord_routes.py - Version complète avec init_module
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import random
import json
import uuid
import logging
import sqlite3
import os
from contextlib import contextmanager

router = APIRouter(prefix="/discord", tags=["discord"])
logger = logging.getLogger(__name__)

# ==================== BASE DE DONNÉES SQLITE ====================
DATABASE_PATH = "nexum_bank.db"

@contextmanager
def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

def init_discord_tables():
    with get_db() as db:
        # Tables existantes
        db.execute('CREATE TABLE IF NOT EXISTS accounts_euros (user_id TEXT PRIMARY KEY, balance REAL DEFAULT 1000, created_at TEXT DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS accounts_points (user_id TEXT PRIMARY KEY, balance INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)')
        db.execute('CREATE TABLE IF NOT EXISTS transactions_euros (id TEXT PRIMARY KEY, sender_id TEXT, sender_name TEXT, recipient_id TEXT, recipient_name TEXT, amount REAL, reason TEXT, date TEXT)')
        
        # Tables pour la collecte de données
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_commands (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                command TEXT,
                args TEXT,
                response TEXT,
                timestamp TEXT
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                user_name TEXT,
                content TEXT,
                sentiment TEXT,
                timestamp TEXT
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_intents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                intent TEXT,
                confidence REAL,
                timestamp TEXT
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_interests (
                user_id TEXT,
                interest TEXT,
                score INTEGER,
                PRIMARY KEY (user_id, interest)
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS quizzes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                quiz_id TEXT,
                user_id TEXT,
                questions TEXT,
                answers TEXT,
                status TEXT,
                created_at TEXT,
                completed_at TEXT
            )
        ''')
        
        logger.info("✅ Tables SQLite initialisées")

# ==================== STOCKAGE ====================
pending_messages: Dict[str, List[Dict]] = {}
pending_calls: Dict[str, Dict] = {}

# ==================== FONCTIONS UTILITAIRES ====================
def safe_json_parse(json_str: str, default=None):
    if not json_str or json_str == 'null' or json_str == '[]':
        return default if default is not None else []
    try:
        return json.loads(json_str)
    except:
        return default if default is not None else []

def analyze_sentiment(text: str) -> dict:
    positive_words = ['bonjour', 'merci', 'super', 'génial', 'parfait', 'content', 'satisfait', 'bravo', 'top', 'excellent']
    negative_words = ['problème', 'erreur', 'bug', 'pas content', 'déçu', 'mauvais', 'galère', 'bloqué', 'triste', 'énervé']
    
    text_lower = text.lower()
    pos_count = sum(1 for word in positive_words if word in text_lower)
    neg_count = sum(1 for word in negative_words if word in text_lower)
    
    if pos_count > neg_count:
        sentiment = "positif"
    elif neg_count > pos_count:
        sentiment = "negatif"
    else:
        sentiment = "neutre"
    
    return {"sentiment": sentiment, "score": 0.5}

# ==================== ENDPOINTS ANALYTICS ====================

@router.get("/analytics/user/{user_id}/profile")
async def get_user_analytics_profile(user_id: str):
    try:
        with get_db() as db:
            commands_count = db.execute('SELECT COUNT(*) as count FROM user_commands WHERE user_id = ?', (user_id,)).fetchone()['count'] or 0
            messages_count = db.execute('SELECT COUNT(*) as count FROM user_messages WHERE user_id = ?', (user_id,)).fetchone()['count'] or 0
            
            balance_row = db.execute('SELECT balance FROM accounts_euros WHERE user_id = ?', (user_id,)).fetchone()
            points_row = db.execute('SELECT balance FROM accounts_points WHERE user_id = ?', (user_id,)).fetchone()
            
            balance = balance_row['balance'] if balance_row else 1000
            points = points_row['balance'] if points_row else 0
            
            cmd_rows = db.execute('''
                SELECT command, args, timestamp FROM user_commands 
                WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10
            ''', (user_id,)).fetchall()
            
            recent_commands = []
            for r in cmd_rows:
                recent_commands.append({
                    "command": r['command'],
                    "args": safe_json_parse(r['args'], []),
                    "timestamp": r['timestamp']
                })
            
            intents = {}
            intent_map = {"solde": "consulter_solde", "points": "consulter_points", "credit": "simuler_credit", "send": "faire_virement", "bonus": "obtenir_bonus"}
            for cmd in recent_commands:
                intent = intent_map.get(cmd['command'], "autre")
                intents[intent] = intents.get(intent, 0) + 1
            
            interests = {}
            for cmd in recent_commands:
                if cmd['command'] == "credit":
                    interests["simuler_credit"] = interests.get("simuler_credit", 0) + 1
                elif cmd['command'] == "send":
                    interests["faire_virement"] = interests.get("faire_virement", 0) + 1
                elif cmd['command'] == "solde":
                    interests["consulter_solde"] = interests.get("consulter_solde", 0) + 1
            
            activity_score = min(100, commands_count * 5 + messages_count * 2)
            last_cmd = db.execute('SELECT timestamp FROM user_commands WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1', (user_id,)).fetchone()
            last_activity = last_cmd['timestamp'] if last_cmd else None
            
            recommendations = []
            if interests.get("simuler_credit", 0) > 0:
                recommendations.append({
                    "title": "💳 Crédit personnalisé",
                    "description": "Basé sur vos simulations",
                    "action": "!credit 10000 36",
                    "priority": "high"
                })
            if points > 500:
                recommendations.append({
                    "title": "⭐ Utilisez vos points",
                    "description": f"Vous avez {points} points",
                    "action": "!points",
                    "priority": "medium"
                })
            
            return {
                "profile": {
                    "user_id": user_id,
                    "commands_count": commands_count,
                    "messages_count": messages_count,
                    "clicks_count": 0,
                    "voice_sessions_count": 0,
                    "points": points,
                    "balance": balance,
                    "bonus_streak": 0,
                    "member_since": None,
                    "engagement_score": activity_score,
                    "last_activity": last_activity
                },
                "analytics": {
                    "intents": intents,
                    "interests": interests,
                    "recommendations": recommendations,
                    "recent_commands": recent_commands,
                    "recent_messages": [],
                    "clicks": [],
                    "hourly_activity": [0] * 24,
                    "daily_activity": [],
                    "activity_score": activity_score,
                    "engagement_score": activity_score
                }
            }
    except Exception as e:
        logger.error(f"Erreur get_user_analytics_profile: {e}")
        return {
            "profile": {"user_id": user_id, "commands_count": 0, "messages_count": 0, "clicks_count": 0, "voice_sessions_count": 0, "points": 0, "balance": 1000, "bonus_streak": 0, "member_since": None, "engagement_score": 0, "last_activity": None},
            "analytics": {"intents": {}, "interests": {}, "recommendations": [], "recent_commands": [], "recent_messages": [], "clicks": [], "hourly_activity": [0] * 24, "daily_activity": [], "activity_score": 0, "engagement_score": 0}
        }


@router.get("/analytics/user/{user_id}/needs")
async def get_user_needs(user_id: str):
    try:
        with get_db() as db:
            interests_rows = db.execute('SELECT interest, score FROM user_interests WHERE user_id = ? ORDER BY score DESC', (user_id,)).fetchall()
            
            needs = []
            for interest in interests_rows:
                if interest['score'] >= 2:
                    needs.append({
                        "type": interest['interest'],
                        "level": "élevé" if interest['score'] >= 5 else "moyen" if interest['score'] >= 3 else "faible",
                        "score": interest['score']
                    })
            
            if not needs:
                needs = [
                    {"type": "credit", "level": "faible", "score": 0},
                    {"type": "epargne", "level": "faible", "score": 0},
                    {"type": "virement", "level": "faible", "score": 0}
                ]
            
            return {
                "success": True,
                "needs": {
                    "interests": [{"interest": i['interest'], "score": i['score']} for i in interests_rows],
                    "global_sentiment": "neutre",
                    "needs": needs,
                    "suggested_quiz": needs[0]["type"] if needs else "credit"
                }
            }
    except Exception as e:
        logger.error(f"Erreur get_user_needs: {e}")
        return {
            "success": True,
            "needs": {
                "interests": [],
                "global_sentiment": "neutre",
                "needs": [{"type": "credit", "level": "faible", "score": 0}],
                "suggested_quiz": "credit"
            }
        }


@router.get("/analytics/user/{user_id}/full")
async def get_user_full_analytics(user_id: str):
    try:
        with get_db() as db:
            commands_rows = db.execute('''
                SELECT command, args, response, timestamp 
                FROM user_commands 
                WHERE user_id = ? 
                ORDER BY timestamp DESC LIMIT 50
            ''', (user_id,)).fetchall()
            
            commands_list = [{"command": c['command'], "args": safe_json_parse(c['args'], []), "response": c['response'], "timestamp": c['timestamp']} for c in commands_rows]
            
            messages_rows = db.execute('SELECT content, timestamp FROM user_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50', (user_id,)).fetchall()
            messages_list = [{"content": m['content'], "timestamp": m['timestamp']} for m in messages_rows]
            
            intents_rows = db.execute('SELECT intent, COUNT(*) as count FROM user_intents WHERE user_id = ? GROUP BY intent', (user_id,)).fetchall()
            interests_rows = db.execute('SELECT interest, score FROM user_interests WHERE user_id = ? ORDER BY score DESC', (user_id,)).fetchall()
            
            stats = db.execute('''
                SELECT 
                    (SELECT COUNT(*) FROM user_commands WHERE user_id = ?) as total_commands,
                    (SELECT COUNT(*) FROM user_messages WHERE user_id = ?) as total_messages,
                    (SELECT COUNT(*) FROM user_intents WHERE user_id = ?) as total_intents,
                    (SELECT COALESCE(SUM(score), 0) FROM user_interests WHERE user_id = ?) as total_interest_score
            ''', (user_id, user_id, user_id, user_id)).fetchone()
            
            return {
                "success": True,
                "data": {
                    "commands": commands_list,
                    "messages": messages_list,
                    "intents": [{"intent": i['intent'], "count": i['count']} for i in intents_rows],
                    "interests": [{"interest": i['interest'], "score": i['score']} for i in interests_rows],
                    "stats": {
                        "total_commands": stats['total_commands'] if stats else 0,
                        "total_messages": stats['total_messages'] if stats else 0,
                        "total_intents": stats['total_intents'] if stats else 0,
                        "total_interest_score": stats['total_interest_score'] if stats else 0
                    }
                }
            }
    except Exception as e:
        logger.error(f"Erreur get_user_full_analytics: {e}")
        return {"success": True, "data": {"commands": [], "messages": [], "intents": [], "interests": [], "stats": {"total_commands": 0, "total_messages": 0, "total_intents": 0, "total_interest_score": 0}}}


@router.post("/analytics/track/message")
async def track_message(data: dict):
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    content = data.get("content", "")
    
    sentiment_analysis = analyze_sentiment(content)
    
    with get_db() as db:
        db.execute('''
            INSERT INTO user_messages (user_id, user_name, content, sentiment, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, user_name, content[:500], sentiment_analysis["sentiment"], datetime.now().isoformat()))
    
    return {"success": True, "sentiment": sentiment_analysis["sentiment"]}


@router.get("/analytics/user/{user_id}/sentiment")
async def get_user_sentiment(user_id: str):
    try:
        with get_db() as db:
            messages = db.execute('''
                SELECT sentiment, timestamp FROM user_messages 
                WHERE user_id = ? AND sentiment IS NOT NULL
                ORDER BY timestamp DESC LIMIT 100
            ''', (user_id,)).fetchall()
            
            sentiment_counts = {"positif": 0, "negatif": 0, "neutre": 0}
            for msg in messages:
                if msg['sentiment'] in sentiment_counts:
                    sentiment_counts[msg['sentiment']] += 1
            
            total = len(messages)
            sentiment_percentages = {
                k: round((v / total) * 100, 1) if total > 0 else 0 
                for k, v in sentiment_counts.items()
            }
            
            trends = db.execute('''
                SELECT date(timestamp) as day, sentiment, COUNT(*) as count
                FROM user_messages 
                WHERE user_id = ? AND sentiment IS NOT NULL AND timestamp > datetime('now', '-7 days')
                GROUP BY date(timestamp), sentiment
                ORDER BY day DESC
            ''', (user_id,)).fetchall()
            
            if sentiment_counts["positif"] > sentiment_counts["negatif"]:
                global_sentiment = "positif"
            elif sentiment_counts["negatif"] > sentiment_counts["positif"]:
                global_sentiment = "negatif"
            else:
                global_sentiment = "neutre"
        
        return {
            "success": True,
            "sentiment": {
                "global": global_sentiment,
                "distribution": sentiment_counts,
                "percentages": sentiment_percentages,
                "total_messages": total,
                "trends": [{"day": t['day'], "sentiment": t['sentiment'], "count": t['count']} for t in trends]
            }
        }
    except Exception as e:
        logger.error(f"Erreur get_user_sentiment: {e}")
        return {
            "success": True,
            "sentiment": {
                "global": "neutre",
                "distribution": {"positif": 0, "negatif": 0, "neutre": 0},
                "percentages": {"positif": 0, "negatif": 0, "neutre": 0},
                "total_messages": 0,
                "trends": []
            }
        }

# ==================== ENDPOINTS QUIZ ====================

@router.get("/quiz/results/{user_id}")
async def get_quiz_results(user_id: str):
    try:
        with get_db() as db:
            quizzes = db.execute('SELECT quiz_id, questions, answers, status, created_at, completed_at FROM quizzes WHERE user_id = ? ORDER BY created_at DESC', (user_id,)).fetchall()
        
        results = []
        for q in quizzes:
            results.append({
                "quiz_id": q['quiz_id'],
                "questions": json.loads(q['questions']) if q['questions'] else [],
                "answers": json.loads(q['answers']) if q['answers'] else [],
                "status": q['status'],
                "created_at": q['created_at'],
                "completed_at": q['completed_at']
            })
        return {"success": True, "quizzes": results}
    except Exception as e:
        logger.error(f"Erreur get_quiz_results: {e}")
        return {"success": True, "quizzes": []}


@router.post("/quiz/create")
async def create_quiz(data: dict):
    user_id = data.get("user_id")
    questions = data.get("questions", [])
    quiz_id = str(uuid.uuid4())[:8]
    
    with get_db() as db:
        db.execute('''
            INSERT INTO quizzes (quiz_id, user_id, questions, status, created_at) 
            VALUES (?, ?, ?, ?, ?)
        ''', (quiz_id, user_id, json.dumps(questions), "pending", datetime.now().isoformat()))
    
    logger.info(f"📋 Quiz créé pour {user_id} avec {len(questions)} questions")
    return {"success": True, "quiz_id": quiz_id}


@router.get("/quiz/pending/{user_id}")
async def get_pending_quiz(user_id: str):
    try:
        with get_db() as db:
            quiz = db.execute('''
                SELECT quiz_id, questions, status, created_at 
                FROM quizzes 
                WHERE user_id = ? AND status = 'pending'
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id,)).fetchone()
            
            if quiz:
                questions = json.loads(quiz['questions']) if quiz['questions'] else []
                return {
                    "success": True,
                    "quiz_id": quiz['quiz_id'],
                    "questions": questions,
                    "current": 0,
                    "total": len(questions)
                }
            else:
                return {"success": False, "message": "Aucun quiz en attente"}
    except Exception as e:
        logger.error(f"Erreur get_pending_quiz: {e}")
        return {"success": False, "message": str(e)}


@router.post("/quiz/answer")
async def submit_quiz_answer(data: dict):
    quiz_id = data.get("quiz_id")
    user_id = data.get("user_id")
    answer = data.get("answer")
    
    try:
        with get_db() as db:
            quiz = db.execute('SELECT * FROM quizzes WHERE quiz_id = ? AND user_id = ?', (quiz_id, user_id)).fetchone()
            
            if not quiz:
                return {"success": False, "error": "Quiz non trouvé"}
            
            questions = json.loads(quiz['questions']) if quiz['questions'] else []
            answers = json.loads(quiz['answers']) if quiz['answers'] else []
            
            current_q = len(answers)
            if current_q < len(questions):
                answers.append({
                    "question": questions[current_q],
                    "answer": answer,
                    "timestamp": datetime.now().isoformat()
                })
                
                status = "completed" if len(answers) >= len(questions) else "pending"
                db.execute('''
                    UPDATE quizzes 
                    SET answers = ?, status = ?, completed_at = ?
                    WHERE quiz_id = ?
                ''', (json.dumps(answers), status, datetime.now().isoformat() if status == "completed" else None, quiz_id))
                
                return {
                    "success": True,
                    "completed": status == "completed",
                    "current": len(answers),
                    "total": len(questions)
                }
            else:
                return {"success": False, "error": "Quiz déjà complété"}
    except Exception as e:
        logger.error(f"Erreur submit_quiz_answer: {e}")
        return {"success": False, "error": str(e)}


@router.post("/quiz/submit")
async def submit_quiz(data: dict):
    logger.info(f"Quiz soumis: {data}")
    return {"success": True}


@router.post("/quiz/send")
async def send_quiz(data: dict):
    logger.info(f"Quiz envoyé à: {data.get('user_id')}")
    return {"success": True}

# ==================== ENDPOINTS BANQUE ====================

@router.get("/bank/balance/{user_id}")
async def get_bank_balance(user_id: str):
    with get_db() as db:
        result = db.execute('SELECT balance FROM accounts_euros WHERE user_id = ?', (user_id,)).fetchone()
        balance = result['balance'] if result else 1000
    return {"user_id": user_id, "balance": balance}


@router.get("/bank/points/{user_id}")
async def get_bank_points(user_id: str):
    with get_db() as db:
        result = db.execute('SELECT balance FROM accounts_points WHERE user_id = ?', (user_id,)).fetchone()
        points = result['balance'] if result else 0
    return {"user_id": user_id, "points": points}


@router.get("/bank/transactions/{user_id}")
async def get_bank_transactions(user_id: str, limit: int = 10):
    with get_db() as db:
        results = db.execute('''
            SELECT * FROM transactions_euros 
            WHERE sender_id = ? OR recipient_id = ? 
            ORDER BY date DESC LIMIT ?
        ''', (user_id, user_id, limit)).fetchall()
        transactions = [{"id": r['id'], "date": r['date'], "amount": r['amount'], "type": "Virement"} for r in results]
    return {"user_id": user_id, "transactions": transactions}


@router.post("/bank/send")
async def send_to_bank_bot(data: dict):
    logger.info(f"Message portail: {data.get('message')}")
    return {"success": True}


@router.post("/bank/receive")
async def receive_from_bank_bot(data: dict):
    user_id = data.get("user_id")
    response = data.get("response")
    
    if user_id not in pending_messages:
        pending_messages[user_id] = []
    
    pending_messages[user_id].append({
        "id": len(pending_messages[user_id]),
        "content": response,
        "timestamp": datetime.now().isoformat()
    })
    return {"success": True}


@router.get("/bank/messages/{user_id}")
async def get_pending_messages(user_id: str, last_id: int = 0):
    messages = pending_messages.get(user_id, [])
    new_messages = messages[last_id:] if last_id < len(messages) else []
    return {"success": True, "messages": new_messages, "last_id": len(messages)}


@router.delete("/bank/messages/{user_id}")
async def clear_messages(user_id: str):
    if user_id in pending_messages:
        pending_messages[user_id] = []
    return {"success": True}

# ==================== WEBSOCKET ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
                return True
            except:
                self.disconnect(user_id)
        return False

manager = ConnectionManager()

@router.websocket("/ws/omnichannel/{user_id}")
async def websocket_omnichannel(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

# ==================== VOICE ====================

@router.post("/voice/start")
async def start_voice_call(data: dict):
    user_id = data.get("user_id")
    message = data.get("message", "Un conseiller souhaite vous parler")
    logger.info(f"📞 Appel vocal demandé pour {user_id}: {message}")
    return {"success": True, "message": "Demande d'appel envoyée"}


@router.post("/voice/request")
async def request_voice_call(data: dict):
    user_id = data.get("user_id")
    username = data.get("username")
    
    logger.info(f"📞 Demande d'appel vocal de {username} ({user_id})")
    
    pending_calls[user_id] = {
        "username": username,
        "requested_at": datetime.now().isoformat(),
        "status": "pending"
    }
    
    return {"success": True, "message": "Demande enregistrée"}


@router.get("/voice/pending")
async def get_pending_calls():
    return {"success": True, "calls": list(pending_calls.values())}

# ==================== RECOMMANDATIONS ====================

@router.post("/recommendation/send")
async def send_recommendation(data: dict):
    logger.info(f"Recommandation envoyée: {data.get('title')}")
    return {"success": True}

# ==================== FONCTION D'INITIALISATION ====================

async def init_module():
    """Initialise le module Discord (à appeler depuis main.py)"""
    init_discord_tables()
    logger.info("✅ Module Discord initialisé (SQLite)")
# Ajoutez dans discord_routes.py

@router.get("/insurance/accidents/analytics")
async def get_accident_analytics():
    conn = sqlite3.connect("insurance_bot.db")
    cursor = conn.cursor()
    
    # Récupérer tous les accidents
    cursor.execute('''
        SELECT id, user_id, username, accident_date, address, city, 
               circumstances, latitude, longitude, created_at
        FROM accident_reports
        ORDER BY created_at DESC
    ''')
    accidents = cursor.fetchall()
    
    # Récupérer les satisfactions
    cursor.execute('''
        SELECT accident_id, satisfaction_score, feedback, would_recommend
        FROM satisfaction_forms
    ''')
    satisfactions = cursor.fetchall()
    
    conn.close()
    
    # Analyser les lieux des accidents
    locations = []
    for accident in accidents:
        if accident[7] and accident[8]:  # latitude et longitude
            locations.append({
                "lat": accident[7],
                "lng": accident[8],
                "city": accident[5],
                "date": accident[3]
            })
    
    # Analyser les circonstances
    circumstances_list = []
    for accident in accidents:
        if accident[6]:
            try:
                circs = json.loads(accident[6])
                circumstances_list.extend(circs)
            except:
                pass
    
    from collections import Counter
    circumstances_stats = dict(Counter(circumstances_list).most_common(10))
    
    # Statistiques de satisfaction
    satisfaction_scores = [s[1] for s in satisfactions if s[1]]
    avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 0
    recommendation_rate = len([s for s in satisfactions if s[3]]) / len(satisfactions) if satisfactions else 0
    
    return {
        "success": True,
        "data": {
            "total_accidents": len(accidents),
            "locations": locations,
            "circumstances_stats": circumstances_stats,
            "satisfaction": {
                "average_score": avg_satisfaction,
                "recommendation_rate": recommendation_rate * 100,
                "total_feedback": len(satisfactions)
            },
            "recent_accidents": [
                {
                    "id": a[0],
                    "user_id": a[1],
                    "username": a[2],
                    "date": a[3],
                    "address": a[4],
                    "city": a[5]
                }
                for a in accidents[:20]
            ]
        }
    }
@router.post("/insurance/location/update")
async def update_accident_location(data: dict):
    """Met à jour la localisation d'un sinistre"""
    # À implémenter
    return {"success": True}
# ==================== INITIALISATION ====================
init_discord_tables()
logger.info("✅ Module Discord routes chargé (SQLite)")