# app/api/endpoints/support.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import random
import logging

from app.core.database import get_db
from app.models.support import SupportTicket, TicketSolution, SolutionFeedback, TicketMessage, KnowledgeBase, TicketStatus
from app.schemas.support import (
    TicketCreate, TicketResponse, SolveRequest, SolveResponse,
    FeedbackRequest, KnowledgeBaseCreate, KnowledgeBaseResponse,
    TicketStatsResponse
)
from app.services.support_ai_service import SupportAIService
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])

# Stockage temporaire
tickets_db = []
solutions_db = []
knowledge_base_db = []
ticket_counter = 1
solution_counter = 1

@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(status: str = None, db: Session = Depends(get_db)):
    """Récupérer tous les tickets"""
    return tickets_db

@router.get("/tickets/stats", response_model=TicketStatsResponse)
async def get_ticket_stats():
    """Récupérer les statistiques des tickets"""
    
    total = len(tickets_db)
    open_tickets = len([t for t in tickets_db if t.get('status') == 'open'])
    resolved_tickets = len([t for t in tickets_db if t.get('status') == 'resolved'])
    
    resolution_rate = (resolved_tickets / total * 100) if total > 0 else 0
    
    # Données mockées pour les tendances
    monthly_trend = [
        {"month": "Jan", "tickets": random.randint(40, 60)},
        {"month": "Fév", "tickets": random.randint(45, 65)},
        {"month": "Mar", "tickets": random.randint(50, 70)},
        {"month": "Avr", "tickets": random.randint(55, 75)},
        {"month": "Mai", "tickets": random.randint(50, 70)},
        {"month": "Juin", "tickets": random.randint(60, 80)}
    ]
    
    category_distribution = [
        {"type": "Technique", "value": random.randint(40, 50)},
        {"type": "Facturation", "value": random.randint(25, 35)},
        {"type": "Compte", "value": random.randint(20, 30)}
    ]
    
    return TicketStatsResponse(
        total_tickets=total,
        open_tickets=open_tickets,
        resolved_tickets=resolved_tickets,
        resolution_rate=round(resolution_rate, 1),
        avg_resolution_time=random.uniform(30, 60),
        resolved_by_ai=random.randint(1000, 1500),
        satisfaction_rate=random.uniform(85, 95),
        monthly_trend=monthly_trend,
        category_distribution=category_distribution
    )

# app/api/endpoints/support.py - Ajoutez le secteur dans create_ticket

@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Créer un nouveau ticket avec secteur"""
    global ticket_counter
    
    new_ticket = {
        "id": ticket_counter,
        "ticket_number": f"TKT-{datetime.now().year}-{str(ticket_counter).zfill(4)}",
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category.value if hasattr(ticket.category, 'value') else ticket.category,
        "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
        "status": "open",
        "sector": ticket.sector.value if hasattr(ticket.sector, 'value') else ticket.sector,
        "user_email": ticket.user_email,
        "user_name": ticket.user_name,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "resolved_at": None
    }
    
    tickets_db.append(new_ticket)
    ticket_counter += 1
    
    # Notification WebSocket
    try:
        await manager.send_notification(
            title="Nouveau Ticket Discord",
            message=f"Ticket de {ticket.user_name}: {ticket.subject[:50]}...",
            sector=new_ticket["sector"],
            type="info",
            data=new_ticket
        )
    except Exception as e:
        logger.error(f"Erreur notification support: {e}")
    
    return new_ticket

@router.post("/tickets/solve", response_model=SolveResponse)
async def solve_ticket(request: SolveRequest):
    """Résoudre un ticket avec IA selon le secteur"""
    
    # Trouver le ticket
    ticket = None
    for t in tickets_db:
        if t.get('id') == request.ticket_id:
            ticket = t
            break
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket non trouvé")
    
    # Récupérer le secteur du ticket
    sector = ticket.get('sector', 'entreprise')
    
    # Analyser avec l'IA selon le secteur
    analysis = SupportAIService.analyze_ticket(
        request.query, 
        ticket.get('category'), 
        sector
    )
    
    # Créer la solution
    global solution_counter
    solution = {
        "id": solution_counter,
        "ticket_id": request.ticket_id,
        "solution_text": analysis["solution"],
        "steps": analysis["steps"],
        "sources": analysis["sources"],
        "confidence": analysis["confidence"],
        "helpful_count": 0,
        "not_helpful_count": 0,
        "created_at": datetime.now()
    }
    
    solutions_db.append(solution)
    solution_counter += 1
    
    # Si auto-resolve, marquer le ticket comme résolu
    if request.auto_resolve:
        ticket['status'] = 'resolved'
        ticket['resolved_at'] = datetime.now()
        ticket['resolved_by_ai'] = True
        ticket['resolution_time_seconds'] = random.uniform(10, 30)
        ticket['confidence_score'] = analysis["confidence"]
    
    return SolveResponse(
        solution=analysis["solution"],
        steps=analysis["steps"],
        sources=analysis["sources"],
        confidence=analysis["confidence"],
        id=solution["id"]
    )
@router.post("/solutions/feedback")
async def give_feedback(feedback: FeedbackRequest):
    """Donner un feedback sur une solution"""
    
    for solution in solutions_db:
        if solution.get('id') == feedback.solution_id:
            if feedback.helpful:
                solution['helpful_count'] += 1
            else:
                solution['not_helpful_count'] += 1
            return {"success": True, "message": "Feedback enregistré"}
    
    raise HTTPException(status_code=404, detail="Solution non trouvée")

@router.get("/knowledge-base", response_model=List[KnowledgeBaseResponse])
async def get_knowledge_base():
    """Récupérer la base de connaissances"""
    
    if not knowledge_base_db:
        # Données de démonstration
        knowledge_base_db.extend([
            {
                "id": 1,
                "title": "Comment réinitialiser mon mot de passe ?",
                "content": "Pour réinitialiser votre mot de passe, cliquez sur 'Mot de passe oublié' sur la page de connexion...",
                "excerpt": "Procédure de réinitialisation du mot de passe",
                "category": "Compte",
                "tags": ["password", "login", "security"],
                "created_at": datetime.now()
            },
            {
                "id": 2,
                "title": "Problème de connexion à l'application",
                "content": "Si vous rencontrez des problèmes de connexion, vérifiez d'abord votre connexion internet...",
                "excerpt": "Dépannage des problèmes de connexion",
                "category": "Technique",
                "tags": ["login", "connection", "error"],
                "created_at": datetime.now()
            },
            {
                "id": 3,
                "title": "Comment contacter le support ?",
                "content": "Vous pouvez contacter notre support par email à support@neura-erp.com ou par téléphone...",
                "excerpt": "Moyens de contacter le support",
                "category": "Général",
                "tags": ["support", "contact", "help"],
                "created_at": datetime.now()
            }
        ])
    
    return knowledge_base_db

@router.post("/knowledge-base", response_model=KnowledgeBaseResponse)
async def create_knowledge_base_item(item: KnowledgeBaseCreate):
    """Ajouter un article à la base de connaissances"""
    global knowledge_base_db
    
    new_id = max([k.get('id', 0) for k in knowledge_base_db]) + 1 if knowledge_base_db else 1
    
    new_item = {
        "id": new_id,
        "title": item.title,
        "content": item.content,
        "excerpt": item.content[:200] + "...",
        "category": item.category,
        "tags": item.tags,
        "created_at": datetime.now()
    }
    
    knowledge_base_db.append(new_item)
    return new_item
# Dans app/api/endpoints/support.py, ajoutez cet endpoint si ce n'est pas déjà fait :

@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(ticket: TicketCreate):
    """Créer un nouveau ticket"""
    global ticket_counter
    
    new_ticket = {
        "id": ticket_counter,
        "ticket_number": f"TKT-{datetime.now().year}-{str(ticket_counter).zfill(4)}",
        "subject": ticket.subject,
        "description": ticket.description,
        "category": ticket.category.value if hasattr(ticket.category, 'value') else ticket.category,
        "priority": ticket.priority.value if hasattr(ticket.priority, 'value') else ticket.priority,
        "status": "open",
        "user_email": ticket.user_email,
        "user_name": ticket.user_name,
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "resolved_at": None
    }
    
    tickets_db.append(new_ticket)
    ticket_counter += 1
    
    return new_ticket