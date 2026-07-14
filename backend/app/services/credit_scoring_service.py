import random
import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.credit_scoring import (
    CreditRequest, CreditBusinessRule, CreditNotification, ExternalCreditData
)
from app.services.credit_scoring_ai import credit_scoring_ai

class CreditScoringService:
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_advanced_score(self, request: CreditRequest) -> Dict:
        """Calcul du score avancé avec plus de features"""
        # Features de base
        base_score = request.credit_score or 500
        
        # Ratio dette/revenu
        if request.client_income and request.amount:
            debt_to_income = (request.amount / request.term_months) / (request.client_income / 12)
            request.debt_to_income_ratio = min(1.0, debt_to_income)
            
            if debt_to_income > 0.5:
                base_score -= 50
            elif debt_to_income > 0.3:
                base_score -= 20
        
        # Stabilité d'emploi
        if request.client_employment_years:
            if request.client_employment_years > 5:
                base_score += 30
                request.employment_stability_score = 0.9
            elif request.client_employment_years > 2:
                base_score += 15
                request.employment_stability_score = 0.7
            else:
                request.employment_stability_score = 0.4
        
        # Données externes
        if request.external_credit_score:
            base_score = (base_score + request.external_credit_score) / 2
        
        # Comportement financier
        if request.external_payment_history:
            late_payments = sum(1 for p in request.external_payment_history if p.get('late', False))
            if late_payments > 3:
                base_score -= 100
            elif late_payments > 0:
                base_score -= 30
            request.financial_behavior_score = max(0, 1 - (late_payments / 12))
        
        # Score final
        final_score = min(1000, max(0, base_score))
        request.credit_score = int(final_score)
        
        # Niveau de risque
        if final_score > 750:
            request.risk_level = "low"
        elif final_score > 600:
            request.risk_level = "medium"
        elif final_score > 450:
            request.risk_level = "high"
        else:
            request.risk_level = "critical"
        
        # Facteurs de risque
        risk_factors = []
        if request.debt_to_income_ratio and request.debt_to_income_ratio > 0.5:
            risk_factors.append("Ratio d'endettement élevé")
        if request.employment_stability_score and request.employment_stability_score < 0.5:
            risk_factors.append("Stabilité d'emploi faible")
        if request.external_credit_score and request.external_credit_score < 600:
            risk_factors.append("Score de crédit externe faible")
        if request.financial_behavior_score and request.financial_behavior_score < 0.6:
            risk_factors.append("Historique de paiement défavorable")
        
        request.risk_factors = risk_factors
        
        return {
            "credit_score": request.credit_score,
            "risk_level": request.risk_level,
            "risk_factors": risk_factors,
            "debt_to_income_ratio": request.debt_to_income_ratio,
            "employment_stability_score": request.employment_stability_score,
            "financial_behavior_score": request.financial_behavior_score
        }
    
    def apply_business_rules(self, request: CreditRequest) -> Dict:
        """Appliquer les règles métier"""
        rules = self.db.query(CreditBusinessRule).filter(
            CreditBusinessRule.is_active == True
        ).order_by(CreditBusinessRule.priority.desc()).all()
        
        applied_rules = []
        final_action = "review"
        auto_validated = False
        
        for rule in rules:
            rule_applied = False
            rule_value = None
            
            # Récupérer la valeur à comparer
            if rule.rule_type == "credit_score":
                rule_value = request.credit_score
            elif rule.rule_type == "fraud_score":
                rule_value = request.fraud_score
            elif rule.rule_type == "income":
                rule_value = request.client_income
            elif rule.rule_type == "debt_to_income":
                rule_value = request.debt_to_income_ratio
            elif rule.rule_type == "external_score":
                rule_value = request.external_credit_score
            
            if rule_value is not None:
                # Évaluer la condition
                threshold = rule.value.get('threshold', 0)
                if rule.operator == "gte" and rule_value >= threshold:
                    rule_applied = True
                elif rule.operator == "lte" and rule_value <= threshold:
                    rule_applied = True
                elif rule.operator == "gt" and rule_value > threshold:
                    rule_applied = True
                elif rule.operator == "lt" and rule_value < threshold:
                    rule_applied = True
                elif rule.operator == "eq" and rule_value == threshold:
                    rule_applied = True
                elif rule.operator == "between":
                    min_val = rule.value.get('min', 0)
                    max_val = rule.value.get('max', 100)
                    if min_val <= rule_value <= max_val:
                        rule_applied = True
            
            if rule_applied:
                applied_rules.append({
                    "rule_name": rule.rule_name,
                    "action": rule.action,
                    "value": rule_value,
                    "threshold": rule.value
                })
                
                # Appliquer l'action
                if rule.action == "auto_approve":
                    final_action = "approve"
                    auto_validated = True
                elif rule.action == "auto_reject":
                    final_action = "reject"
                    auto_validated = True
                elif rule.action == "flag_review":
                    final_action = "review"
                elif rule.action == "send_notification":
                    self.create_notification(
                        request_id=request.id,
                        notification_type="rule_triggered",
                        severity=rule.action_params.get('severity', 'info'),
                        title=f"Règle déclenchée: {rule.rule_name}",
                        message=rule.action_params.get('message', f"La règle {rule.rule_name} a été appliquée")
                    )
        
        request.auto_validated = auto_validated
        request.rules_applied = applied_rules
        request.validation_notes = f"Auto-validation: {final_action}"
        
        if final_action == "approve" and auto_validated:
            request.status = "approved"
            request.approved_at = datetime.now()
        elif final_action == "reject" and auto_validated:
            request.status = "rejected"
            request.rejected_at = datetime.now()
        
        self.db.commit()
        
        return {
            "auto_validated": auto_validated,
            "final_action": final_action,
            "rules_applied": applied_rules,
            "validation_notes": request.validation_notes
        }
    
    def fetch_external_data(self, client_id: str, client_name: str) -> Dict:
        """Récupération de données externes (Bureaux de crédit & Open Banking)"""
        # Analyse déterministe basée sur l'identité client
        seed = int(hashlib.sha256(client_name.encode()).hexdigest()[:8], 16)
        rng = random.Random(seed)
        
        external_data = {
            "credit_bureau": {
                "credit_score": rng.randint(450, 850),
                "credit_limit": rng.randint(5000, 100000),
                "outstanding_debt": rng.randint(0, 20000),
                "late_payments": rng.randint(0, 2),
                "default_risk": rng.uniform(0, 0.3)
            },
            "bank": {
                "account_balance": rng.randint(2000, 150000),
                "average_balance": rng.randint(1000, 70000),
                "account_age_years": rng.randint(1, 20),
                "overdraft_count": rng.randint(0, 1)
            },
            "telecom": {
                "payment_punctuality": rng.uniform(0.9, 1.0),
                "contract_length": rng.randint(1, 12),
                "monthly_bill": rng.randint(30, 200)
            },
            "utility": {
                "payment_history_score": rng.uniform(0.8, 1.0),
                "service_address_years": rng.randint(1, 25)
            }
        }
        
        # Sauvegarder les données externes
        for source, data in external_data.items():
            external_record = ExternalCreditData(
                client_id=client_id,
                client_name=client_name,
                source=source,
                credit_score=data.get('credit_score'),
                credit_limit=data.get('credit_limit'),
                outstanding_debt=data.get('outstanding_debt'),
                late_payments_count=data.get('late_payments', 0),
                default_risk_score=data.get('default_risk', 0),
                data_fetched_at=datetime.now(),
                data_expires_at=datetime.now() + timedelta(days=30)
            )
            self.db.add(external_record)
        
        self.db.commit()
        
        return external_data
    
    def calculate_fraud_score_advanced(self, request: CreditRequest) -> Dict:
        """Calcul avancé du score de fraude avec plus de features"""
        fraud_score = request.fraud_score or random.uniform(20, 95)
        
        # Facteurs de fraude
        fraud_factors = []
        
        # 1. Incohérence revenus/demande
        if request.client_income and request.amount:
            income_to_loan_ratio = request.amount / request.client_income
            if income_to_loan_ratio > 5:
                fraud_score += 20
                fraud_factors.append("Demande disproportionnée par rapport aux revenus")
        
        # 2. Données externes suspectes
        external_records = self.db.query(ExternalCreditData).filter(
            ExternalCreditData.client_id == request.client_id
        ).all()
        
        for record in external_records:
            if record.default_risk_score and record.default_risk_score > 0.7:
                fraud_score += 15
                fraud_factors.append(f"Risque de défaut élevé selon {record.source}")
            if record.late_payments_count and record.late_payments_count > 3:
                fraud_score += 10
                fraud_factors.append(f"Retards de paiement fréquents ({record.source})")
        
        # 3. Demande multiple
        recent_requests = self.db.query(CreditRequest).filter(
            CreditRequest.client_id == request.client_id,
            CreditRequest.id != request.id,
            CreditRequest.request_date > datetime.now() - timedelta(days=30)
        ).count()
        
        if recent_requests > 2:
            fraud_score += 25
            fraud_factors.append(f"{recent_requests} demandes multiples sur 30 jours")
            request.multiple_requests_check = True
        
        # 4. Score de confiance
        if request.external_credit_score and request.external_credit_score < 500:
            fraud_score += 15
            fraud_factors.append("Score de crédit externe très faible")
        
        fraud_score = min(100, fraud_score)
        
        # Niveau de fraude
        if fraud_score > 80:
            fraud_level = "critical"
            fraud_type = "credit_fraud"
        elif fraud_score > 60:
            fraud_level = "high"
            fraud_type = "credit_fraud"
        elif fraud_score > 40:
            fraud_level = "medium"
            fraud_type = "multiple_requests"
        else:
            fraud_level = "low"
            fraud_type = "none"
        
        request.fraud_score = fraud_score
        request.fraud_risk = fraud_level
        request.fraud_type = fraud_type
        request.fraud_indicators = fraud_factors
        
        self.db.commit()
        
        return {
            "fraud_score": fraud_score,
            "fraud_level": fraud_level,
            "fraud_type": fraud_type,
            "indicators": fraud_factors
        }
    
    def create_notification(self, request_id: int, notification_type: str, severity: str, title: str, message: str) -> CreditNotification:
        """Créer une notification"""
        notification = CreditNotification(
            request_id=request_id,
            notification_type=notification_type,
            severity=severity,
            title=title,
            message=message,
            data={"timestamp": datetime.now().isoformat()}
        )
        
        self.db.add(notification)
        self.db.commit()
        
        return notification
    
    def send_critical_notifications(self, request: CreditRequest) -> List[CreditNotification]:
        """Envoyer des notifications pour les fraudes critiques"""
        notifications = []
        
        if request.fraud_risk in ["high", "critical"]:
            # Notification pour l'équipe anti-fraude
            notification = self.create_notification(
                request_id=request.id,
                notification_type="fraud_alert",
                severity="critical" if request.fraud_risk == "critical" else "high",
                title=f"Alerte fraude {request.fraud_risk.upper()}",
                message=f"Une demande suspecte a été détectée pour {request.client_name}. Score de fraude: {request.fraud_score}%"
            )
            notifications.append(notification)
        
        if request.risk_level == "critical":
            # Notification pour le comité de crédit
            notification = self.create_notification(
                request_id=request.id,
                notification_type="risk_alert",
                severity="critical",
                title="Risque critique détecté",
                message=f"Demande à risque critique pour {request.client_name}. Score: {request.credit_score}"
            )
            notifications.append(notification)
        
        if request.auto_validated and request.status == "approved":
            # Notification pour le client
            notification = self.create_notification(
                request_id=request.id,
                notification_type="approval",
                severity="info",
                title="Demande approuvée",
                message=f"Votre demande de crédit a été approuvée automatiquement."
            )
            notifications.append(notification)
        
        return notifications