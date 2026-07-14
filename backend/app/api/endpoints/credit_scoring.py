# app/api/endpoints/credit_scoring.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import random
import traceback
import os
import shutil
from app.database import get_db
from app.core.dependencies import get_current_user, get_optional_user
from app.models.auth import User
from app.models.credit_scoring import (
    CreditRequest, CreditFraudAlert, CreditNotification, CreditClient,
    IncomeSource, Expense, Property, Investment, BankHistory,
    IncomeType, ExpenseType, PropertyType, InvestmentType, BankIncidentType
)
from app.services.credit_scoring_ai import credit_scoring_ai
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
logger.info("✅ ROUTER CREDIT SCORING CRÉÉ AVEC IA")

# ===== SCHEMAS PYDANTIC =====
class IncomeSourceCreate(BaseModel):
    type: str
    amount: float
    frequency: str = "mensuel"

class ExpenseCreate(BaseModel):
    type: str
    amount: float
    creditor: Optional[str] = None
    remaining_balance: Optional[float] = 0

class PropertyCreate(BaseModel):
    type: str
    value: float
    location: Optional[str] = None
    mortgage_balance: Optional[float] = 0

class InvestmentCreate(BaseModel):
    type: str
    amount: float
    institution: Optional[str] = None

class BankHistoryCreate(BaseModel):
    incident_type: Optional[str] = None
    incident_date: Optional[datetime] = None
    incident_amount: Optional[float] = 0
    incident_resolved: bool = False

class ClientCreate(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_income: Optional[float] = None
    client_employment_years: Optional[int] = None

class CreditRequestCreateFull(BaseModel):
    # Client
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_income: Optional[float] = None
    client_employment_years: Optional[int] = None
    
    # Demande
    amount: float
    term_months: int = 12
    purpose: Optional[str] = None
    
    # Épargne
    savings_amount: Optional[float] = 0
    
    # Données détaillées
    income_sources: List[IncomeSourceCreate] = []
    expenses: List[ExpenseCreate] = []
    properties: List[PropertyCreate] = []
    investments: List[InvestmentCreate] = []
    bank_incidents: List[BankHistoryCreate] = []

class CreditRequestResponse(BaseModel):
    id: int
    request_id: str
    client_name: str
    client_email: Optional[str]
    amount: float
    credit_score: int
    risk_level: str
    fraud_risk: str
    fraud_score: float
    status: str
    request_date: datetime
    monthly_income: float
    monthly_expenses: float
    debt_to_income_ratio: float

class CreditRequestDetailResponse(BaseModel):
    id: int
    request_id: str
    client_name: str
    client_email: Optional[str]
    amount: float
    term_months: int
    purpose: Optional[str]
    credit_score: int
    risk_level: str
    fraud_risk: str
    fraud_score: float
    fraud_indicators: List[str]
    risk_factors: List[str]
    status: str
    request_date: datetime
    monthly_income: float
    monthly_expenses: float
    debt_to_income_ratio: float
    savings_amount: float
    income_sources: List[dict]
    expenses: List[dict]
    properties: List[dict]
    investments: List[dict]
    bank_incidents: List[dict]

class CreditClientResponse(BaseModel):
    id: int
    client_id: str
    client_name: str
    client_email: Optional[str]
    client_phone: Optional[str]
    client_income: Optional[float]
    client_employment_years: Optional[int]
    request_count: int
    created_at: datetime

class FraudAnalysisResponse(BaseModel):
    fraud_score: float
    fraud_level: str
    detection_method: str
    fraud_type: str
    indicators: List[str]
    techniques_used: List[str]
    recommendation: str
    confidence: float

class ApproveRejectRequest(BaseModel):
    notes: Optional[str] = None

# ===== FONCTIONS UTILITAIRES =====
def calculate_monthly_income(income_sources):
    """Calcule le revenu mensuel total - Version compatible avec Pydantic"""
    total = 0
    for source in income_sources:
        if hasattr(source, 'amount'):
            amount = source.amount or 0
            frequency = getattr(source, 'frequency', 'mensuel')
        elif isinstance(source, dict):
            amount = source.get('amount', 0) or 0
            frequency = source.get('frequency', 'mensuel')
        else:
            continue
        
        if frequency == 'mensuel':
            total += amount
        elif frequency == 'annuel':
            total += amount / 12
    return total

def calculate_monthly_expenses(expenses):
    """Calcule les charges mensuelles totales"""
    total = 0
    for expense in expenses:
        if hasattr(expense, 'amount'):
            total += expense.amount or 0
        elif isinstance(expense, dict):
            total += expense.get('amount', 0) or 0
    return total

def calculate_debt_to_income_ratio(monthly_income, monthly_expenses):
    """Calcule le ratio d'endettement"""
    if monthly_income > 0:
        return monthly_expenses / monthly_income
    return 1.0

# ===== ENDPOINTS REQUESTS =====
@router.get("/requests", response_model=List[CreditRequestResponse])
async def get_credit_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    fraud_risk: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les demandes de crédit"""
    try:
        query = db.query(CreditRequest)
        
        if status and status != 'all':
            query = query.filter(CreditRequest.status == status)
        if risk_level and risk_level != 'all':
            query = query.filter(CreditRequest.risk_level == risk_level)
        if fraud_risk and fraud_risk != 'all':
            query = query.filter(CreditRequest.fraud_risk == fraud_risk)
        if search:
            query = query.filter(CreditRequest.client_name.ilike(f"%{search}%"))
        if date_from:
            query = query.filter(CreditRequest.request_date >= date_from)
        if date_to:
            query = query.filter(CreditRequest.request_date <= date_to)
        
        requests = query.order_by(desc(CreditRequest.request_date)).offset(skip).limit(limit).all()
        
        return [
            CreditRequestResponse(
                id=r.id,
                request_id=r.request_id,
                client_name=r.client_name,
                client_email=r.client_email,
                amount=r.amount,
                credit_score=r.credit_score,
                risk_level=r.risk_level,
                fraud_risk=r.fraud_risk,
                fraud_score=r.fraud_score,
                status=r.status,
                request_date=r.request_date,
                monthly_income=r.monthly_income,
                monthly_expenses=r.monthly_expenses,
                debt_to_income_ratio=r.debt_to_income_ratio
            )
            for r in requests
        ]
        
    except Exception as e:
        logger.error(f"❌ Erreur get_credit_requests: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/requests/{request_id}", response_model=CreditRequestDetailResponse)
async def get_credit_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer une demande spécifique avec tous ses détails"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        return CreditRequestDetailResponse(
            id=request.id,
            request_id=request.request_id,
            client_name=request.client_name,
            client_email=request.client_email,
            amount=request.amount,
            term_months=request.term_months,
            purpose=request.purpose,
            credit_score=request.credit_score,
            risk_level=request.risk_level,
            fraud_risk=request.fraud_risk,
            fraud_score=request.fraud_score,
            fraud_indicators=request.fraud_indicators or [],
            risk_factors=request.risk_factors or [],
            status=request.status,
            request_date=request.request_date,
            monthly_income=request.monthly_income,
            monthly_expenses=request.monthly_expenses,
            debt_to_income_ratio=request.debt_to_income_ratio,
            savings_amount=request.savings_amount,
            income_sources=[{"type": s.type.value, "amount": s.amount, "frequency": s.frequency} for s in request.income_sources],
            expenses=[{"type": e.type.value, "amount": e.amount, "creditor": e.creditor} for e in request.expenses],
            properties=[{"type": p.type.value, "value": p.value, "location": p.location} for p in request.properties],
            investments=[{"type": i.type.value, "amount": i.amount, "institution": i.institution} for i in request.investments],
            bank_incidents=[{"type": b.incident_type.value if b.incident_type else None, "amount": b.incident_amount, "date": b.incident_date} for b in request.bank_histories]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests", status_code=status.HTTP_201_CREATED)
async def create_credit_request(
    request_data: CreditRequestCreateFull,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer une nouvelle demande de crédit avec l'IA"""
    try:
        monthly_income = calculate_monthly_income(request_data.income_sources)
        monthly_expenses = calculate_monthly_expenses(request_data.expenses)
        debt_ratio = calculate_debt_to_income_ratio(monthly_income, monthly_expenses) if monthly_income > 0 else 1.0
        
        # Vérifier les demandes multiples
        is_multiple_request = False
        existing_requests = db.query(CreditRequest).filter(
            CreditRequest.client_name == request_data.client_name,
            CreditRequest.request_date >= datetime.now() - timedelta(days=30)
        ).count()
        if existing_requests >= 2:
            is_multiple_request = True
        
        # Préparer les données pour l'IA
        income_sources_dict = []
        for s in request_data.income_sources:
            if hasattr(s, 'dict'):
                income_sources_dict.append(s.dict())
            else:
                income_sources_dict.append({"type": s.type, "amount": s.amount, "frequency": getattr(s, 'frequency', 'mensuel')})
        
        expenses_dict = []
        for e in request_data.expenses:
            if hasattr(e, 'dict'):
                expenses_dict.append(e.dict())
            else:
                expenses_dict.append({"type": e.type, "amount": e.amount, "creditor": getattr(e, 'creditor', None)})
        
        properties_dict = []
        for p in request_data.properties:
            if hasattr(p, 'dict'):
                properties_dict.append(p.dict())
            else:
                properties_dict.append({"type": p.type, "value": p.value, "location": getattr(p, 'location', None)})
        
        investments_dict = []
        for i in request_data.investments:
            if hasattr(i, 'dict'):
                investments_dict.append(i.dict())
            else:
                investments_dict.append({"type": i.type, "amount": i.amount, "institution": getattr(i, 'institution', None)})
        
        bank_incidents_dict = []
        for b in request_data.bank_incidents:
            if hasattr(b, 'dict'):
                bank_incidents_dict.append(b.dict())
            else:
                bank_incidents_dict.append({
                    "incident_type": getattr(b, 'incident_type', None),
                    "incident_date": getattr(b, 'incident_date', None),
                    "incident_amount": getattr(b, 'incident_amount', 0),
                    "incident_resolved": getattr(b, 'incident_resolved', False)
                })
        
        ai_data = {
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "debt_ratio": debt_ratio,
            "savings_amount": request_data.savings_amount or 0,
            "amount": request_data.amount,
            "term_months": request_data.term_months,
            "client_employment_years": request_data.client_employment_years or 0,
            "income_sources": income_sources_dict,
            "expenses": expenses_dict,
            "properties": properties_dict,
            "investments": investments_dict,
            "bank_incidents": bank_incidents_dict,
            "is_multiple_request": is_multiple_request,
            "client_age": 35,
            "payment_history_score": 75,
            "existing_loans": []
        }
        
        # Utiliser l'IA pour le scoring
        credit_result = credit_scoring_ai.calculate_credit_score_ai(ai_data)
        fraud_result = credit_scoring_ai.detect_fraud_ai(ai_data)
        
        # Créer le client s'il n'existe pas
        client = db.query(CreditClient).filter(
            (CreditClient.client_name == request_data.client_name) |
            (CreditClient.client_email == request_data.client_email)
        ).first()
        
        if not client and request_data.client_name:
            client_id = f"CL-{uuid.uuid4().hex[:8].upper()}"
            client = CreditClient(
                client_id=client_id,
                client_name=request_data.client_name,
                client_email=request_data.client_email,
                client_phone=request_data.client_phone,
                client_address=request_data.client_address,
                client_income=request_data.client_income,
                client_employment_years=request_data.client_employment_years
            )
            db.add(client)
            db.commit()
            db.refresh(client)
        
        # Créer la demande avec les résultats IA
        request_id = f"CR-{uuid.uuid4().hex[:8].upper()}"
        
        credit_request = CreditRequest(
            request_id=request_id,
            client_name=request_data.client_name,
            client_email=request_data.client_email,
            client_phone=request_data.client_phone,
            client_address=request_data.client_address,
            client_income=request_data.client_income,
            client_employment_years=request_data.client_employment_years,
            savings_amount=request_data.savings_amount or 0,
            amount=request_data.amount,
            term_months=request_data.term_months,
            purpose=request_data.purpose,
            credit_score=credit_result["credit_score"],
            approval_probability=credit_result["approval_probability"],
            risk_level=credit_result["risk_level"],
            risk_factors=credit_result["risk_factors"],
            fraud_risk=fraud_result["fraud_level"],
            fraud_score=fraud_result["fraud_score"],
            fraud_type=fraud_result["fraud_type"],
            fraud_indicators=fraud_result["fraud_indicators"],
            detection_method=fraud_result["detection_method"],
            monthly_income=monthly_income,
            monthly_expenses=monthly_expenses,
            debt_to_income_ratio=debt_ratio,
            status="pending",
            request_date=datetime.now()
        )
        
        db.add(credit_request)
        db.commit()
        db.refresh(credit_request)
        
        # Ajouter les sources de revenus
        for source in request_data.income_sources:
            income = IncomeSource(
                request_id=credit_request.id,
                type=source.type,
                amount=source.amount,
                frequency=source.frequency
            )
            db.add(income)
        
        # Ajouter les charges
        for expense in request_data.expenses:
            exp = Expense(
                request_id=credit_request.id,
                type=expense.type,
                amount=expense.amount,
                creditor=expense.creditor,
                remaining_balance=expense.remaining_balance
            )
            db.add(exp)
        
        # Ajouter les biens immobiliers
        for prop in request_data.properties:
            property_obj = Property(
                request_id=credit_request.id,
                type=prop.type,
                value=prop.value,
                location=prop.location,
                mortgage_balance=prop.mortgage_balance
            )
            db.add(property_obj)
        
        # Ajouter les investissements
        for inv in request_data.investments:
            investment = Investment(
                request_id=credit_request.id,
                type=inv.type,
                amount=inv.amount,
                institution=inv.institution
            )
            db.add(investment)
        
        # Ajouter l'historique bancaire
        for incident in request_data.bank_incidents:
            bank_history = BankHistory(
                request_id=credit_request.id,
                incident_type=incident.incident_type,
                incident_date=incident.incident_date,
                incident_amount=incident.incident_amount,
                incident_resolved=incident.incident_resolved
            )
            db.add(bank_history)
        
        db.commit()
        
        # Créer une alerte de fraude si nécessaire
        if fraud_result["fraud_level"] in ["high", "critical"]:
            alert = CreditFraudAlert(
                request_id=credit_request.id,
                client_name=credit_request.client_name,
                fraud_score=fraud_result["fraud_score"],
                fraud_level=fraud_result["fraud_level"],
                fraud_type=fraud_result["fraud_type"],
                detection_method=fraud_result["detection_method"],
                indicators=fraud_result["fraud_indicators"],
                techniques_used=fraud_result.get("techniques_used", []),
                recommendation=fraud_result["recommendation"]
            )
            db.add(alert)
            db.commit()
        
        return {
            "id": credit_request.id,
            "request_id": credit_request.request_id,
            "client_name": credit_request.client_name,
            "amount": credit_request.amount,
            "credit_score": credit_request.credit_score,
            "approval_probability": credit_request.approval_probability,
            "risk_level": credit_request.risk_level,
            "fraud_risk": credit_request.fraud_risk,
            "fraud_score": credit_request.fraud_score,
            "fraud_indicators": credit_request.fraud_indicators,
            "risk_factors": credit_request.risk_factors,
            "status": credit_request.status,
            "message": "Demande analysée par l'IA avec succès",
            "fraud_alert": fraud_result["fraud_level"] in ["high", "critical"],
            "ai_confidence": fraud_result.get("confidence_score", 85)
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/approve")
async def approve_credit_request(
    request_id: int,
    request_data: ApproveRejectRequest = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approuver une demande de crédit"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        notes = request_data.notes if request_data else None
        
        request.status = "approved"
        request.approved_at = datetime.now()
        request.approved_by_id = current_user.id
        if notes:
            request.notes = notes
        
        db.commit()
        
        return {
            "message": "Demande approuvée avec succès",
            "request_id": request.request_id,
            "status": request.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur approve_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/reject")
async def reject_credit_request(
    request_id: int,
    request_data: ApproveRejectRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rejeter une demande de crédit"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        notes = request_data.notes if request_data else None
        if not notes:
            raise HTTPException(status_code=400, detail="La raison du rejet est obligatoire")
        
        request.status = "rejected"
        request.rejected_at = datetime.now()
        request.processed_by_id = current_user.id
        request.rejection_reason = notes
        
        db.commit()
        
        return {
            "message": "Demande rejetée",
            "request_id": request.request_id,
            "status": request.status,
            "reason": notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur reject_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/requests/{request_id}/fraud-analysis", response_model=FraudAnalysisResponse)
async def analyze_fraud(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Analyse de fraude approfondie avec l'IA"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        ai_data = {
            "monthly_income": request.monthly_income,
            "monthly_expenses": request.monthly_expenses,
            "savings_amount": request.savings_amount,
            "amount": request.amount,
            "term_months": request.term_months,
            "client_employment_years": request.client_employment_years or 0,
            "income_sources": [{"amount": s.amount, "type": s.type.value} for s in request.income_sources],
            "expenses": [{"amount": e.amount, "type": e.type.value} for e in request.expenses],
            "properties": [{"value": p.value, "type": p.type.value} for p in request.properties],
            "investments": [{"amount": i.amount, "type": i.type.value} for i in request.investments],
            "bank_incidents": [{"incident_resolved": b.incident_resolved} for b in request.bank_histories]
        }
        
        fraud_result = credit_scoring_ai.detect_fraud_ai(ai_data)
        
        return FraudAnalysisResponse(
            fraud_score=fraud_result["fraud_score"],
            fraud_level=fraud_result["fraud_level"],
            detection_method=fraud_result["detection_method"],
            fraud_type=fraud_result["fraud_type"],
            indicators=fraud_result["fraud_indicators"],
            techniques_used=fraud_result.get("techniques_used", []),
            recommendation=fraud_result["recommendation"],
            confidence=fraud_result.get("confidence_score", 85.0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur fraud_analysis: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ===== ENDPOINTS CLIENTS CORRIGÉS =====
@router.get("/clients", response_model=List[CreditClientResponse])
async def get_credit_clients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les clients"""
    try:
        query = db.query(CreditClient)
        if search:
            query = query.filter(
                (CreditClient.client_name.ilike(f"%{search}%")) |
                (CreditClient.client_email.ilike(f"%{search}%"))
            )
        
        clients = query.order_by(desc(CreditClient.created_at)).offset(skip).limit(limit).all()
        
        result = []
        for client in clients:
            request_count = db.query(CreditRequest).filter(CreditRequest.client_name == client.client_name).count()
            result.append(CreditClientResponse(
                id=client.id,
                client_id=client.client_id,
                client_name=client.client_name,
                client_email=client.client_email,
                client_phone=client.client_phone,
                client_income=client.client_income,
                client_employment_years=client.client_employment_years,
                request_count=request_count,
                created_at=client.created_at
            ))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erreur get_credit_clients: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clients", status_code=status.HTTP_201_CREATED)
async def create_credit_client(
    client: ClientCreate,  # ✅ Utiliser le schema Pydantic au lieu de dict
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Créer un nouveau client"""
    try:
        client_id = f"CL-{uuid.uuid4().hex[:8].upper()}"
        
        # Vérifier si le client existe déjà
        existing = db.query(CreditClient).filter(
            (CreditClient.client_name == client.client_name) |
            (CreditClient.client_email == client.client_email)
        ).first()
        
        if existing:
            return {
                "id": existing.id,
                "client_id": existing.client_id,
                "client_name": existing.client_name,
                "client_email": existing.client_email,
                "message": "Client déjà existant"
            }
        
        new_client = CreditClient(
            client_id=client_id,
            client_name=client.client_name,
            client_email=client.client_email,
            client_phone=client.client_phone,
            client_address=client.client_address,
            client_income=client.client_income,
            client_employment_years=client.client_employment_years
        )
        
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
        
        logger.info(f"✅ Client créé: {client.client_name} (ID: {new_client.id})")
        
        return {
            "id": new_client.id,
            "client_id": new_client.client_id,
            "client_name": new_client.client_name,
            "client_email": new_client.client_email,
            "client_phone": new_client.client_phone,
            "client_income": new_client.client_income,
            "client_employment_years": new_client.client_employment_years,
            "message": "Client créé avec succès"
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_credit_client: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clients/{client_id}")
async def get_credit_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer un client spécifique"""
    try:
        client = db.query(CreditClient).filter(CreditClient.id == client_id).first()
        
        if not client:
            raise HTTPException(status_code=404, detail="Client non trouvé")
        
        request_count = db.query(CreditRequest).filter(CreditRequest.client_name == client.client_name).count()
        
        return {
            "id": client.id,
            "client_id": client.client_id,
            "client_name": client.client_name,
            "client_email": client.client_email,
            "client_phone": client.client_phone,
            "client_address": client.client_address,
            "client_income": client.client_income,
            "client_employment_years": client.client_employment_years,
            "request_count": request_count,
            "created_at": client.created_at
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erreur get_credit_client: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ===== ENDPOINTS DASHBOARD =====
@router.get("/dashboard")
async def get_credit_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Dashboard de scoring crédit avec IA"""
    try:
        total = db.query(CreditRequest).count()
        approved = db.query(CreditRequest).filter(CreditRequest.status == "approved").count()
        rejected = db.query(CreditRequest).filter(CreditRequest.status == "rejected").count()
        pending = db.query(CreditRequest).filter(CreditRequest.status == "pending").count()
        
        by_score_range = {'<300': 0, '300-500': 0, '500-650': 0, '650-750': 0, '750-850': 0, '>850': 0}
        
        for req in db.query(CreditRequest).all():
            score = req.credit_score
            if score < 300:
                by_score_range['<300'] += 1
            elif score < 500:
                by_score_range['300-500'] += 1
            elif score < 650:
                by_score_range['500-650'] += 1
            elif score < 750:
                by_score_range['650-750'] += 1
            elif score < 850:
                by_score_range['750-850'] += 1
            else:
                by_score_range['>850'] += 1
        
        high_risk = db.query(CreditRequest).filter(CreditRequest.risk_level.in_(["high", "critical"])).count()
        medium_risk = db.query(CreditRequest).filter(CreditRequest.risk_level == "medium").count()
        low_risk = db.query(CreditRequest).filter(CreditRequest.risk_level == "low").count()
        fraud_count = db.query(CreditRequest).filter(CreditRequest.fraud_risk.in_(["high", "critical"])).count()
        
        avg_score = db.query(CreditRequest.credit_score).filter(CreditRequest.credit_score > 0).all()
        avg_score = sum([s[0] for s in avg_score]) / len(avg_score) if avg_score else 650
        
        total_clients = db.query(CreditClient).count()
        
        total_amount_approved = db.query(CreditRequest.amount).filter(CreditRequest.status == "approved").all()
        total_amount = sum([a[0] for a in total_amount_approved]) if total_amount_approved else 0
        
        fraud_distribution = {
            "credit_fraud": db.query(CreditRequest).filter(CreditRequest.fraud_type == "credit_fraud").count(),
            "intentional_default": db.query(CreditRequest).filter(CreditRequest.fraud_type == "intentional_default").count(),
            "multiple_requests": db.query(CreditRequest).filter(CreditRequest.fraud_type == "multiple_requests").count(),
            "forged_documents": db.query(CreditRequest).filter(CreditRequest.fraud_type == "forged_documents").count(),
            "income_inconsistency": db.query(CreditRequest).filter(CreditRequest.fraud_type == "income_inconsistency").count(),
            "identity_theft": db.query(CreditRequest).filter(CreditRequest.fraud_type == "identity_theft").count()
        }
        
        return {
            "total_requests": total,
            "approved": approved,
            "rejected": rejected,
            "pending": pending,
            "avg_score": round(avg_score, 2),
            "high_risk": high_risk,
            "medium_risk": medium_risk,
            "low_risk": low_risk,
            "fraud_detected": fraud_count,
            "fraud_prevention_rate": 95,
            "total_clients": total_clients,
            "total_amount_approved": total_amount,
            "by_score_range": by_score_range,
            "fraud_distribution": fraud_distribution
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur dashboard: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fraud-alerts", response_model=List[dict])
async def get_fraud_alerts(
    resolved: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupérer les alertes de fraude"""
    try:
        query = db.query(CreditFraudAlert)
        if resolved is not None:
            query = query.filter(CreditFraudAlert.resolved == resolved)
        
        alerts = query.order_by(desc(CreditFraudAlert.created_at)).limit(50).all()
        
        return [
            {
                "id": a.id,
                "alert_id": a.alert_id,
                "request_id": a.request_id,
                "client_name": a.client_name,
                "fraud_score": a.fraud_score,
                "fraud_level": a.fraud_level,
                "indicators": a.indicators,
                "detection_method": a.detection_method,
                "recommendation": a.recommendation,
                "resolved": a.resolved,
                "created_at": a.created_at
            }
            for a in alerts
        ]
        
    except Exception as e:
        logger.error(f"❌ Erreur fraud_alerts: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

logger.info("✅ MODULE CREDIT SCORING AVEC IA CHARGÉ AVEC SUCCÈS")

# app/api/endpoints/credit_scoring.py

@router.put("/requests/{request_id}/approve")
async def approve_credit_request(
    request_id: int,
    request_data: ApproveRejectRequest = Body(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approuver une demande de crédit"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        notes = request_data.notes if request_data else None
        
        request.status = "approved"
        request.approved_at = datetime.now()
        request.approved_by_id = current_user.id
        if notes:
            request.notes = notes
        
        db.commit()
        
        return {
            "success": True,
            "message": "Demande approuvée avec succès",
            "request_id": request.request_id,
            "status": request.status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur approve_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/requests/{request_id}/reject")
async def reject_credit_request(
    request_id: int,
    request_data: ApproveRejectRequest = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rejeter une demande de crédit"""
    try:
        request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
        
        if not request:
            raise HTTPException(status_code=404, detail="Demande non trouvée")
        
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Cette demande a déjà été traitée")
        
        notes = request_data.notes if request_data else None
        if not notes:
            raise HTTPException(status_code=400, detail="La raison du rejet est obligatoire")
        
        request.status = "rejected"
        request.rejected_at = datetime.now()
        request.processed_by_id = current_user.id
        request.rejection_reason = notes
        
        db.commit()
        
        return {
            "success": True,
            "message": "Demande rejetée",
            "request_id": request.request_id,
            "status": request.status,
            "reason": notes
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur reject_credit_request: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

# app/api/endpoints/credit_scoring.py - Ajouter cet endpoint

@router.get("/ai-status")
async def get_ai_status(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Vérifier le statut des modèles IA"""
    try:
        from app.services.credit_scoring_ai import credit_scoring_ai
        
        models_loaded = credit_scoring_ai.models_loaded
        
        return {
            "loaded": models_loaded,
            "models": [
                {"name": "RandomForestRegressor", "status": "loaded" if models_loaded else "not_loaded"},
                {"name": "GradientBoostingClassifier", "status": "loaded" if models_loaded else "not_loaded"}
            ],
            "lastUpdate": datetime.now().isoformat(),
            "version": "1.0"
        }
    except Exception as e:
        logger.error(f"❌ Erreur ai-status: {e}")
        return {
            "loaded": False,
            "models": [],
            "lastUpdate": None,
            "error": str(e)
        }