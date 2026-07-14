from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import numpy as np

from app.models.churn import ChurnCustomer, ChurnAlert, RetentionAction, ChurnPredictionModel
from app.models.auth import User  # ← Gardez User ici
from app.models.company import Company  # ← CORRIGÉ: importer Company depuis le bon fichier
from app.schemas.churn import (
    ChurnCustomerCreate, ChurnCustomerUpdate,
    ChurnAlertCreate, RetentionActionCreate,
    ChurnStatsResponse
)

class ChurnService:
    def __init__(self, db: Session):
        self.db = db

    # ===== Customers =====
    def create_customer(self, customer: ChurnCustomerCreate, current_user: User) -> ChurnCustomer:
        """Crée un nouveau client et calcule son score d'attrition"""
        
        # Calculer le score d'attrition
        churn_score = self._calculate_churn_score(customer)
        risk_level = self._determine_risk_level(churn_score)
        risk_factors = self._identify_risk_factors(customer)
        
        db_customer = ChurnCustomer(
            **customer.dict(),
            churn_score=churn_score,
            risk_level=risk_level,
            churn_probability=churn_score / 100,
            risk_factors=risk_factors,
            analyzed_by_id=current_user.id
        )
        self.db.add(db_customer)
        self.db.commit()
        self.db.refresh(db_customer)
        
        # Générer une alerte si risque élevé
        if risk_level in ["high", "critical"]:
            self._create_high_risk_alert(db_customer)
        
        return db_customer

    def get_customers(
        self,
        skip: int = 0,
        limit: int = 100,
        risk_level: Optional[str] = None,
        segment: Optional[str] = None,
        company_id: Optional[int] = None,
        min_score: Optional[float] = None
    ) -> List[ChurnCustomer]:
        """Récupère les clients avec filtres"""
        query = self.db.query(ChurnCustomer)
        
        if risk_level:
            query = query.filter(ChurnCustomer.risk_level == risk_level)
        if segment:
            query = query.filter(ChurnCustomer.segment == segment)
        if company_id:
            query = query.filter(ChurnCustomer.company_id == company_id)
        if min_score:
            query = query.filter(ChurnCustomer.churn_score >= min_score)
            
        return query.order_by(desc(ChurnCustomer.churn_score)).offset(skip).limit(limit).all()

    def get_customer(self, customer_id: int) -> Optional[ChurnCustomer]:
        """Récupère un client par son ID"""
        return self.db.query(ChurnCustomer).filter(ChurnCustomer.id == customer_id).first()

    def get_customer_by_ref(self, ref: str) -> Optional[ChurnCustomer]:
        """Récupère un client par sa référence"""
        return self.db.query(ChurnCustomer).filter(ChurnCustomer.customer_id == ref).first()

    def update_customer(
        self,
        customer_id: int,
        update_data: ChurnCustomerUpdate,
        current_user: User
    ) -> Optional[ChurnCustomer]:
        """Met à jour un client"""
        db_customer = self.get_customer(customer_id)
        if db_customer:
            for key, value in update_data.dict(exclude_unset=True).items():
                setattr(db_customer, key, value)
            db_customer.analyzed_by_id = current_user.id
            db_customer.updated_at = datetime.now()
            self.db.commit()
            self.db.refresh(db_customer)
        return db_customer

    def mark_contacted(self, customer_id: int, current_user: User) -> Optional[ChurnCustomer]:
        """Marque un client comme contacté"""
        db_customer = self.get_customer(customer_id)
        if db_customer:
            db_customer.contacted = True
            db_customer.last_contact_date = datetime.now()
            db_customer.analyzed_by_id = current_user.id
            self.db.commit()
            self.db.refresh(db_customer)
        return db_customer

    # ===== Retention Actions =====
    def create_retention_action(
        self,
        action: RetentionActionCreate,
        current_user: User
    ) -> RetentionAction:
        """Crée une action de fidélisation"""
        db_action = RetentionAction(
            **action.dict(),
            created_by_id=current_user.id
        )
        self.db.add(db_action)
        self.db.commit()
        self.db.refresh(db_action)
        
        # Mettre à jour le client
        customer = self.get_customer(action.customer_id)
        if customer:
            actions = customer.retention_actions or []
            actions.append({
                "id": db_action.id,
                "type": action.action_type,
                "date": datetime.now().isoformat(),
                "status": "pending"
            })
            customer.retention_actions = actions
            self.db.commit()
        
        return db_action

    def update_action_status(
        self,
        action_id: int,
        status: str,
        response_date: Optional[datetime] = None
    ) -> Optional[RetentionAction]:
        """Met à jour le statut d'une action"""
        db_action = self.db.query(RetentionAction).filter(RetentionAction.id == action_id).first()
        if db_action:
            db_action.status = status
            if response_date:
                db_action.response_date = response_date
            self.db.commit()
            self.db.refresh(db_action)
        return db_action

    # ===== Alerts =====
    def get_alerts(
        self,
        skip: int = 0,
        limit: int = 100,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None
    ) -> List[ChurnAlert]:
        """Récupère les alertes"""
        query = self.db.query(ChurnAlert)
        
        if severity:
            query = query.filter(ChurnAlert.severity == severity)
        if resolved is not None:
            if resolved:
                query = query.filter(ChurnAlert.resolved_at.isnot(None))
            else:
                query = query.filter(ChurnAlert.resolved_at.is_(None))
                
        return query.order_by(desc(ChurnAlert.created_at)).offset(skip).limit(limit).all()

    def resolve_alert(self, alert_id: int, current_user: User) -> Optional[ChurnAlert]:
        """Résout une alerte"""
        db_alert = self.db.query(ChurnAlert).filter(ChurnAlert.id == alert_id).first()
        if db_alert:
            db_alert.resolved_at = datetime.now()
            db_alert.resolved_by_id = current_user.id
            self.db.commit()
            self.db.refresh(db_alert)
        return db_alert

    # ===== Dashboard Stats =====
    def get_dashboard_stats(self) -> ChurnStatsResponse:
        """Récupère les statistiques pour le dashboard"""
        
        # Statistiques globales
        total_at_risk = self.db.query(ChurnCustomer).filter(
            ChurnCustomer.risk_level.in_(["high", "critical", "medium"])
        ).count()
        
        high_risk = self.db.query(ChurnCustomer).filter(
            ChurnCustomer.risk_level.in_(["high", "critical"])
        ).count()
        
        medium_risk = self.db.query(ChurnCustomer).filter(
            ChurnCustomer.risk_level == "medium"
        ).count()
        
        low_risk = self.db.query(ChurnCustomer).filter(
            ChurnCustomer.risk_level == "low"
        ).count()
        
        # Distribution des risques
        risk_dist = {
            "critical": self.db.query(ChurnCustomer).filter(ChurnCustomer.risk_level == "critical").count(),
            "high": self.db.query(ChurnCustomer).filter(ChurnCustomer.risk_level == "high").count(),
            "medium": self.db.query(ChurnCustomer).filter(ChurnCustomer.risk_level == "medium").count(),
            "low": self.db.query(ChurnCustomer).filter(ChurnCustomer.risk_level == "low").count()
        }
        
        # Taux d'attrition moyen
        avg_churn_score = self.db.query(func.avg(ChurnCustomer.churn_score)).scalar() or 0
        churn_rate = round(avg_churn_score / 10, 1)  # Conversion en pourcentage
        
        # Clients sauvés le mois dernier
        last_month = datetime.now() - timedelta(days=30)
        saved_last_month = self.db.query(RetentionAction).filter(
            RetentionAction.status == "accepted",
            RetentionAction.created_at >= last_month
        ).count()
        
        # Alertes récentes
        recent_alerts_raw = self.db.query(ChurnAlert).order_by(
            desc(ChurnAlert.created_at)
        ).limit(5).all()
        
        recent_alerts = []
        for alert in recent_alerts_raw:
            customer = self.db.query(ChurnCustomer).filter(
                ChurnCustomer.id == alert.customer_id
            ).first()
            recent_alerts.append({
                "id": alert.id,
                "customer_name": customer.customer_name if customer else "Inconnu",
                "severity": alert.severity,
                "description": alert.description,
                "time": self._format_time_ago(alert.created_at),
                "suggested_action": alert.suggested_action
            })
        
        # Top facteurs de risque
        all_risk_factors = self.db.query(ChurnCustomer.risk_factors).all()
        risk_factor_counts = {}
        for factors in all_risk_factors:
            if factors[0]:
                for factor in factors[0]:
                    risk_factor_counts[factor] = risk_factor_counts.get(factor, 0) + 1
        
        top_risk_factors = [
            {"factor": k, "count": v}
            for k, v in sorted(risk_factor_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Taux de succès des actions de fidélisation
        total_actions = self.db.query(RetentionAction).count()
        successful_actions = self.db.query(RetentionAction).filter(
            RetentionAction.status == "accepted"
        ).count()
        retention_success_rate = round(
            (successful_actions / total_actions * 100) if total_actions > 0 else 0, 1
        )
        
        return ChurnStatsResponse(
            total_at_risk=total_at_risk,
            high_risk=high_risk,
            medium_risk=medium_risk,
            low_risk=low_risk,
            churn_rate=churn_rate,
            saved_last_month=saved_last_month,
            risk_distribution=risk_dist,
            recent_alerts=recent_alerts,
            top_risk_factors=top_risk_factors,
            retention_success_rate=retention_success_rate
        )

    # ===== Méthodes privées =====
    def _calculate_churn_score(self, customer: ChurnCustomerCreate) -> float:
        """Calcule le score d'attrition (0-100)"""
        score = 0
        
        # Inactivité
        if customer.inactivity_days > 90:
            score += 40
        elif customer.inactivity_days > 60:
            score += 30
        elif customer.inactivity_days > 30:
            score += 20
        elif customer.inactivity_days > 15:
            score += 10
        
        # Réclamations récentes
        score += min(customer.recent_complaints * 15, 30)
        
        # Retards de paiement
        score += min(customer.payment_delays * 10, 20)
        
        # Nombre de produits (moins de produits = plus de risque)
        if customer.products_count == 1:
            score += 20
        elif customer.products_count == 2:
            score += 10
        
        # Segment
        if customer.segment == "Premium":
            score -= 10  # Les clients premium sont plus fidèles
        
        return min(max(score, 0), 100)

    def _determine_risk_level(self, score: float) -> str:
        """Détermine le niveau de risque basé sur le score"""
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

    def _identify_risk_factors(self, customer: ChurnCustomerCreate) -> List[str]:
        """Identifie les facteurs de risque"""
        factors = []
        
        if customer.inactivity_days > 90:
            factors.append("inactivité_prolongée")
        elif customer.inactivity_days > 60:
            factors.append("inactivité_importante")
        elif customer.inactivity_days > 30:
            factors.append("inactivité_modérée")
        
        if customer.recent_complaints > 2:
            factors.append("réclamations_multiples")
        elif customer.recent_complaints > 0:
            factors.append("réclamations_récentes")
        
        if customer.payment_delays > 2:
            factors.append("retards_paiement_multiples")
        elif customer.payment_delays > 0:
            factors.append("retard_paiement")
        
        if customer.products_count == 1:
            factors.append("produit_unique")
        
        return factors

    def _create_high_risk_alert(self, customer: ChurnCustomer):
        """Crée une alerte pour les clients à risque élevé"""
        alert = ChurnAlert(
            customer_id=customer.id,
            alert_type="high_risk",
            severity=customer.risk_level,
            description=f"Client à risque {customer.risk_level} détecté",
            suggested_action="Contacter le client avec une offre de fidélisation",
            recommended_offer="Remise 15% sur prochain achat"
        )
        self.db.add(alert)
        self.db.commit()

    def _format_time_ago(self, dt: datetime) -> str:
        """Formate le temps écoulé"""
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 0:
            return f"Il y a {diff.days} jour{'s' if diff.days > 1 else ''}"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"Il y a {hours} heure{'s' if hours > 1 else ''}"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"Il y a {minutes} minute{'s' if minutes > 1 else ''}"
        else:
            return "À l'instant"