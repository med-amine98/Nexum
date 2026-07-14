from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import hashlib
import ipaddress

from app.models.fraud_detection import FraudAlert, FraudRule, FraudCase, TransactionHistory
from app.models.sale import SaleOrder
from app.models.customer import Customer
from app.schemas.fraud import (
    FraudAlertCreate, FraudAlertUpdate, FraudCaseUpdate, FraudDashboard,
    FraudRuleCreate, FraudCaseCreate,
    FraudStats
)

class FraudDetectionService:
    def __init__(self, db: Session):
        self.db = db
        self._init_default_rules()

    def _init_default_rules(self):
        """Initialise les règles de détection par défaut si elles n'existent pas"""
        if self.db.query(FraudRule).count() == 0:
            default_rules = [
                {
                    "name": "Montant inhabituel",
                    "description": "Transaction > 3x la moyenne du client",
                    "rule_type": "amount",
                    "condition": {"threshold_multiplier": 3},
                    "threshold": 10000,
                    "risk_contribution": 35,
                    "priority": 1
                },
                {
                    "name": "Localisation suspecte",
                    "description": "Pays à haut risque ou changement de localisation",
                    "rule_type": "location",
                    "condition": {"high_risk_countries": ["RU", "CN", "NG", "KP"]},
                    "threshold": 1,
                    "risk_contribution": 40,
                    "priority": 2
                },
                {
                    "name": "Multiples tentatives",
                    "description": "> 5 transactions en 1 heure",
                    "rule_type": "velocity",
                    "condition": {"max_per_hour": 5},
                    "threshold": 5,
                    "risk_contribution": 25,
                    "priority": 3
                },
                {
                    "name": "Nouveau client",
                    "description": "Transaction > 1000€ pour un client de moins de 24h",
                    "rule_type": "behavioral",
                    "condition": {"min_account_age_hours": 24, "max_amount": 1000},
                    "threshold": 1000,
                    "risk_contribution": 20,
                    "priority": 4
                },
                {
                    "name": "Appareil inconnu",
                    "description": "Nouvel appareil pour ce client",
                    "rule_type": "device",
                    "condition": {"known_devices_required": True},
                    "threshold": 1,
                    "risk_contribution": 15,
                    "priority": 5
                }
            ]
            
            for rule_data in default_rules:
                rule = FraudRule(**rule_data)
                self.db.add(rule)
            self.db.commit()

    # ========== ANALYSE DE TRANSACTION ==========
    def analyze_transaction(self, transaction_data: Dict[str, Any]) -> FraudAlert:
        """Analyse une transaction et retourne une alerte si nécessaire"""
        
        # Calculer le score de risque
        risk_score = self._calculate_risk_score(transaction_data)
        reasons = self._get_risk_reasons(transaction_data, risk_score)
        
        # Déterminer le statut basé sur le score
        status = self._determine_alert_status(risk_score)
        
        # Créer l'alerte
        alert = FraudAlertCreate(
            transaction_id=transaction_data.get("transaction_id", self._generate_transaction_id()),
            amount=transaction_data["amount"],
            risk_score=risk_score,
            status=status,
            reason=", ".join(reasons) if reasons else "Analyse standard",
            transaction_date=datetime.now(),
            customer_id=transaction_data.get("customer_id"),
            customer_email=transaction_data.get("customer_email"),
            payment_method=transaction_data.get("payment_method"),
            ip_address=transaction_data.get("ip_address"),
            location=transaction_data.get("location"),
            amount_velocity=self._calculate_amount_velocity(transaction_data),
            location_risk=self._calculate_location_risk(transaction_data.get("location", "")),
            device_risk=self._calculate_device_risk(transaction_data),
            behavioral_risk=self._calculate_behavioral_risk(transaction_data)
        )
        
        # Sauvegarder l'alerte
        db_alert = FraudAlert(**alert.model_dump())
        self.db.add(db_alert)
        
        # Enregistrer dans l'historique
        history = TransactionHistory(
            transaction_id=alert.transaction_id,
            customer_id=transaction_data.get("customer_id", 0),
            amount=transaction_data["amount"],
            payment_method=transaction_data.get("payment_method"),
            ip_address=transaction_data.get("ip_address"),
            location=transaction_data.get("location"),
            fraud_score=risk_score,
            is_fraudulent=risk_score > 70
        )
        self.db.add(history)
        
        self.db.commit()
        self.db.refresh(db_alert)
        
        return db_alert

    def _calculate_risk_score(self, transaction: Dict[str, Any]) -> float:
        """Calcule le score de risque basé sur les règles actives"""
        score = 0.0
        active_rules = self.db.query(FraudRule).filter(
            FraudRule.is_active == True
        ).order_by(FraudRule.priority).all()
        
        for rule in active_rules:
            if self._evaluate_rule(rule, transaction):
                score += rule.risk_contribution
        
        return min(100, score)

    def _evaluate_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue si une règle est déclenchée par la transaction"""
        
        if rule.rule_type == "amount":
            return self._evaluate_amount_rule(rule, transaction)
        elif rule.rule_type == "velocity":
            return self._evaluate_velocity_rule(rule, transaction)
        elif rule.rule_type == "location":
            return self._evaluate_location_rule(rule, transaction)
        elif rule.rule_type == "device":
            return self._evaluate_device_rule(rule, transaction)
        elif rule.rule_type == "behavioral":
            return self._evaluate_behavioral_rule(rule, transaction)
        
        return False

    def _evaluate_amount_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue la règle de montant"""
        amount = transaction.get("amount", 0)
        threshold = rule.threshold
        
        # Vérifier si c'est un nouveau client
        if transaction.get("customer_id"):
            customer_transactions = self.db.query(SaleOrder).filter(
                SaleOrder.partner_id == transaction["customer_id"]
            ).order_by(SaleOrder.date_order).all()
            
            if customer_transactions:
                avg_amount = sum(t.amount_total for t in customer_transactions) / len(customer_transactions)
                threshold_multiplier = rule.condition.get("threshold_multiplier", 3)
                return amount > avg_amount * threshold_multiplier
        
        return amount > threshold

    def _evaluate_velocity_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue la règle de vélocité"""
        if not transaction.get("customer_id"):
            return False
        
        # Compter les transactions récentes du client
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_transactions = self.db.query(SaleOrder).filter(
            SaleOrder.partner_id == transaction["customer_id"],
            SaleOrder.date_order >= one_hour_ago
        ).count()
        
        max_per_hour = rule.condition.get("max_per_hour", 5)
        return recent_transactions >= max_per_hour

    def _evaluate_location_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue la règle de localisation"""
        location = transaction.get("location", "")
        high_risk_countries = rule.condition.get("high_risk_countries", [])
        
        # Vérifier si le pays est à haut risque
        for country_code in high_risk_countries:
            if country_code in location:
                return True
        
        # Vérifier le changement de localisation
        if transaction.get("customer_id"):
            last_location = self.db.query(TransactionHistory).filter(
                TransactionHistory.customer_id == transaction["customer_id"]
            ).order_by(desc(TransactionHistory.timestamp)).first()
            
            if last_location and last_location.location and location:
                return last_location.location != location
        
        return False

    def _evaluate_device_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue la règle d'appareil"""
        device_id = transaction.get("device_fingerprint")
        if not device_id or not transaction.get("customer_id"):
            return False
        
        # Vérifier si l'appareil est connu
        known_devices = self.db.query(TransactionHistory).filter(
            TransactionHistory.customer_id == transaction["customer_id"],
            TransactionHistory.device_id == device_id
        ).count()
        
        return known_devices == 0

    def _evaluate_behavioral_rule(self, rule: FraudRule, transaction: Dict[str, Any]) -> bool:
        """Évalue la règle comportementale"""
        if not transaction.get("customer_id"):
            return False
        
        # Vérifier l'âge du compte
        customer = self.db.query(Customer).filter(
            Customer.id == transaction["customer_id"]
        ).first()
        
        if customer:
            account_age = datetime.now() - customer.created_at
            min_age_hours = rule.condition.get("min_account_age_hours", 24)
            max_amount = rule.condition.get("max_amount", 1000)
            
            if account_age.total_seconds() < min_age_hours * 3600:
                return transaction.get("amount", 0) > max_amount
        
        return False

    def _calculate_amount_velocity(self, transaction: Dict[str, Any]) -> float:
        """Calcule la vélocité du montant"""
        if not transaction.get("customer_id"):
            return 0.0
        
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_total = self.db.query(func.sum(SaleOrder.amount_total)).filter(
            SaleOrder.partner_id == transaction["customer_id"],
            SaleOrder.date_order >= one_hour_ago
        ).scalar() or 0
        
        return recent_total

    def _calculate_location_risk(self, location: str) -> float:
        """Calcule le risque géographique"""
        high_risk_countries = ["RU", "CN", "NG", "KP", "IR", "SY"]
        medium_risk_countries = ["BR", "IN", "ID", "MX", "ZA"]
        
        for country in high_risk_countries:
            if country in location:
                return 80.0
        
        for country in medium_risk_countries:
            if country in location:
                return 40.0
        
        return 10.0

    def _calculate_device_risk(self, transaction: Dict[str, Any]) -> float:
        """Calcule le risque lié à l'appareil"""
        if not transaction.get("device_fingerprint"):
            return 50.0
        
        # Vérifier si l'appareil est associé à des fraudes
        fraud_count = self.db.query(FraudAlert).filter(
            FraudAlert.device_fingerprint == transaction["device_fingerprint"],
            FraudAlert.risk_score > 70
        ).count()
        
        return min(100, fraud_count * 20)

    def _calculate_behavioral_risk(self, transaction: Dict[str, Any]) -> float:
        """Calcule le risque comportemental"""
        if not transaction.get("customer_id"):
            return 0.0
        
        # Analyser le comportement du client
        customer_transactions = self.db.query(SaleOrder).filter(
            SaleOrder.partner_id == transaction["customer_id"]
        ).all()
        
        if not customer_transactions:
            return 30.0  # Nouveau client
        
        # Calculer l'écart par rapport à la moyenne
        avg_amount = sum(t.amount_total for t in customer_transactions) / len(customer_transactions)
        current_amount = transaction.get("amount", 0)
        
        if current_amount > avg_amount * 3:
            return 60.0
        
        return 0.0

    def _get_risk_reasons(self, transaction: Dict[str, Any], risk_score: float) -> List[str]:
        """Détermine les raisons du score de risque"""
        reasons = []
        
        if risk_score > 70:
            rules = self.db.query(FraudRule).filter(
                FraudRule.risk_contribution > 20
            ).all()
            
            for rule in rules:
                if self._evaluate_rule(rule, transaction):
                    reasons.append(rule.name)
        
        return reasons

    def _determine_alert_status(self, risk_score: float) -> str:
        """Détermine le statut de l'alerte basé sur le score"""
        if risk_score >= 80:
            return "critique"
        elif risk_score >= 60:
            return "élevé"
        elif risk_score >= 30:
            return "moyen"
        else:
            return "faible"

    def _generate_transaction_id(self) -> str:
        """Génère un ID de transaction unique"""
        last_alert = self.db.query(FraudAlert).order_by(desc(FraudAlert.id)).first()
        last_id = last_alert.id if last_alert else 0
        return f"TR-{datetime.now().year}-{str(last_id + 1).zfill(4)}"

    # ========== GESTION DES ALERTES ==========
    def get_all_alerts(self, status: Optional[str] = None, limit: int = 100):
        """Récupère toutes les alertes"""
        query = self.db.query(FraudAlert).order_by(desc(FraudAlert.created_at))
        
        if status and status != "all":
            query = query.filter(FraudAlert.status == status)
        
        return query.limit(limit).all()

    def get_alert(self, alert_id: int):
        """Récupère une alerte par son ID"""
        return self.db.query(FraudAlert).filter(FraudAlert.id == alert_id).first()

    def update_alert(self, alert_id: int, update_data: FraudAlertUpdate):
        """Met à jour une alerte"""
        alert = self.get_alert(alert_id)
        if not alert:
            return None
        
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(alert, key, value)
        
        if update_data.is_resolved:
            alert.resolved_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(alert)
        return alert

    def resolve_alert(self, alert_id: int, resolution_notes: str, resolved_by: int):
        """Résout une alerte"""
        return self.update_alert(alert_id, FraudAlertUpdate(
            is_resolved=True,
            resolution_notes=resolution_notes,
            resolved_by=resolved_by
        ))

    # ========== STATISTIQUES ==========
    def get_statistics(self) -> FraudStats:
        """Récupère les statistiques de fraude"""
        alerts = self.db.query(FraudAlert).all()
        
        total_alerts = len(alerts)
        critical_alerts = sum(1 for a in alerts if a.status == "critique")
        high_alerts = sum(1 for a in alerts if a.status == "élevé")
        medium_alerts = sum(1 for a in alerts if a.status == "moyen")
        low_alerts = sum(1 for a in alerts if a.status == "faible")
        resolved_alerts = sum(1 for a in alerts if a.is_resolved)
        
        avg_risk_score = sum(a.risk_score for a in alerts) / total_alerts if total_alerts > 0 else 0
        
        total_transactions = self.db.query(TransactionHistory).count()
        
        # Montant économisé (transactions bloquées)
        saved_amount = self.db.query(func.sum(FraudAlert.amount)).filter(
            FraudAlert.status.in_(["critique", "élevé"]),
            FraudAlert.is_resolved == False
        ).scalar() or 0
        
        return FraudStats(
            total_alerts=total_alerts,
            critical_alerts=critical_alerts,
            high_alerts=high_alerts,
            medium_alerts=medium_alerts,
            low_alerts=low_alerts,
            resolved_alerts=resolved_alerts,
            avg_risk_score=round(avg_risk_score, 1),
            total_transactions_analyzed=total_transactions,
            saved_amount=round(saved_amount, 2)
        )

    # ========== DASHBOARD ==========
    def get_dashboard_data(self) -> FraudDashboard:
        """Récupère toutes les données pour le dashboard"""
        alerts = self.get_all_alerts(limit=10)
        stats = self.get_statistics()
        rules = self.db.query(FraudRule).filter(FraudRule.is_active == True).all()
        recent_cases = self.db.query(FraudCase).order_by(desc(FraudCase.created_at)).limit(5).all()
        
        return FraudDashboard(
            alerts=alerts,
            stats=stats,
            rules=rules,
            recent_cases=recent_cases
        )

    # ========== CAS DE FRAUDE ==========
    def create_case(self, case_data: FraudCaseCreate) -> FraudCase:
        """Crée un nouveau cas de fraude"""
        case = FraudCase(**case_data.model_dump())
        self.db.add(case)
        self.db.commit()
        self.db.refresh(case)
        return case

    def get_case(self, case_id: int):
        """Récupère un cas par son ID"""
        return self.db.query(FraudCase).filter(FraudCase.id == case_id).first()

    def update_case(self, case_id: int, update_data: FraudCaseUpdate):
        """Met à jour un cas"""
        case = self.get_case(case_id)
        if not case:
            return None
        
        for key, value in update_data.model_dump(exclude_unset=True).items():
            setattr(case, key, value)
        
        if update_data.status == "résolu":
            case.resolved_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(case)
        return case

    # ========== INITIALISATION ==========
    def seed_initial_data(self):
        """Initialise les données de test"""
        
        # Créer quelques alertes de test
        if self.db.query(FraudAlert).count() == 0:
            test_alerts = [
                {
                    "transaction_id": "TR-2024-0123",
                    "amount": 15000,
                    "risk_score": 92,
                    "status": "critique",
                    "reason": "Montant inhabituel",
                    "location": "RU"
                },
                {
                    "transaction_id": "TR-2024-0124",
                    "amount": 8500,
                    "risk_score": 78,
                    "status": "élevé",
                    "reason": "Localisation suspecte",
                    "location": "NG"
                },
                {
                    "transaction_id": "TR-2024-0125",
                    "amount": 2300,
                    "risk_score": 45,
                    "status": "moyen",
                    "reason": "Multiples tentatives"
                },
                {
                    "transaction_id": "TR-2024-0126",
                    "amount": 450,
                    "risk_score": 12,
                    "status": "faible",
                    "reason": "Nouveau client"
                }
            ]
            
            for alert_data in test_alerts:
                alert = FraudAlert(**alert_data)
                self.db.add(alert)
            
            self.db.commit()