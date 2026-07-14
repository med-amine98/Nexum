from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
from collections import defaultdict
from app.models.auth import User 

from app.models.fraud_banking import (
    FraudTransaction, 
    FraudBankingAlert,  # ← Nom changé
    FraudBankingRule,   # ← Nom changé
    FraudBankingStats   # ← Nom changé
)
from app.models.auth import User
from app.schemas.fraud_banking import (
    FraudTransactionCreate, FraudTransactionUpdate,
    FraudBankingAlertCreate, FraudBankingRuleCreate, FraudBankingRuleUpdate,  # ← Noms changés
    FraudStatsResponse
)

class FraudBankingService:
    def __init__(self, db: Session):
        self.db = db

    # ===== Transactions =====
    def create_transaction(self, transaction: FraudTransactionCreate, current_user: User) -> FraudTransaction:
        """Crée une nouvelle transaction et analyse les risques de fraude"""
        
        # Calculer les scores de risque
        risk_score = self._calculate_risk_score(transaction)
        risk_level = self._determine_risk_level(risk_score)
        fraud_probability = risk_score / 100
        fraud_indicators = self._identify_fraud_indicators(transaction)
        suspicious_patterns = self._detect_patterns(transaction)
        
        db_transaction = FraudTransaction(
            **transaction.dict(),
            risk_score=risk_score,
            risk_level=risk_level,
            fraud_probability=fraud_probability,
            fraud_indicators=fraud_indicators,
            suspicious_patterns=suspicious_patterns,
            analyzed_by_id=current_user.id
        )
        self.db.add(db_transaction)
        self.db.commit()
        self.db.refresh(db_transaction)
        
        # Générer des alertes si nécessaire
        if risk_level in ["high", "critical"]:
            self._create_fraud_alert(db_transaction)
        
        # Mettre à jour les statistiques
        self._update_stats(db_transaction)
        
        return db_transaction

    def get_transactions(
        self,
        skip: int = 0,
        limit: int = 100,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        location: Optional[str] = None,
        company_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[FraudTransaction]:
        """Récupère les transactions avec filtres"""
        query = self.db.query(FraudTransaction)
        
        if risk_level:
            query = query.filter(FraudTransaction.risk_level == risk_level)
        if status:
            query = query.filter(FraudTransaction.status == status)
        if location:
            query = query.filter(FraudTransaction.location.ilike(f"%{location}%"))
        if company_id:
            query = query.filter(FraudTransaction.company_id == company_id)
        if date_from:
            query = query.filter(FraudTransaction.transaction_date >= date_from)
        if date_to:
            query = query.filter(FraudTransaction.transaction_date <= date_to)
            
        return query.order_by(desc(FraudTransaction.detection_date)).offset(skip).limit(limit).all()

    def get_transaction(self, transaction_id: int) -> Optional[FraudTransaction]:
        """Récupère une transaction par son ID"""
        return self.db.query(FraudTransaction).filter(FraudTransaction.id == transaction_id).first()

    def get_transaction_by_ref(self, ref: str) -> Optional[FraudTransaction]:
        """Récupère une transaction par sa référence"""
        return self.db.query(FraudTransaction).filter(FraudTransaction.transaction_id == ref).first()

    def update_transaction(
        self,
        transaction_id: int,
        update_data: FraudTransactionUpdate,
        current_user: User
    ) -> Optional[FraudTransaction]:
        """Met à jour une transaction"""
        db_transaction = self.get_transaction(transaction_id)
        if db_transaction:
            for key, value in update_data.dict(exclude_unset=True).items():
                setattr(db_transaction, key, value)
            db_transaction.analyzed_by_id = current_user.id
            self.db.commit()
            self.db.refresh(db_transaction)
        return db_transaction

    def block_transaction(self, transaction_id: int, current_user: User) -> Optional[FraudTransaction]:
        """Bloque une transaction suspecte"""
        db_transaction = self.get_transaction(transaction_id)
        if db_transaction:
            db_transaction.status = "blocked"
            db_transaction.blocked_at = datetime.now()
            db_transaction.analyzed_by_id = current_user.id
            self.db.commit()
            self.db.refresh(db_transaction)
        return db_transaction

    def clear_transaction(self, transaction_id: int, current_user: User) -> Optional[FraudTransaction]:
        """Marque une transaction comme légitime"""
        db_transaction = self.get_transaction(transaction_id)
        if db_transaction:
            db_transaction.status = "cleared"
            db_transaction.resolved_at = datetime.now()
            db_transaction.analyzed_by_id = current_user.id
            self.db.commit()
            self.db.refresh(db_transaction)
        return db_transaction

    # ===== Alertes =====
    def get_alerts(
        self,
        skip: int = 0,
        limit: int = 100,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None
    ) -> List[FraudBankingAlert]:  # ← Nom changé
        """Récupère les alertes"""
        query = self.db.query(FraudBankingAlert)  # ← Nom changé
        
        if severity:
            query = query.filter(FraudBankingAlert.severity == severity)  # ← Nom changé
        if resolved is not None:
            if resolved:
                query = query.filter(FraudBankingAlert.resolved_at.isnot(None))  # ← Nom changé
            else:
                query = query.filter(FraudBankingAlert.resolved_at.is_(None))  # ← Nom changé
                
        return query.order_by(desc(FraudBankingAlert.triggered_at)).offset(skip).limit(limit).all()  # ← Nom changé

    def resolve_alert(self, alert_id: int, current_user: User) -> Optional[FraudBankingAlert]:  # ← Nom changé
        """Résout une alerte"""
        db_alert = self.db.query(FraudBankingAlert).filter(FraudBankingAlert.id == alert_id).first()  # ← Nom changé
        if db_alert:
            db_alert.resolved_at = datetime.now()
            db_alert.resolved_by_user_id = current_user.id
            self.db.commit()
            self.db.refresh(db_alert)
        return db_alert

    # ===== Règles =====
    def get_rules(self, active_only: bool = False) -> List[FraudBankingRule]:  # ← Nom changé
        """Récupère les règles de détection"""
        query = self.db.query(FraudBankingRule).order_by(desc(FraudBankingRule.priority))  # ← Nom changé
        if active_only:
            query = query.filter(FraudBankingRule.is_active == True)  # ← Nom changé
        return query.all()

    def create_rule(self, rule: FraudBankingRuleCreate, current_user: User) -> FraudBankingRule:  # ← Nom changé
        """Crée une nouvelle règle"""
        db_rule = FraudBankingRule(  # ← Nom changé
            **rule.dict(),
            created_by_id=current_user.id
        )
        self.db.add(db_rule)
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule

    def update_rule(self, rule_id: int, update_data: FraudBankingRuleUpdate, current_user: User) -> Optional[FraudBankingRule]:  # ← Nom changé
        """Met à jour une règle"""
        db_rule = self.db.query(FraudBankingRule).filter(FraudBankingRule.id == rule_id).first()  # ← Nom changé
        if db_rule:
            for key, value in update_data.dict(exclude_unset=True).items():
                setattr(db_rule, key, value)
            self.db.commit()
            self.db.refresh(db_rule)
        return db_rule

    # ===== Dashboard =====
    def get_dashboard_stats(self) -> FraudStatsResponse:
        """Récupère les statistiques pour le dashboard"""
        
        # Statistiques globales
        total_detected = self.db.query(FraudTransaction).count()
        blocked = self.db.query(FraudTransaction).filter(FraudTransaction.status == "blocked").count()
        investigating = self.db.query(FraudTransaction).filter(FraudTransaction.status == "investigating").count()
        false_positive = self.db.query(FraudTransaction).filter(FraudTransaction.status == "false_positive").count()
        
        # Montant protégé
        blocked_transactions = self.db.query(FraudTransaction).filter(
            FraudTransaction.status == "blocked"
        ).all()
        amount_saved = sum(t.amount for t in blocked_transactions)
        
        # Distribution des risques
        risk_dist = {
            "critical": self.db.query(FraudTransaction).filter(FraudTransaction.risk_level == "critical").count(),
            "high": self.db.query(FraudTransaction).filter(FraudTransaction.risk_level == "high").count(),
            "medium": self.db.query(FraudTransaction).filter(FraudTransaction.risk_level == "medium").count(),
            "low": self.db.query(FraudTransaction).filter(FraudTransaction.risk_level == "low").count()
        }
        
        # Alertes récentes
        recent_alerts_raw = self.db.query(FraudBankingAlert).order_by(  # ← Nom changé
            desc(FraudBankingAlert.triggered_at)  # ← Nom changé
        ).limit(5).all()
        
        recent_alerts = []
        for alert in recent_alerts_raw:
            transaction = self.db.query(FraudTransaction).filter(
                FraudTransaction.id == alert.transaction_id
            ).first()
            recent_alerts.append({
                "id": alert.id,
                "transaction": transaction.transaction_id if transaction else "N/A",
                "amount": f"{transaction.amount:,.0f} €" if transaction else "0 €",
                "risk": alert.severity,
                "status": transaction.status if transaction else "unknown",
                "location": transaction.location if transaction else "Inconnu",
                "time": self._format_time_ago(alert.triggered_at)
            })
        
        # Activité horaire
        hourly = []
        for hour in range(0, 24, 4):
            hour_str = f"{hour:02d}h"
            count = self.db.query(FraudTransaction).filter(
                func.extract('hour', FraudTransaction.transaction_date) == hour
            ).count()
            hourly.append({"hour": hour_str, "count": count})
        
        # Top localisations
        top_locations_raw = self.db.query(
            FraudTransaction.location,
            func.count(FraudTransaction.id).label("count")
        ).group_by(FraudTransaction.location).order_by(desc("count")).limit(5).all()
        
        top_locations = [{"location": loc[0], "count": loc[1]} for loc in top_locations_raw]
        
        return FraudStatsResponse(
            total_detected=total_detected,
            blocked=blocked,
            investigating=investigating,
            false_positive=false_positive,
            amount_saved=amount_saved,
            risk_distribution=risk_dist,
            recent_alerts=recent_alerts,
            hourly_activity=hourly,
            top_locations=top_locations
        )

    # ===== Méthodes privées =====
    def _calculate_risk_score(self, transaction: FraudTransactionCreate) -> float:
        """Calcule le score de risque (0-100)"""
        score = 0
        
        # Montant anormal
        if transaction.amount > 10000:
            score += 30
        elif transaction.amount > 5000:
            score += 20
        elif transaction.amount > 1000:
            score += 10
        
        # Localisation suspecte
        high_risk_countries = ["Pays étranger", "Zone à risque"]
        if transaction.location in high_risk_countries:
            score += 25
        
        # Heure suspecte (entre 23h et 5h)
        hour = transaction.transaction_date.hour
        if hour < 6 or hour > 23:
            score += 15
        
        # IP suspecte (simulé)
        if transaction.ip_address and transaction.ip_address.startswith("185."):
            score += 20
        
        return min(score, 100)

    def _determine_risk_level(self, score: float) -> str:
        """Détermine le niveau de risque"""
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

    def _identify_fraud_indicators(self, transaction: FraudTransactionCreate) -> List[str]:
        """Identifie les indicateurs de fraude"""
        indicators = []
        
        if transaction.amount > 10000:
            indicators.append("montant_anormal")
        if transaction.location == "Pays étranger":
            indicators.append("localisation_inhabituelle")
        hour = transaction.transaction_date.hour
        if hour < 6 or hour > 23:
            indicators.append("horaire_inhabituel")
        
        return indicators

    def _detect_patterns(self, transaction: FraudTransactionCreate) -> List[str]:
        """Détecte des patterns suspects"""
        patterns = []
        
        # Vérifier les transactions similaires récentes
        recent = self.db.query(FraudTransaction).filter(
            FraudTransaction.client_id == transaction.client_id,
            FraudTransaction.transaction_date >= datetime.now() - timedelta(hours=1)
        ).count()
        
        if recent > 3:
            patterns.append("multiples_transactions_récentes")
        
        return patterns

    def _create_fraud_alert(self, transaction: FraudTransaction):
        """Crée une alerte de fraude"""
        alert = FraudBankingAlert(  # ← Nom changé
            transaction_id=transaction.id,
            alert_type="high_risk_transaction",
            severity=transaction.risk_level,
            description=f"Transaction à risque {transaction.risk_level} détectée",
            rule_name="risk_threshold",
            rule_score=transaction.risk_score
        )
        self.db.add(alert)
        self.db.commit()

    def _update_stats(self, transaction: FraudTransaction):
        """Met à jour les statistiques horaires"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        stats = self.db.query(FraudBankingStats).filter(FraudBankingStats.date == today).first()  # ← Nom changé
        if not stats:
            stats = FraudBankingStats(date=today)  # ← Nom changé
            self.db.add(stats)
        
        stats.total_detected += 1
        if transaction.status == "blocked":
            stats.blocked += 1
            stats.amount_saved += transaction.amount
        elif transaction.status == "investigating":
            stats.investigating += 1
        elif transaction.status == "false_positive":
            stats.false_positive += 1
        
        # Mettre à jour la distribution
        risk_dist = stats.by_risk_level or {}
        risk_dist[transaction.risk_level] = risk_dist.get(transaction.risk_level, 0) + 1
        stats.by_risk_level = risk_dist
        
        # Mettre à jour l'activité horaire
        hour = transaction.transaction_date.hour
        hourly = stats.by_hour or {}
        hourly[str(hour)] = hourly.get(str(hour), 0) + 1
        stats.by_hour = hourly
        
        self.db.commit()

    def _format_time_ago(self, dt: datetime) -> str:
        """Formate le temps écoulé"""
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 0:
            return f"Il y a {diff.days}j"
        elif diff.seconds > 3600:
            return f"Il y a {diff.seconds // 3600}h"
        elif diff.seconds > 60:
            return f"Il y a {diff.seconds // 60}min"
        else:
            return "À l'instant"