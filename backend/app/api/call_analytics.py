# app/api/call_analytics.py - Version corrigée
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_

from app.database import get_db
# ✅ Importer depuis call_analytics
from app.models.call_analytics import (
    CallRecord, CallAnalytics, CallTopicStats, CallDailyStats,
    CallStatus, CallSentiment, CallTopic
)
from app.models.banking import Client
from app.core.dependencies import get_current_active_user
from app.models.auth import User
import random
import uuid
import os
import json

router = APIRouter(prefix="/call-analytics", tags=["call-analytics"])


# =========================
# MODÈLES DE RÉPONSE PYDANTIC
# =========================

from pydantic import BaseModel

class CallResponse(BaseModel):
    id: int
    call_id: str
    client: str
    date: str
    duration: int
    sentiment: float
    sentiment_label: str
    satisfaction: int
    audio_url: Optional[str] = None
    summary: Optional[str] = None
    transcription: Optional[Any] = None
    recommendations: Optional[Any] = None

    class Config:
        from_attributes = True


class CallDetailResponse(BaseModel):
    id: int
    call_id: str
    client: str
    start_time: str
    end_time: Optional[str] = None
    duration: int
    sentiment_score: float
    sentiment_label: str
    satisfaction_score: int
    transcription: Optional[Any] = None
    summary: Optional[str] = None
    recommendations: Optional[Any] = None
    topics: Optional[Any] = None
    analytics: Optional[Dict] = None

    class Config:
        from_attributes = True


# =========================
# ENDPOINTS
# =========================

@router.get("/calls", response_model=List[CallResponse])
async def get_calls(
    date_range: str = Query("week", description="day, week, month, year"),
    sentiment: str = Query("all"),
    client_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer la liste des appels"""
    
    query = db.query(CallRecord)
    
    # Filtrer par période
    now = datetime.now()
    if date_range == "day":
        start_date = now - timedelta(days=1)
    elif date_range == "week":
        start_date = now - timedelta(days=7)
    elif date_range == "month":
        start_date = now - timedelta(days=30)
    elif date_range == "year":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)
    
    query = query.filter(CallRecord.start_time >= start_date)
    
    # Filtrer par sentiment
    if sentiment != "all":
        try:
            sentiment_enum = CallSentiment(sentiment.lower())
            query = query.filter(CallRecord.sentiment_label == sentiment_enum)
        except ValueError:
            pass
    
    # Filtrer par client
    if client_id and current_user.role == "admin":
        query = query.filter(CallRecord.client_id == client_id)
    elif current_user.role != "admin":
        query = query.filter(CallRecord.client_id == current_user.id)
    
    calls = query.order_by(desc(CallRecord.start_time)).limit(limit).all()
    
    # Si pas d'appels, générer des données de démonstration
    if not calls and current_user.role == "admin":
        calls = generate_mock_calls(db, limit)
    
    return [
        {
            "id": c.id,
            "call_id": c.call_id,
            "client": c.client_name,
            "date": c.start_time.strftime("%d/%m/%Y %H:%M"),
            "duration": c.duration_seconds,
            "sentiment": c.sentiment_score,
            "sentiment_label": c.sentiment_label.value if c.sentiment_label else "neutral",
            "satisfaction": c.satisfaction_score,
            "audio_url": c.audio_url,
            "summary": c.summary,
            "transcription": c.transcription,
            "recommendations": c.recommendations
        }
        for c in calls
    ]


@router.get("/insights")
async def get_insights(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les insights d'analyse"""
    
    # Récupérer les statistiques
    stats = db.query(CallDailyStats).order_by(CallDailyStats.date).limit(30).all()
    
    # Récupérer les thèmes
    topics = db.query(CallTopicStats).filter(
        CallTopicStats.date >= datetime.now() - timedelta(days=30)
    ).all()
    
    # Calculer le taux de sentiment positif
    total_calls = db.query(CallRecord).count()
    positive_calls = db.query(CallRecord).filter(
        CallRecord.sentiment_label == CallSentiment.POSITIVE
    ).count()
    positive_rate = (positive_calls / total_calls * 100) if total_calls > 0 else 78
    
    # Calculer la satisfaction moyenne
    avg_satisfaction = db.query(func.avg(CallRecord.satisfaction_score)).scalar() or 4.2
    
    # Préparer les données de sentiment
    sentiment_data = [
        {"date": s.date.strftime("%Y-%m-%d"), "score": s.avg_sentiment}
        for s in stats
    ]
    
    # Préparer les données de thèmes pour le wordcloud
    topic_data = []
    topic_counts = {}
    for t in topics:
        topic_counts[t.topic] = topic_counts.get(t.topic, 0) + t.count
    
    for topic, count in topic_counts.items():
        topic_data.append({"topic": topic, "count": count})
    
    return {
        "topics": topic_data,
        "sentiment": sentiment_data,
        "satisfaction": {
            "average": round(avg_satisfaction, 1),
            "distribution": get_satisfaction_distribution(db)
        },
        "sentiment_rate": {
            "positive_rate": positive_rate,
            "neutral_rate": 100 - positive_rate - (100 - positive_rate - 10),
            "negative_rate": 10
        }
    }


@router.get("/calls/{call_id}", response_model=CallDetailResponse)
async def get_call_details(
    call_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les détails d'un appel"""
    
    call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Appel non trouvé")
    
    # Vérifier l'accès
    if current_user.role != "admin" and call.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Récupérer les analytics
    analytics = db.query(CallAnalytics).filter(
        CallAnalytics.call_id == call.id
    ).first()
    
    return {
        "id": call.id,
        "call_id": call.call_id,
        "client": call.client_name,
        "start_time": call.start_time.isoformat(),
        "end_time": call.end_time.isoformat() if call.end_time else None,
        "duration": call.duration_seconds,
        "sentiment_score": call.sentiment_score,
        "sentiment_label": call.sentiment_label.value if call.sentiment_label else "neutral",
        "satisfaction_score": call.satisfaction_score,
        "transcription": call.transcription,
        "summary": call.summary,
        "recommendations": call.recommendations,
        "topics": call.topics,
        "analytics": {
            "sentiment_timeline": analytics.sentiment_timeline if analytics else [],
            "emotions": analytics.emotions if analytics else [],
            "key_phrases": analytics.key_phrases if analytics else [],
            "quality_score": analytics.quality_score if analytics else 0
        } if analytics else None
    }


@router.post("/calls/upload")
async def upload_call(
    file: UploadFile = File(...),
    client_id: int = Query(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Uploader et analyser un appel"""
    
    # Vérifier les droits
    if current_user.role != "admin" and current_user.id != client_id:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    
    # Récupérer le client
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Sauvegarder le fichier
    file_extension = file.filename.split(".")[-1]
    file_name = f"call_{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join("uploads/calls", file_name)
    os.makedirs("uploads/calls", exist_ok=True)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
    
    # Analyser l'appel (simulation)
    analysis = analyze_call(file_path, client)
    
    # Créer l'enregistrement de l'appel
    call_record = CallRecord(
        client_id=client_id,
        call_id=f"CALL-{uuid.uuid4().hex[:8].upper()}",
        client_name=f"{client.first_name} {client.last_name}",
        client_phone=client.phone,
        start_time=datetime.now() - timedelta(seconds=analysis["duration"]),
        end_time=datetime.now(),
        duration_seconds=analysis["duration"],
        status=CallStatus.COMPLETED,
        audio_url=f"/uploads/calls/{file_name}",
        audio_file_path=file_path,
        sentiment_score=analysis["sentiment_score"],
        sentiment_label=analysis["sentiment_label"],
        satisfaction_score=analysis["satisfaction"],
        transcription=analysis["transcription"],
        summary=analysis["summary"],
        recommendations=analysis["recommendations"],
        topics=analysis["topics"],
        keywords=analysis["keywords"],
        agent_talk_ratio=analysis["agent_talk_ratio"],
        client_talk_ratio=analysis["client_talk_ratio"],
        silence_ratio=analysis["silence_ratio"],
        created_at=datetime.now()
    )
    
    db.add(call_record)
    db.flush()
    
    # Créer les analytics
    call_analytics = CallAnalytics(
        call_id=call_record.id,
        sentiment_timeline=analysis["sentiment_timeline"],
        emotions=analysis["emotions"],
        key_phrases=analysis["key_phrases"],
        named_entities=analysis["named_entities"],
        interruptions=analysis["interruptions"],
        response_time=analysis["response_time"],
        quality_score=analysis["quality_score"],
        created_at=datetime.now()
    )
    
    db.add(call_analytics)
    
    # Mettre à jour les statistiques
    update_daily_stats(db, call_record.start_time)
    update_topic_stats(db, call_record.start_time, analysis["topics"], analysis["sentiment_label"], analysis["satisfaction"])
    
    db.commit()
    
    return {
        "success": True,
        "call_id": call_record.id,
        "message": "Appel analysé avec succès"
    }


@router.get("/stats/daily")
async def get_daily_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Récupérer les statistiques quotidiennes"""
    
    stats = db.query(CallDailyStats).filter(
        CallDailyStats.date >= datetime.now() - timedelta(days=days)
    ).order_by(CallDailyStats.date).all()
    
    return [
        {
            "date": s.date.strftime("%Y-%m-%d"),
            "total_calls": s.total_calls,
            "avg_duration": s.avg_duration,
            "avg_sentiment": s.avg_sentiment,
            "avg_satisfaction": s.avg_satisfaction,
            "positive_calls": s.positive_calls,
            "negative_calls": s.negative_calls
        }
        for s in stats
    ]


# =========================
# FONCTIONS UTILITAIRES
# =========================

def analyze_call(file_path: str, client) -> Dict[str, Any]:
    """Analyser un appel avec IA (simulation)"""
    
    duration = random.randint(60, 600)
    sentiment_score = random.uniform(0.2, 0.9)
    sentiment_label = CallSentiment.POSITIVE if sentiment_score > 0.6 else CallSentiment.NEGATIVE if sentiment_score < 0.4 else CallSentiment.NEUTRAL
    
    transcription = generate_mock_transcription(duration)
    
    topics = [
        {"topic": "service_client", "weight": 0.8},
        {"topic": "delais", "weight": 0.6},
        {"topic": "satisfaction", "weight": 0.7}
    ]
    
    return {
        "duration": duration,
        "sentiment_score": sentiment_score,
        "sentiment_label": sentiment_label,
        "satisfaction": random.randint(3, 5),
        "transcription": transcription,
        "summary": "Le client a appelé pour obtenir des informations sur son dossier.",
        "recommendations": "Proposer un suivi dans 48h.",
        "topics": topics,
        "keywords": ["delai", "dossier", "satisfaction"],
        "agent_talk_ratio": random.uniform(0.3, 0.5),
        "client_talk_ratio": random.uniform(0.4, 0.6),
        "silence_ratio": random.uniform(0.05, 0.15),
        "sentiment_timeline": [
            {"time": 0, "score": 0.5},
            {"time": 30, "score": 0.7},
            {"time": 60, "score": 0.8}
        ],
        "emotions": [
            {"emotion": "neutre", "time": 0, "score": 0.6},
            {"emotion": "content", "time": 30, "score": 0.7}
        ],
        "key_phrases": ["delai de traitement", "satisfait du service"],
        "named_entities": [
            {"entity": "DATE", "value": "15 mars"},
            {"entity": "MONTANT", "value": "1500€"}
        ],
        "interruptions": random.randint(0, 3),
        "response_time": random.uniform(2, 10),
        "quality_score": random.uniform(70, 95)
    }


def generate_mock_transcription(duration: int) -> List[Dict]:
    """Générer une transcription simulée"""
    
    speakers = ["Agent", "Client"]
    segments = []
    current_time = 0
    
    while current_time < duration:
        speaker = random.choice(speakers)
        text = "Voici un exemple de transcription pour cet appel."
        segment_duration = random.randint(10, 30)
        
        segments.append({
            "speaker": speaker,
            "text": text,
            "time": f"{current_time // 60}:{current_time % 60:02d}"
        })
        
        current_time += segment_duration
    
    return segments[:10]


def update_daily_stats(db: Session, date: datetime):
    """Mettre à jour les statistiques quotidiennes"""
    
    day_start = date.replace(hour=0, minute=0, second=0)
    day_end = day_start.replace(hour=23, minute=59, second=59)
    
    stats = db.query(CallDailyStats).filter(
        CallDailyStats.date == day_start
    ).first()
    
    if not stats:
        stats = CallDailyStats(date=day_start)
        db.add(stats)
    
    calls = db.query(CallRecord).filter(
        and_(
            CallRecord.start_time >= day_start,
            CallRecord.start_time <= day_end
        )
    ).all()
    
    stats.total_calls = len(calls)
    if calls:
        stats.avg_duration = sum(c.duration_seconds for c in calls) / len(calls)
        stats.avg_sentiment = sum(c.sentiment_score for c in calls) / len(calls)
        stats.avg_satisfaction = sum(c.satisfaction_score for c in calls) / len(calls)
        stats.positive_calls = len([c for c in calls if c.sentiment_label == CallSentiment.POSITIVE])
        stats.neutral_calls = len([c for c in calls if c.sentiment_label == CallSentiment.NEUTRAL])
        stats.negative_calls = len([c for c in calls if c.sentiment_label == CallSentiment.NEGATIVE])
    
    db.commit()


def update_topic_stats(db: Session, date: datetime, topics: List, sentiment_label: CallSentiment, satisfaction: float):
    """Mettre à jour les statistiques des thèmes"""
    
    for topic_data in topics:
        topic_name = topic_data.get("topic", "other")
        
        topic_stats = db.query(CallTopicStats).filter(
            and_(
                CallTopicStats.date == date.replace(hour=0, minute=0, second=0),
                CallTopicStats.topic == topic_name
            )
        ).first()
        
        if not topic_stats:
            topic_stats = CallTopicStats(
                date=date.replace(hour=0, minute=0, second=0),
                topic=topic_name
            )
            db.add(topic_stats)
        
        topic_stats.count += 1
        if sentiment_label == CallSentiment.POSITIVE:
            topic_stats.positive_count += 1
        elif sentiment_label == CallSentiment.NEGATIVE:
            topic_stats.negative_count += 1
        
        total_satisfaction = topic_stats.avg_satisfaction * (topic_stats.count - 1) + satisfaction
        topic_stats.avg_satisfaction = total_satisfaction / topic_stats.count
    
    db.commit()


def get_satisfaction_distribution(db: Session) -> Dict:
    """Obtenir la distribution des satisfactions"""
    
    satisfaction_counts = db.query(
        CallRecord.satisfaction_score,
        func.count(CallRecord.id).label('count')
    ).group_by(CallRecord.satisfaction_score).all()
    
    return {int(s): c for s, c in satisfaction_counts}


def generate_mock_calls(db: Session, limit: int) -> List[CallRecord]:
    """Générer des appels mock pour la démonstration"""
    
    clients = db.query(Client).limit(5).all()
    mock_calls = []
    
    for i in range(min(limit, 20)):
        client = random.choice(clients) if clients else None
        duration = random.randint(60, 600)
        
        mock_call = CallRecord(
            client_id=client.id if client else 1,
            call_id=f"CALL-MOCK-{i+1:04d}",
            client_name=f"{client.first_name} {client.last_name}" if client else f"Client {i+1}",
            client_phone=f"06{random.randint(10000000, 99999999)}",
            start_time=datetime.now() - timedelta(days=random.randint(0, 30)),
            end_time=datetime.now(),
            duration_seconds=duration,
            status=CallStatus.COMPLETED,
            sentiment_score=random.uniform(0.3, 0.9),
            sentiment_label=random.choice([CallSentiment.POSITIVE, CallSentiment.NEUTRAL, CallSentiment.NEGATIVE]),
            satisfaction_score=random.randint(2, 5),
            transcription=generate_mock_transcription(duration),
            summary="Résumé de l'appel mock",
            recommendations="Recommandations pour l'appel mock",
            topics=[{"topic": random.choice(["service", "facture", "dossier"]), "weight": 0.8}],
            keywords=["mot1", "mot2"],
            created_at=datetime.now()
        )
        mock_calls.append(mock_call)
    
    return mock_calls