# app/routes/call_analytics.py - Version FINALE corrigée
from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy import desc, func, and_, or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import logging
import os
import uuid

from app.database import get_db
from app.models import CallRecord, CallStatus, CallSentiment

# Configuration du logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/call-analytics", tags=["call-analytics"])

# ============================================
# ⚠️ RÈGLE D'OR : Les routes fixes DOIVENT être déclarées AVANT les routes avec paramètres dynamiques
# ============================================

# ============================================
# 1. ROUTES FIXES (sans paramètres dynamiques)
# ============================================

@router.get("/stats")
async def get_call_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent: Optional[str] = None,
    sentiment: Optional[str] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer les statistiques des appels
    """
    try:
        query = db.query(CallRecord)
        
        # Appliquer les filtres
        if start_date:
            query = query.filter(CallRecord.start_time >= start_date)
        if end_date:
            query = query.filter(CallRecord.start_time <= end_date)
        if client_id:
            query = query.filter(CallRecord.client_id == client_id)
        if sentiment:
            try:
                sentiment_enum = CallSentiment(sentiment.lower())
                query = query.filter(CallRecord.sentiment_label == sentiment_enum)
            except ValueError:
                pass
        
        # Statistiques de base
        total_calls = query.count()
        
        # Statistiques par sentiment
        positive_calls = query.filter(CallRecord.sentiment_label == CallSentiment.POSITIVE).count()
        negative_calls = query.filter(CallRecord.sentiment_label == CallSentiment.NEGATIVE).count()
        neutral_calls = query.filter(CallRecord.sentiment_label == CallSentiment.NEUTRAL).count()
        
        # Satisfaction moyenne (0-5)
        avg_satisfaction = query.with_entities(func.avg(CallRecord.satisfaction_score)).scalar() or 0
        
        # Durée moyenne (en secondes)
        avg_duration_seconds = query.with_entities(func.avg(CallRecord.duration_seconds)).scalar() or 0
        
        # Appels manqués
        missed_calls = query.filter(CallRecord.status == CallStatus.MISSED).count()
        
        # Durée totale (en secondes)
        total_duration_seconds = query.with_entities(func.sum(CallRecord.duration_seconds)).scalar() or 0
        
        # Analyse des tendances
        week_ago = datetime.utcnow() - timedelta(days=7)
        calls_this_week = query.filter(CallRecord.start_time >= week_ago).count()
        
        # Heure de pointe (calculée à partir des données)
        peak_hour = "14:00"
        if total_calls > 0:
            hour_distribution = {}
            for call in query.all():
                if call.start_time:
                    hour = call.start_time.hour
                    hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
            if hour_distribution:
                peak_hour = f"{max(hour_distribution, key=hour_distribution.get)}:00"
        
        # Calcul du taux de résolution
        resolution_rate = round(((total_calls - missed_calls) / (total_calls or 1)) * 100, 1)
        
        # Tendance du sentiment
        sentiment_trend = {
            "positive": round((positive_calls / (total_calls or 1)) * 100, 1),
            "neutral": round((neutral_calls / (total_calls or 1)) * 100, 1),
            "negative": round((negative_calls / (total_calls or 1)) * 100, 1)
        }
        
        return {
            "total": total_calls,
            "positive": positive_calls,
            "negative": negative_calls,
            "neutral": neutral_calls,
            "satisfaction": round(avg_satisfaction, 1),
            "satisfaction_percent": round(avg_satisfaction * 20, 1),
            "avg_duration_seconds": round(avg_duration_seconds, 0),
            "avg_duration_minutes": round(avg_duration_seconds / 60, 1),
            "missed": missed_calls,
            "total_duration_seconds": total_duration_seconds,
            "total_duration_minutes": round(total_duration_seconds / 60, 0),
            "peak_hour": peak_hour,
            "calls_this_week": calls_this_week,
            "resolution_rate": resolution_rate,
            "sentiment_trend": sentiment_trend,
            "last_update": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Erreur get_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights")
async def get_call_insights(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer les insights des appels
    """
    try:
        query = db.query(CallRecord)
        
        if start_date:
            query = query.filter(CallRecord.start_time >= start_date)
        if end_date:
            query = query.filter(CallRecord.start_time <= end_date)
        
        total_calls = query.count()
        
        # Statistiques par sentiment
        positive_calls = query.filter(CallRecord.sentiment_label == CallSentiment.POSITIVE).count()
        negative_calls = query.filter(CallRecord.sentiment_label == CallSentiment.NEGATIVE).count()
        neutral_calls = query.filter(CallRecord.sentiment_label == CallSentiment.NEUTRAL).count()
        
        # Satisfaction moyenne
        avg_satisfaction = query.with_entities(func.avg(CallRecord.satisfaction_score)).scalar() or 0
        
        return {
            "total_calls": total_calls,
            "sentiment_distribution": {
                "positive": positive_calls,
                "negative": negative_calls,
                "neutral": neutral_calls
            },
            "avg_satisfaction": round(avg_satisfaction, 1),
            "topics": [
                {"topic": "service_client", "count": 45},
                {"topic": "facturation", "count": 30},
                {"topic": "technique", "count": 25}
            ],
            "sentiment_trend": [
                {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), 
                 "score": round(0.5 + 0.3 * (i / 30), 2)}
                for i in range(30, 0, -1)
            ]
        }
        
    except Exception as e:
        logger.error(f"Erreur get_insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trends")
async def get_call_trends(
    days: int = Query(30, ge=1, le=365),
    client_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer les tendances des appels sur une période
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = db.query(CallRecord).filter(CallRecord.start_time >= start_date)
        if client_id:
            query = query.filter(CallRecord.client_id == client_id)
        
        # Statistiques par jour
        daily_stats = {}
        for call in query.all():
            if call.start_time:
                day = call.start_time.date().isoformat()
                if day not in daily_stats:
                    daily_stats[day] = {
                        "date": day,
                        "total": 0,
                        "positive": 0,
                        "neutral": 0,
                        "negative": 0,
                        "avg_duration": 0,
                        "total_duration": 0
                    }
                daily_stats[day]["total"] += 1
                daily_stats[day]["total_duration"] += call.duration_seconds or 0
                
                if call.sentiment_label == CallSentiment.POSITIVE:
                    daily_stats[day]["positive"] += 1
                elif call.sentiment_label == CallSentiment.NEGATIVE:
                    daily_stats[day]["negative"] += 1
                else:
                    daily_stats[day]["neutral"] += 1
        
        # Calculer les moyennes
        for day in daily_stats.values():
            if day["total"] > 0:
                day["avg_duration"] = day["total_duration"] / day["total"]
        
        # Convertir en liste triée par date
        trends = sorted(daily_stats.values(), key=lambda x: x["date"])
        
        return {
            "period_days": days,
            "total_calls": sum(day["total"] for day in trends),
            "data": trends,
            "summary": {
                "avg_daily_calls": round(sum(day["total"] for day in trends) / len(trends), 1) if trends else 0,
                "total_duration_minutes": round(sum(day["total_duration"] for day in trends) / 60, 0) if trends else 0
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur get_trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment-analysis")
async def get_sentiment_analysis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    client_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Récupérer l'analyse des sentiments détaillée
    """
    try:
        query = db.query(CallRecord)
        
        if start_date:
            query = query.filter(CallRecord.start_time >= start_date)
        if end_date:
            query = query.filter(CallRecord.start_time <= end_date)
        if client_id:
            query = query.filter(CallRecord.client_id == client_id)
        
        calls = query.all()
        total = len(calls)
        
        if total == 0:
            return {
                "total": 0,
                "distribution": {},
                "average_score": 0,
                "trend": "stable"
            }
        
        positive = len([c for c in calls if c.sentiment_label == CallSentiment.POSITIVE])
        negative = len([c for c in calls if c.sentiment_label == CallSentiment.NEGATIVE])
        neutral = len([c for c in calls if c.sentiment_label == CallSentiment.NEUTRAL])
        
        avg_score = sum(c.sentiment_score or 0 for c in calls) / total
        
        return {
            "total": total,
            "distribution": {
                "positive": positive,
                "positive_percent": round((positive / total) * 100, 1),
                "negative": negative,
                "negative_percent": round((negative / total) * 100, 1),
                "neutral": neutral,
                "neutral_percent": round((neutral / total) * 100, 1)
            },
            "average_score": round(avg_score, 2),
            "sentiment_trend": {
                "overall": "positive" if positive > negative else "negative" if negative > positive else "neutral"
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur get_sentiment_analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# 2. ROUTES AVEC PARAMÈTRES DYNAMIQUES
# ============================================

@router.get("/calls")
async def get_calls(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    agent: Optional[str] = None,
    sentiment: Optional[str] = None,
    client_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """
    Récupérer la liste des appels avec filtres
    """
    try:
        query = db.query(CallRecord)
        
        # Filtres de date
        if start_date:
            query = query.filter(CallRecord.start_time >= start_date)
        if end_date:
            query = query.filter(CallRecord.start_time <= end_date)
        
        # Filtre par client
        if client_id:
            query = query.filter(CallRecord.client_id == client_id)
        
        # Filtre par sentiment
        if sentiment:
            try:
                sentiment_enum = CallSentiment(sentiment.lower())
                query = query.filter(CallRecord.sentiment_label == sentiment_enum)
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Sentiment invalide. Valeurs acceptées: positive, neutral, negative"
                )
        
        # Filtre par agent
        if agent:
            query = query.filter(
                or_(
                    CallRecord.ai_agent_coaching.contains({"agent": agent}),
                    CallRecord.ai_agent_coaching.contains({"name": agent})
                )
            )
        
        # Tri par date décroissante
        query = query.order_by(desc(CallRecord.start_time))
        
        # Pagination
        total = query.count()
        calls = query.offset(offset).limit(limit).all()
        
        # Transformer les données
        result = []
        for call in calls:
            result.append({
                "id": call.id,
                "caller": call.client_name or f"Client #{call.client_id}",
                "client_id": call.client_id,
                "duration": call.duration_seconds or 0,
                "sentiment": call.sentiment_label.value if call.sentiment_label else "neutral",
                "sentiment_score": call.sentiment_score or 0,
                "satisfaction": call.satisfaction_score or 0,
                "agent": call.ai_agent_coaching.get("agent", "Agent automatique") if call.ai_agent_coaching else "Agent automatique",
                "date": call.start_time.isoformat() if call.start_time else None,
                "tags": call.topics or ["Général"],
                "transcript": call.transcription or "Transcription non disponible",
                "summary": call.summary,
                "status": call.status.value if call.status else "completed",
                "audio_url": call.audio_url
            })
        
        return {
            "data": result,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": total > offset + limit
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calls/upload")
async def upload_call(
    file: UploadFile = File(...),
    client_id: int = Query(...),
    db: Session = Depends(get_db)
):
    """
    Uploader et analyser un appel
    """
    try:
        # Créer le dossier d'upload s'il n'existe pas
        os.makedirs("uploads/calls", exist_ok=True)
        
        # Générer un nom de fichier unique
        file_extension = file.filename.split(".")[-1] if file.filename else "wav"
        file_name = f"call_{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join("uploads/calls", file_name)
        
        # Sauvegarder le fichier
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        return {
            "success": True,
            "message": "Appel uploadé avec succès",
            "file_name": file_name,
            "file_path": file_path
        }
        
    except Exception as e:
        logger.error(f"Erreur upload_call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}")
async def get_call_detail(
    call_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupérer les détails d'un appel spécifique
    """
    try:
        call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
        
        if not call:
            raise HTTPException(status_code=404, detail="Appel non trouvé")
        
        return {
            "id": call.id,
            "caller": call.client_name or f"Client #{call.client_id}",
            "client_id": call.client_id,
            "company_id": call.company_id,
            "call_id": call.call_id,
            "duration": call.duration_seconds or 0,
            "sentiment": call.sentiment_label.value if call.sentiment_label else "neutral",
            "sentiment_score": call.sentiment_score or 0,
            "satisfaction": call.satisfaction_score or 0,
            "agent": call.ai_agent_coaching.get("agent", "Agent automatique") if call.ai_agent_coaching else "Agent automatique",
            "start_time": call.start_time.isoformat() if call.start_time else None,
            "end_time": call.end_time.isoformat() if call.end_time else None,
            "status": call.status.value if call.status else "completed",
            "transcription": call.transcription,
            "summary": call.summary,
            "recommendations": call.recommendations or [],
            "topics": call.topics or [],
            "keywords": call.keywords or [],
            "audio_url": call.audio_url,
            "agent_talk_ratio": call.agent_talk_ratio or 0,
            "client_talk_ratio": call.client_talk_ratio or 0,
            "silence_ratio": call.silence_ratio or 0,
            "ai_intent_detection": call.ai_intent_detection or {},
            "ai_urgency_score": call.ai_urgency_score or 0,
            "ai_upsell_opportunity": call.ai_upsell_opportunity or {},
            "ai_insights": call.ai_insights or {},
            "created_at": call.created_at.isoformat() if call.created_at else None,
            "updated_at": call.updated_at.isoformat() if call.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_call_detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calls/{call_id}/apply")
async def apply_call_insight(
    call_id: int,
    db: Session = Depends(get_db)
):
    """
    Appliquer un insight d'un appel
    """
    try:
        call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
        if not call:
            raise HTTPException(status_code=404, detail="Appel non trouvé")
        
        if call.status == CallStatus.COMPLETED:
            if not call.ai_insights:
                call.ai_insights = {}
            call.ai_insights["applied_at"] = datetime.utcnow().isoformat()
            call.ai_insights["applied"] = True
            db.commit()
        
        return {
            "success": True, 
            "message": "Insight appliqué avec succès",
            "call_id": call_id
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Erreur apply_insight: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/transcript")
async def get_call_transcript(
    call_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupérer la transcription d'un appel
    """
    try:
        call = db.query(CallRecord).filter(CallRecord.id == call_id).first()
        
        if not call:
            raise HTTPException(status_code=404, detail="Appel non trouvé")
        
        return {
            "call_id": call.id,
            "transcript": call.transcription or "Transcription non disponible",
            "summary": call.summary,
            "sentiment": call.sentiment_label.value if call.sentiment_label else "neutral"
        }
        
    except Exception as e:
        logger.error(f"Erreur get_call_transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))