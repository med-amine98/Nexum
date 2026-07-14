from fastapi import APIRouter, Depends, Query, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.crm import Lead, LeadStatus, PipelineStage

router = APIRouter()

@router.get("/leads")
async def get_leads(
    date_from: str = None,
    date_to: str = None,
    search: str = None,
    status: str = None,
    source: str = None,
    db: Session = Depends(get_db)
):
    """Récupère la liste des leads"""
    query = db.query(Lead)
    
    if status:
        # Convertir en majuscules pour correspondre à l'enum
        status_upper = status.upper()
        query = query.filter(Lead.status == status_upper)
    if source:
        query = query.filter(Lead.source == source)
    if search:
        query = query.filter(Lead.name.ilike(f"%{search}%"))
    if date_from:
        query = query.filter(Lead.created_at >= date_from)
    if date_to:
        query = query.filter(Lead.created_at <= date_to)
    
    leads = query.order_by(Lead.created_at.desc()).all()
    
    return [
        {
            "id": l.id,
            "name": l.name,
            "first_name": l.name.split()[0] if l.name else "",
            "last_name": " ".join(l.name.split()[1:]) if l.name and len(l.name.split()) > 1 else "",
            "company": l.company_name,
            "email": l.email,
            "phone": l.phone,
            "status": l.status.value if l.status else "NEW",
            "source": l.source,
            "priority": l.priority,
            "description": l.description,
            "expected_revenue": l.expected_revenue,
            "probability": l.probability,
            "created_at": l.created_at.isoformat() if l.created_at else None,
            "updated_at": l.updated_at.isoformat() if l.updated_at else None
        }
        for l in leads
    ]

@router.get("/pipeline/stats")
async def get_pipeline_stats(db: Session = Depends(get_db)):
    """Statistiques du pipeline"""
    stats = {}
    for status in LeadStatus:
        count = db.query(Lead).filter(Lead.status == status).count()
        stats[status.value] = count
    
    total = db.query(Lead).count()
    won = db.query(Lead).filter(Lead.status == LeadStatus.WON).count()
    
    return {
        "total": total,
        "new": stats.get("NEW", 0),
        "contacted": stats.get("CONTACTED", 0),
        "qualified": stats.get("QUALIFIED", 0),
        "proposal": stats.get("PROPOSAL", 0),
        "negotiation": stats.get("NEGOTIATION", 0),
        "won": won,
        "lost": stats.get("LOST", 0),
        "conversion_rate": round((won / total * 100) if total > 0 else 0, 1)
    }

@router.get("/activities")
async def get_activities(days: int = 30, db: Session = Depends(get_db)):
    """Activités récentes"""
    return []

@router.get("/dashboard/kpi")
async def get_dashboard_kpi(db: Session = Depends(get_db)):
    """KPIs du dashboard CRM"""
    total = db.query(Lead).count()
    new = db.query(Lead).filter(Lead.status == LeadStatus.NEW).count()
    won = db.query(Lead).filter(Lead.status == LeadStatus.WON).count()
    
    return [
        {"title": "Total leads", "value": total, "color": "#1890ff", "trend": 5},
        {"title": "Nouveaux leads", "value": new, "color": "#52c41a", "trend": 12},
        {"title": "Leads gagnés", "value": won, "color": "#722ed1", "trend": 8},
        {"title": "Taux conversion", "value": round((won / total * 100) if total > 0 else 0, 1), "color": "#faad14", "trend": 3}
    ]

@router.get("/pipeline/stages")
async def get_pipeline_stages(db: Session = Depends(get_db)):
    """Étapes du pipeline"""
    stages = [
        {"id": 1, "name": "NEW", "label": "Nouveau", "sequence": 1, "probability": 20},
        {"id": 2, "name": "CONTACTED", "label": "Contacté", "sequence": 2, "probability": 40},
        {"id": 3, "name": "QUALIFIED", "label": "Qualifié", "sequence": 3, "probability": 60},
        {"id": 4, "name": "PROPOSAL", "label": "Proposition", "sequence": 4, "probability": 80},
        {"id": 5, "name": "NEGOTIATION", "label": "Négociation", "sequence": 5, "probability": 90},
        {"id": 6, "name": "WON", "label": "Gagné", "sequence": 6, "probability": 100},
        {"id": 7, "name": "LOST", "label": "Perdu", "sequence": 7, "probability": 0}
    ]
    
    for stage in stages:
        count = db.query(Lead).filter(Lead.status == stage["name"]).count()
        stage["leads_count"] = count
        stage["leads_value"] = db.query(func.coalesce(func.sum(Lead.expected_revenue), 0)).filter(
            Lead.status == stage["name"]
        ).scalar() or 0
    
    return stages

@router.post("/leads")
async def create_lead(lead_data: dict, db: Session = Depends(get_db)):
    """Crée un nouveau lead"""
    lead = Lead(
        name=f"{lead_data.get('first_name', '')} {lead_data.get('last_name', '')}".strip(),
        company_name=lead_data.get("company"),
        email=lead_data.get("email"),
        phone=lead_data.get("phone"),
        source=lead_data.get("source", "autre"),
        priority=lead_data.get("priority", "medium"),
        description=lead_data.get("notes"),
        expected_revenue=lead_data.get("estimated_value", 0),
        status=LeadStatus.NEW
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return {"id": lead.id, "message": "Lead created"}

@router.put("/leads/{lead_id}")
async def update_lead(lead_id: int, lead_data: dict, db: Session = Depends(get_db)):
    """Met à jour un lead"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if "status" in lead_data:
        # Convertir en majuscules pour correspondre à l'enum
        new_status = lead_data["status"].upper()
        # Vérifier que le statut est valide
        valid_statuses = [s.value for s in LeadStatus]
        if new_status in valid_statuses:
            lead.status = new_status
        else:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    if "priority" in lead_data:
        lead.priority = lead_data["priority"]
    if "notes" in lead_data:
        lead.description = lead_data["notes"]
    
    lead.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Lead updated", "status": lead.status.value}

@router.post("/leads/{lead_id}/convert")
async def convert_lead(lead_id: int, db: Session = Depends(get_db)):
    """Convertit un lead en client"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    lead.status = LeadStatus.WON
    lead.converted_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Lead converted to customer"}

@router.get("/leads/{lead_id}")
async def get_lead(
    lead_id: int,
    db: Session = Depends(get_db)
):
    """Récupère un lead spécifique"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {
        "id": lead.id,
        "name": lead.name,
        "first_name": lead.name.split()[0] if lead.name else "",
        "last_name": " ".join(lead.name.split()[1:]) if lead.name and len(lead.name.split()) > 1 else "",
        "company": lead.company_name,
        "email": lead.email,
        "phone": lead.phone,
        "status": lead.status.value if lead.status else "NEW",
        "source": lead.source,
        "priority": lead.priority,
        "description": lead.description,
        "expected_revenue": lead.expected_revenue,
        "probability": lead.probability,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
        "updated_at": lead.updated_at.isoformat() if lead.updated_at else None
    }
