from fastapi import APIRouter, Depends
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import logging

from app.database import get_db

router = APIRouter(prefix="/insights", tags=["business-insights"])
logger = logging.getLogger(__name__)


@router.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db)):
    """Récupère toutes les données du dashboard"""
    
    sql_insights = text("""
        SELECT id, title, description, 
               insight_type::text, category::text,
               impact, potential_value, confidence, urgency,
               recommended_actions, is_applied, is_dismissed, is_read,
               created_at, company_id
        FROM business_insights
        WHERE is_dismissed = false
        ORDER BY created_at DESC
        LIMIT 20
    """)
    
    result = db.execute(sql_insights)
    insights = []
    for row in result:
        insights.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "insight_type": row[3],
            "category": row[4],
            "impact": row[5],
            "potential_value": float(row[6]) if row[6] else 0,
            "confidence": row[7] or 0,
            "urgency": row[8] or 0,
            "recommended_actions": row[9] if row[9] else [],
            "is_applied": row[10],
            "is_dismissed": row[11],
            "is_read": row[12],
            "created_at": row[13],
            "company_id": row[14]
        })
    
    sql_keywords = text("SELECT name FROM products LIMIT 10")
    keywords = []
    try:
        result_kw = db.execute(sql_keywords)
        for i, row in enumerate(result_kw):
            keywords.append({
                "id": i+1,
                "text": row[0],
                "value": 75,
                "category": "Produit",
                "source": "catalogue"
            })
    except:
        keywords = []
    
    performance = {
        "id": 1,
        "name": "business_health_score",
        "value": 75.5,
        "trend": 5.2,
        "unit": "%",
        "category": "Global"
    }
    
    return {
        "insights": insights,
        "keywords": keywords,
        "performance": performance,
        "market_trends": []
    }


@router.get("/insights")
async def get_insights(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Récupère les insights"""
    sql = text("""
        SELECT id, title, description, 
               insight_type::text, category::text,
               impact, potential_value, confidence, urgency,
               recommended_actions, is_applied, is_dismissed, is_read,
               created_at, company_id
        FROM business_insights
        WHERE is_dismissed = false
        ORDER BY created_at DESC
        LIMIT :limit
    """)
    
    result = db.execute(sql, {"limit": limit})
    insights = []
    for row in result:
        insights.append({
            "id": row[0],
            "title": row[1],
            "description": row[2],
            "insight_type": row[3],
            "category": row[4],
            "impact": row[5],
            "potential_value": float(row[6]) if row[6] else 0,
            "confidence": row[7] or 0,
            "urgency": row[8] or 0,
            "recommended_actions": row[9] if row[9] else [],
            "is_applied": row[10],
            "is_dismissed": row[11],
            "is_read": row[12],
            "created_at": row[13],
            "company_id": row[14]
        })
    
    return insights


@router.post("/generate-insights")
async def generate_insights(db: Session = Depends(get_db)):
    """Génère automatiquement des insights basés sur vos données réelles"""
    from datetime import datetime, timedelta
    from sqlalchemy import text
    
    now = datetime.now()
    last_30_days = now - timedelta(days=30)
    
    insights_generated = []
    
    # 1. Insight basé sur le CA
    sql_revenue = text("""
        SELECT COALESCE(SUM(amount_total), 0) as total
        FROM sale_orders
        WHERE date_order >= :start_date
    """)
    
    result = db.execute(sql_revenue, {"start_date": last_30_days})
    total_revenue = result.scalar() or 0
    
    if total_revenue > 0:
        insight_revenue = {
            "title": f"Chiffre d'affaires: {total_revenue:,.0f} €",
            "description": f"Votre CA des 30 derniers jours est de {total_revenue:,.0f} €. Opportunité de croissance.",
            "insight_type": "OPPORTUNITY",
            "category": "Finances",
            "impact": "Élevé",
            "potential_value": total_revenue * 0.2,
            "confidence": 85,
            "urgency": 3,
            "recommended_actions": json.dumps([
                "Analyser les produits les plus vendus",
                "Développer des offres similaires",
                "Optimiser votre stratégie marketing"
            ])
        }
        insights_generated.append(insight_revenue)
    
    # 2. Insight basé sur les commandes
    sql_orders = text("""
        SELECT COUNT(*) as count
        FROM sale_orders
        WHERE date_order >= :start_date
    """)
    
    result_orders = db.execute(sql_orders, {"start_date": last_30_days})
    total_orders = result_orders.scalar() or 0
    
    if total_orders > 0:
        insight_orders = {
            "title": f"{total_orders} commandes ce mois",
            "description": f"Vous avez enregistré {total_orders} commandes. Tendance positive à maintenir.",
            "insight_type": "OPPORTUNITY",
            "category": "Opérations",
            "impact": "Moyen",
            "potential_value": total_orders * 1000,
            "confidence": 80,
            "urgency": 2,
            "recommended_actions": json.dumps([
                "Fidéliser vos clients",
                "Améliorer le parcours d'achat",
                "Proposer des programmes de parrainage"
            ])
        }
        insights_generated.append(insight_orders)
    
    # 3. Insight de recommandation générale
    insight_general = {
        "title": "Optimisation de votre activité",
        "description": "Analysez vos données pour identifier les axes d'amélioration et les opportunités de croissance.",
        "insight_type": "RECOMMENDATION",
        "category": "Opérations",
        "impact": "Moyen",
        "potential_value": 50000,
        "confidence": 75,
        "urgency": 2,
        "recommended_actions": json.dumps([
            "Auditer vos processus internes",
            "Former vos équipes aux nouvelles technologies",
            "Mettre en place un tableau de bord de suivi"
        ])
    }
    insights_generated.append(insight_general)
    
    saved_count = 0
    for insight in insights_generated:
        sql_check = text("SELECT id FROM business_insights WHERE title = :title LIMIT 1")
        existing = db.execute(sql_check, {"title": insight["title"]}).first()
        
        if not existing:
            sql_insert = text("""
                INSERT INTO business_insights 
                (title, description, insight_type, category, impact, 
                 potential_value, confidence, urgency, recommended_actions, created_at)
                VALUES 
                (:title, :description, :insight_type, :category, :impact,
                 :potential_value, :confidence, :urgency, CAST(:recommended_actions AS jsonb), NOW())
            """)
            
            db.execute(sql_insert, {
                "title": insight["title"],
                "description": insight["description"],
                "insight_type": insight["insight_type"],
                "category": insight["category"],
                "impact": insight["impact"],
                "potential_value": insight["potential_value"],
                "confidence": insight["confidence"],
                "urgency": insight["urgency"],
                "recommended_actions": insight["recommended_actions"]
            })
            saved_count += 1
    
    db.commit()
    
    return {
        "message": f"{saved_count} insights générés avec succès",
        "insights_count": saved_count
    }


@router.get("/real-time-trends")
async def get_real_time_trends(db: Session = Depends(get_db)):
    """Récupère les tendances en temps réel"""
    
    sql = text("""
        SELECT 
            DATE(date_order) as date,
            COUNT(*) as order_count,
            SUM(amount_total) as total_amount
        FROM sale_orders
        WHERE date_order >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(date_order)
        ORDER BY date DESC
    """)
    
    result = db.execute(sql)
    
    search_trends = []
    for row in result:
        search_trends.append({
            "text": f"Ventes du {row[0]}",
            "value": min(100, 50 + (row[1] or 0) * 5),
            "category": "Ventes",
            "trend": "up" if (row[1] or 0) > 5 else "stable",
            "count": row[1],
            "amount": float(row[2]) if row[2] else 0
        })
    
    return {
        "search_trends": search_trends[:10],
        "social_trends": [],
        "news_trends": [],
        "updated_at": datetime.now().isoformat()
    }


@router.get("/keywords")
async def get_keywords(db: Session = Depends(get_db)):
    """Récupère les mots-clés"""
    sql = text("SELECT name FROM products LIMIT 20")
    result = db.execute(sql)
    keywords = []
    for i, row in enumerate(result):
        keywords.append({
            "id": i+1,
            "text": row[0],
            "value": 70,
            "category": "Produit",
            "source": "catalogue"
        })
    return keywords


@router.get("/market-trends")
async def get_market_trends(db: Session = Depends(get_db)):
    """Récupère les tendances du marché"""
    sql = text("""
        SELECT 
            CASE 
                WHEN amount_total < 1000 THEN 'Petits montants'
                WHEN amount_total < 10000 THEN 'Moyens montants'
                ELSE 'Grands montants'
            END as segment,
            COUNT(*) as count
        FROM sale_orders
        WHERE date_order >= NOW() - INTERVAL '90 days'
        GROUP BY segment
    """)
    
    result = db.execute(sql)
    trends = []
    for i, row in enumerate(result):
        trends.append({
            "id": i+1,
            "segment": row[0],
            "growth_rate": 10.0,
            "confidence": 85,
            "source": "analyse_ventes"
        })
    return trends


@router.get("/performance")
async def get_performance(db: Session = Depends(get_db)):
    """Récupère la performance"""
    sql = text("""
        SELECT COALESCE(SUM(amount_total), 0) as total
        FROM sale_orders
        WHERE date_order >= NOW() - INTERVAL '30 days'
    """)
    
    result = db.execute(sql)
    total_revenue = result.scalar() or 0
    
    return {
        "id": 1,
        "name": "business_health_score",
        "value": min(100, total_revenue / 1000),
        "trend": 5.2,
        "unit": "%",
        "category": "Global"
    }


@router.post("/insights/{insight_id}/apply")
async def apply_insight(insight_id: int, db: Session = Depends(get_db)):
    sql = text("UPDATE business_insights SET is_applied = true WHERE id = :id")
    db.execute(sql, {"id": insight_id})
    db.commit()
    return {"message": "Insight appliqué avec succès"}


@router.post("/insights/{insight_id}/dismiss")
async def dismiss_insight(insight_id: int, db: Session = Depends(get_db)):
    sql = text("UPDATE business_insights SET is_dismissed = true WHERE id = :id")
    db.execute(sql, {"id": insight_id})
    db.commit()
    return {"message": "Insight ignoré"}


@router.post("/insights/{insight_id}/read")
async def mark_as_read(insight_id: int, db: Session = Depends(get_db)):
    sql = text("UPDATE business_insights SET is_read = true WHERE id = :id")
    db.execute(sql, {"id": insight_id})
    db.commit()
    return {"message": "Insight marqué comme lu"}

@router.get("/ui-strategy")
async def get_ui_strategy(db: Session = Depends(get_db)):
    """
    UI GÉNÉRATIVE : Détermine la configuration de l'interface selon l'état de l'IA.
    """
    # 1. Vérifier les urgences
    sql_urgency = text("SELECT MAX(urgency) FROM business_insights WHERE is_dismissed = false")
    max_urgency = db.execute(sql_urgency).scalar() or 0
    
    # 2. Déterminer la stratégie
    if max_urgency >= 4:
        strategy = {
            "mode": "CRITICAL_ALERT",
            "theme": "dark-red-neon",
            "priority_widget": "fraud_security_center",
            "ai_copilot_state": "active_alert",
            "message": "⚠️ Alerte de sécurité critique."
        }
    elif max_urgency >= 2:
        strategy = {
            "mode": "GROWTH_FOCUS",
            "theme": "vibrant-growth-green",
            "priority_widget": "sales_predictive_analysis",
            "ai_copilot_state": "proactive_advice",
            "message": "🚀 Croissance détectée."
        }
    else:
        strategy = {
            "mode": "STANDARD",
            "theme": "premium-glassmorphism",
            "priority_widget": "global_performance",
            "ai_copilot_state": "idle",
            "message": "Tout est stable."
        }
    return strategy
