# app/api/accounting.py
import logging
logger = logging.getLogger(__name__)
logger.info("🔧 CHARGEMENT DU MODULE ACCOUNTING...")
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User
from app.models.account import Invoice, InvoiceLine, InvoiceStatus, Account, AccountType

logger.info("✅ IMPORTS RÉUSSIS")

# Créer le routeur SANS préfixe (le préfixe sera ajouté dans __init__.py)
router = APIRouter(tags=["Accounting"])
logger.info("🔧 ROUTER ACCOUNTING CRÉÉ")

# ===== SCHEMAS =====
class InvoiceCreate(BaseModel):
    partner_id: int
    date_invoice: Optional[datetime] = None
    date_due: Optional[datetime] = None
    lines: List[dict] = []
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    date_due: Optional[datetime] = None
    notes: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: int
    number: str
    partner_id: int
    partner_name: Optional[str] = None
    date_invoice: datetime
    date_due: Optional[datetime] = None
    amount_total: float
    amount_untaxed: float
    amount_tax: float
    status: str
    type: str = "invoice"
    created_at: datetime
    
    class Config:
        from_attributes = True

class InvoiceStatsResponse(BaseModel):
    monthly_revenue: float
    unpaid_invoices: int
    total_invoices: int
    average_invoice: float
    overdue_invoices: int
    paid_invoices: int

class TaxResponse(BaseModel):
    id: int
    name: str
    rate: float
    type: str
    active: bool

class AccountResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    active: bool
    parent_id: Optional[int] = None

class CashFlowResponse(BaseModel):
    summary: dict
    daily_data: List[dict]
    forecast: List[dict]

# ===== ENDPOINTS FACTURES =====
@router.get("/invoices", response_model=List[InvoiceResponse])
async def get_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filtrer par statut"),
    date_from: Optional[str] = Query(None, description="Date de début (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Date de fin (YYYY-MM-DD)"),
    partner_id: Optional[int] = Query(None, description="Filtrer par partenaire"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère la liste des factures avec filtres"""
    try:
        logger.info(f"🔍 Récupération des factures - date_from: {date_from}, date_to: {date_to}")
        
        query = db.query(Invoice)
        
        # Filtre par statut
        if status and status != "all":
            try:
                query = query.filter(Invoice.status == status.upper())
            except Exception as e:
                logger.error(f"Erreur filtre statut: {e}")
        
        # Filtre par date
        if date_from:
            try:
                date_from_dt = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.filter(Invoice.date_invoice >= date_from_dt)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_dt = datetime.strptime(date_to, "%Y-%m-%d")
                date_to_dt = date_to_dt.replace(hour=23, minute=59, second=59)
                query = query.filter(Invoice.date_invoice <= date_to_dt)
            except ValueError:
                pass
        
        # Filtre par partenaire
        if partner_id:
            query = query.filter(Invoice.partner_id == partner_id)
        
        invoices = query.order_by(desc(Invoice.date_invoice)).offset(skip).limit(limit).all()
        
        # Transformer les résultats
        result = []
        for inv in invoices:
            partner_name = None
            if hasattr(inv, 'partner') and inv.partner:
                partner_name = inv.partner.name
            
            result.append({
                "id": inv.id,
                "number": inv.number,
                "partner_id": inv.partner_id,
                "partner_name": partner_name,
                "date_invoice": inv.date_invoice,
                "date_due": inv.date_due,
                "amount_total": float(inv.amount_total or 0),
                "amount_untaxed": float(inv.amount_untaxed or 0),
                "amount_tax": float(inv.amount_tax or 0),
                "status": inv.status.value.lower() if inv.status else "draft",
                "type": "invoice",
                "created_at": inv.created_at
            })
        
        return result
    except Exception as e:
        logger.error(f"❌ Erreur get_invoices: {e}")
        return []

@router.post("/invoices", response_model=InvoiceResponse)
async def create_invoice(
    invoice_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle facture"""
    try:
        logger.info(f"📦 Création facture reçue: {invoice_data}")
        
        # Extraire les données
        partner_id = invoice_data.get('partner_id', 1)
        date_invoice = invoice_data.get('date_invoice')
        date_due = invoice_data.get('date_due')
        lines_data = invoice_data.get('lines', [])
        notes = invoice_data.get('notes')
        
        # Récupérer ou créer le partenaire
        from app.models.partner import Partner
        partner = db.query(Partner).filter(Partner.id == partner_id).first()
        
        if not partner:
            # Créer un partenaire par défaut
            partner = Partner(
                name="Client Test",
                email=None,
                phone=None,
                is_customer=True,
                is_supplier=False
            )
            db.add(partner)
            db.flush()
            logger.info(f"✅ Partenaire créé: {partner.name} (ID: {partner.id})")
        
        # Générer un numéro de facture
        last_invoice = db.query(Invoice).order_by(desc(Invoice.id)).first()
        next_number = 1 if not last_invoice else last_invoice.id + 1
        invoice_number = f"INV-{datetime.now().strftime('%Y%m')}-{next_number:04d}"
        
        # Calculer les totaux
        amount_untaxed = sum(line.get('price_subtotal', 0) for line in lines_data)
        amount_tax = sum(line.get('price_tax', 0) for line in lines_data)
        amount_total = amount_untaxed + amount_tax
        
        # Convertir les dates
        if isinstance(date_invoice, str):
            date_invoice = datetime.fromisoformat(date_invoice.replace('Z', '+00:00'))
        else:
            date_invoice = date_invoice or datetime.now()
            
        if isinstance(date_due, str):
            date_due = datetime.fromisoformat(date_due.replace('Z', '+00:00'))
        
        # Créer la facture
        db_invoice = Invoice(
            number=invoice_number,
            partner_id=partner.id,
            date_invoice=date_invoice,
            date_due=date_due,
            amount_total=amount_total,
            amount_untaxed=amount_untaxed,
            amount_tax=amount_tax,
            status=InvoiceStatus.DRAFT,
            payment_status="not_paid",
            notes=notes
        )
        db.add(db_invoice)
        db.flush()
        
        # Ajouter les lignes
        for line in lines_data:
            db_line = InvoiceLine(
                invoice_id=db_invoice.id,
                product_id=line.get('product_id'),
                name=line.get('product_name', line.get('description', '')),
                quantity=line.get('quantity', 1),
                price_unit=line.get('price_unit', 0),
                price_subtotal=line.get('price_subtotal', 0),
                price_tax=line.get('price_tax', 0),
                price_total=line.get('price_total', 0)
            )
            db.add(db_line)
        
        db.commit()
        db.refresh(db_invoice)
        
        logger.info(f"✅ Facture créée: {invoice_number} (ID: {db_invoice.id})")
        
        return {
            "id": db_invoice.id,
            "number": db_invoice.number,
            "partner_id": db_invoice.partner_id,
            "partner_name": partner.name,
            "date_invoice": db_invoice.date_invoice,
            "date_due": db_invoice.date_due,
            "amount_total": float(db_invoice.amount_total),
            "amount_untaxed": float(db_invoice.amount_untaxed),
            "amount_tax": float(db_invoice.amount_tax),
            "status": db_invoice.status.value,
            "type": "invoice",
            "created_at": db_invoice.created_at
        }
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_invoice: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère une facture spécifique"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    partner_name = None
    if hasattr(invoice, 'partner') and invoice.partner:
        partner_name = invoice.partner.name
    
    return {
        "id": invoice.id,
        "number": invoice.number,
        "partner_id": invoice.partner_id,
        "partner_name": partner_name,
        "date_invoice": invoice.date_invoice,
        "date_due": invoice.date_due,
        "amount_total": float(invoice.amount_total),
        "amount_untaxed": float(invoice.amount_untaxed),
        "amount_tax": float(invoice.amount_tax),
        "status": invoice.status.value,
        "type": "invoice",
        "created_at": invoice.created_at
    }

@router.post("/invoices/{invoice_id}/validate")
async def validate_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Valide une facture"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Seules les factures en brouillon peuvent être validées")
    
    invoice.status = InvoiceStatus.SENT
    invoice.updated_at = datetime.now()
    db.commit()
    
    return {"message": "Facture validée avec succès"}

@router.post("/invoices/{invoice_id}/pay")
async def pay_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marque une facture comme payée"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    invoice.status = InvoiceStatus.PAID
    invoice.payment_status = "paid"
    invoice.updated_at = datetime.now()
    db.commit()
    
    return {"message": "Facture marquée comme payée"}

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprime une facture"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if invoice.status != InvoiceStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Seules les factures en brouillon peuvent être supprimées")
    
    db.delete(invoice)
    db.commit()
    
    return {"message": "Facture supprimée avec succès"}

# ===== ENDPOINTS DASHBOARD =====
@router.get("/dashboard/kpi")
async def get_dashboard_kpi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """KPIs du dashboard comptabilité"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        first_day_month = today.replace(day=1)
        
        revenue = db.query(func.coalesce(func.sum(Invoice.amount_total), 0)).filter(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.date_invoice >= first_day_month
        ).scalar() or 0
        
        unpaid = db.query(func.count(Invoice.id)).filter(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.date_due < today
        ).scalar() or 0
        
        overdue = db.query(func.count(Invoice.id)).filter(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.date_due < today
        ).scalar() or 0
        
        total = db.query(func.count(Invoice.id)).scalar() or 0
        paid = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.PAID).scalar() or 0
        
        last_month = first_day_month - timedelta(days=1)
        last_month_revenue = db.query(func.coalesce(func.sum(Invoice.amount_total), 0)).filter(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.date_invoice >= last_month.replace(day=1),
            Invoice.date_invoice < first_day_month
        ).scalar() or 0
        
        revenue_trend = ((revenue - last_month_revenue) / last_month_revenue * 100) if last_month_revenue > 0 else 0
        
        return [
            {"title": "Chiffre d'affaires", "value": float(revenue), "prefix": "€", "trend": round(revenue_trend, 1), "trendUp": revenue_trend > 0, "color": "#27ae60"},
            {"title": "Factures impayées", "value": unpaid, "trend": 0, "trendUp": False, "color": "#e74c3c"},
            {"title": "Factures en retard", "value": overdue, "trend": 0, "trendUp": False, "color": "#f39c12"},
            {"title": "Factures payées", "value": paid, "trend": 0, "trendUp": True, "color": "#3498db"}
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_dashboard_kpi: {e}")
        return []

@router.get("/dashboard/stats", response_model=InvoiceStatsResponse)
async def get_invoice_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Statistiques détaillées des factures"""
    try:
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        first_day_month = today.replace(day=1)
        
        revenue = db.query(func.coalesce(func.sum(Invoice.amount_total), 0)).filter(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.date_invoice >= first_day_month
        ).scalar() or 0
        
        unpaid = db.query(func.count(Invoice.id)).filter(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.date_due < today
        ).scalar() or 0
        
        overdue = db.query(func.count(Invoice.id)).filter(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.date_due < today
        ).scalar() or 0
        
        total = db.query(func.count(Invoice.id)).scalar() or 0
        paid = db.query(func.count(Invoice.id)).filter(Invoice.status == InvoiceStatus.PAID).scalar() or 0
        
        return {
            "monthly_revenue": float(revenue),
            "unpaid_invoices": unpaid,
            "total_invoices": total,
            "average_invoice": float(revenue / total if total > 0 else 0),
            "overdue_invoices": overdue,
            "paid_invoices": paid
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_invoice_stats: {e}")
        return {
            "monthly_revenue": 0,
            "unpaid_invoices": 0,
            "total_invoices": 0,
            "average_invoice": 0,
            "overdue_invoices": 0,
            "paid_invoices": 0
        }

@router.get("/dashboard/cash-flow", response_model=CashFlowResponse)
async def get_cash_flow(
    days: int = Query(30, ge=1, le=365, description="Nombre de jours à analyser"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère les données de cash flow"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        paid_invoices = db.query(Invoice).filter(
            Invoice.status == InvoiceStatus.PAID,
            Invoice.date_invoice >= start_date,
            Invoice.date_invoice <= end_date
        ).all()
        
        sent_invoices = db.query(Invoice).filter(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.date_invoice >= start_date,
            Invoice.date_invoice <= end_date
        ).all()
        
        total_incoming = sum(inv.amount_total or 0 for inv in paid_invoices)
        total_outgoing = sum(inv.amount_total or 0 for inv in sent_invoices)
        
        cash_flow_data = []
        current_date = start_date
        
        while current_date <= end_date:
            daily_incoming = sum(inv.amount_total or 0 for inv in paid_invoices if inv.date_invoice.date() == current_date.date())
            daily_outgoing = sum(inv.amount_total or 0 for inv in sent_invoices if inv.date_invoice.date() == current_date.date())
            
            cash_flow_data.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "incoming": float(daily_incoming),
                "outgoing": float(daily_outgoing),
                "balance": float(daily_incoming - daily_outgoing),
                "cumulative": 0
            })
            current_date += timedelta(days=1)
        
        cumulative = 0
        for item in cash_flow_data:
            cumulative += item["balance"]
            item["cumulative"] = float(cumulative)
        
        avg_incoming = total_incoming / days if days > 0 else 0
        avg_outgoing = total_outgoing / days if days > 0 else 0
        
        forecast = []
        for i in range(1, 8):
            forecast_date = end_date + timedelta(days=i)
            forecast.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "forecast_incoming": float(avg_incoming),
                "forecast_outgoing": float(avg_outgoing),
                "forecast_balance": float(avg_incoming - avg_outgoing),
                "forecast_cumulative": float(cumulative + (avg_incoming - avg_outgoing) * i)
            })
        
        return {
            "summary": {
                "total_incoming": float(total_incoming),
                "total_outgoing": float(total_outgoing),
                "net_cash_flow": float(total_incoming - total_outgoing),
                "average_daily_incoming": float(avg_incoming),
                "average_daily_outgoing": float(avg_outgoing),
                "days_analyzed": days,
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d")
            },
            "daily_data": cash_flow_data,
            "forecast": forecast
        }
    except Exception as e:
        logger.error(f"❌ Erreur get_cash_flow: {e}")
        return {
            "summary": {"total_incoming": 0, "total_outgoing": 0, "net_cash_flow": 0, "average_daily_incoming": 0, "average_daily_outgoing": 0, "days_analyzed": days, "start_date": "", "end_date": ""},
            "daily_data": [],
            "forecast": []
        }

# ===== ENDPOINTS TAXES =====
@router.get("/taxes", response_model=List[TaxResponse])
async def get_taxes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère la liste des taxes"""
    return [
        {"id": 1, "name": "TVA 20%", "rate": 20.0, "type": "standard", "active": True},
        {"id": 2, "name": "TVA 10%", "rate": 10.0, "type": "reduced", "active": True},
        {"id": 3, "name": "TVA 5.5%", "rate": 5.5, "type": "super_reduced", "active": True},
        {"id": 4, "name": "TVA 0%", "rate": 0.0, "type": "zero", "active": True}
    ]

@router.get("/taxes/{tax_id}", response_model=TaxResponse)
async def get_tax(
    tax_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère une taxe spécifique"""
    taxes = {
        1: {"id": 1, "name": "TVA 20%", "rate": 20.0, "type": "standard", "active": True},
        2: {"id": 2, "name": "TVA 10%", "rate": 10.0, "type": "reduced", "active": True},
        3: {"id": 3, "name": "TVA 5.5%", "rate": 5.5, "type": "super_reduced", "active": True},
        4: {"id": 4, "name": "TVA 0%", "rate": 0.0, "type": "zero", "active": True}
    }
    
    if tax_id not in taxes:
        raise HTTPException(status_code=404, detail="Taxe non trouvée")
    
    return taxes[tax_id]

# ===== ENDPOINTS COMPTES COMPTABLES =====
@router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère la liste des comptes comptables"""
    try:
        accounts = db.query(Account).filter(Account.active == True).all()
        
        if not accounts:
            return [
                {"id": 1, "code": "401", "name": "Fournisseurs", "type": "liability", "active": True},
                {"id": 2, "code": "411", "name": "Clients", "type": "asset", "active": True},
                {"id": 3, "code": "445", "name": "TVA collectée", "type": "liability", "active": True},
                {"id": 4, "code": "4456", "name": "TVA déductible", "type": "asset", "active": True},
                {"id": 5, "code": "701", "name": "Ventes de marchandises", "type": "revenue", "active": True}
            ]
        
        return [
            {
                "id": acc.id,
                "code": acc.code,
                "name": acc.name,
                "type": acc.type.value if acc.type else "asset",
                "active": acc.active,
                "parent_id": acc.parent_id
            }
            for acc in accounts
        ]
    except Exception as e:
        logger.error(f"❌ Erreur get_accounts: {e}")
        return []

@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère un compte comptable spécifique"""
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    
    return {
        "id": account.id,
        "code": account.code,
        "name": account.name,
        "type": account.type.value if account.type else "asset",
        "active": account.active,
        "parent_id": account.parent_id
    }

# ===== ENDPOINTS UTILITAIRES =====
@router.get("/health")
async def health_check():
    """Vérifie que le module comptabilité est accessible"""
    return {"status": "ok", "module": "accounting", "timestamp": datetime.now().isoformat()}

@router.get("/")
async def root_endpoint():
    """Endpoint racine du module accounting"""
    return {
        "message": "Accounting module is available",
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            "/invoices",
            "/invoices/{id}",
            "/dashboard/kpi",
            "/dashboard/stats",
            "/dashboard/cash-flow",
            "/taxes",
            "/accounts",
            "/accounts/{id}",
            "/health"
        ]
    }

logger.info("✅ MODULE ACCOUNTING CHARGÉ AVEC SUCCÈS")