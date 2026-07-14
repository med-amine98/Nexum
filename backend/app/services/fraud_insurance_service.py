from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import uuid
import traceback
import logging
logger = logging.getLogger(__name__)
from app.models.fraud_insurance import (
    FraudInsuranceClaim,
    FraudInsuranceIndicator,
    FraudInsuranceRule,
    FraudInsuranceNetwork
)
from app.models.auth import User
from app.schemas.fraud_insurance import (
    FraudInsuranceClaimCreate,
    FraudInsuranceClaimUpdate,
    FraudInsuranceIndicatorCreate,
    FraudInsuranceRuleCreate,
    FraudInsuranceRuleUpdate,
    FraudInsuranceNetworkCreate,
    FraudInsuranceStatsResponse
)

class FraudInsuranceService:
    def __init__(self, db: Session):
        self.db = db

    # ===== Claims =====
    def create_claim(self, claim: FraudInsuranceClaimCreate, current_user: User) -> FraudInsuranceClaim:
        """Crée un nouveau sinistre et analyse les risques de fraude"""
        try:
            logger.info(f"🔍 Création sinistre pour {claim.client_name}")
            
            claim_id = f"CLAIM-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            # Analyser la fraude
            risk_score = self._calculate_risk_score(claim)
            risk_level = self._determine_risk_level(risk_score)
            fraud_probability = risk_score / 100
            fraud_indicators = self._identify_fraud_indicators(claim)
            suspicious_patterns = self._detect_patterns(claim)
            detection_rules = self._apply_detection_rules(claim)
            
            # Déterminer le statut initial
            if risk_level in ["critical", "high"]:
                status = "blocked"
            elif risk_level == "medium":
                status = "investigating"
            else:
                status = "pending"
            
            db_claim = FraudInsuranceClaim(
                claim_id=claim_id,
                **claim.dict(),
                risk_score=risk_score,
                risk_level=risk_level,
                fraud_probability=fraud_probability,
                fraud_indicators=fraud_indicators,
                suspicious_patterns=suspicious_patterns,
                detection_rules=detection_rules,
                status=status,
                analyzed_by_id=current_user.id
            )
            
            self.db.add(db_claim)
            self.db.commit()
            self.db.refresh(db_claim)
            
            # Créer les indicateurs de fraude
            self._create_fraud_indicators(db_claim)
            
            logger.info(f"✅ Sinistre créé avec ID: {db_claim.id}")
            return db_claim
            
        except Exception as e:
            logger.error(f"❌ Erreur create_claim: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_claims(
        self,
        skip: int = 0,
        limit: int = 100,
        risk_level: Optional[str] = None,
        status: Optional[str] = None,
        claim_type: Optional[str] = None,
        company_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[FraudInsuranceClaim]:
        """Récupère les sinistres avec filtres"""
        try:
            logger.info(f"🔍 get_claims: skip={skip}, limit={limit}")
            
            query = self.db.query(FraudInsuranceClaim)
            
            if risk_level:
                query = query.filter(FraudInsuranceClaim.risk_level == risk_level)
            if status:
                query = query.filter(FraudInsuranceClaim.status == status)
            if claim_type:
                query = query.filter(FraudInsuranceClaim.claim_type == claim_type)
            if company_id:
                query = query.filter(FraudInsuranceClaim.company_id == company_id)
            if date_from:
                query = query.filter(FraudInsuranceClaim.incident_date >= date_from)
            if date_to:
                query = query.filter(FraudInsuranceClaim.incident_date <= date_to)
                
            result = query.order_by(desc(FraudInsuranceClaim.created_at)).offset(skip).limit(limit).all()
            logger.info(f"✅ {len(result)} sinistres trouvés")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur get_claims: {e}")
            traceback.print_exc()
            return []

    def get_claim(self, claim_id: int) -> Optional[FraudInsuranceClaim]:
        """Récupère un sinistre par son ID"""
        try:
            return self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.id == claim_id).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_claim: {e}")
            return None

    def get_claim_by_number(self, claim_number: str) -> Optional[FraudInsuranceClaim]:
        """Récupère un sinistre par son numéro"""
        try:
            return self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.claim_number == claim_number).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_claim_by_number: {e}")
            return None

    def update_claim(
        self,
        claim_id: int,
        update_data: FraudInsuranceClaimUpdate,
        current_user: User
    ) -> Optional[FraudInsuranceClaim]:
        """Met à jour un sinistre"""
        try:
            db_claim = self.get_claim(claim_id)
            if db_claim:
                for key, value in update_data.dict(exclude_unset=True).items():
                    setattr(db_claim, key, value)
                db_claim.analyzed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_claim)
                logger.info(f"✅ Sinistre {claim_id} mis à jour")
            return db_claim
        except Exception as e:
            logger.error(f"❌ Erreur update_claim: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    def block_claim(self, claim_id: int, reason: str, current_user: User) -> Optional[FraudInsuranceClaim]:
        """Bloque un sinistre suspect"""
        try:
            db_claim = self.get_claim(claim_id)
            if db_claim:
                db_claim.status = "blocked"
                db_claim.blocked_at = datetime.now()
                db_claim.rejection_reason = reason
                db_claim.analyzed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_claim)
                logger.info(f"✅ Sinistre {claim_id} bloqué")
            return db_claim
        except Exception as e:
            logger.error(f"❌ Erreur block_claim: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    def mark_false_positive(self, claim_id: int, notes: str, current_user: User) -> Optional[FraudInsuranceClaim]:
        """Marque un sinistre comme faux positif"""
        try:
            db_claim = self.get_claim(claim_id)
            if db_claim:
                db_claim.status = "false_positive"
                db_claim.resolved_at = datetime.now()
                db_claim.investigator_notes = notes
                db_claim.analyzed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_claim)
                logger.info(f"✅ Sinistre {claim_id} marqué faux positif")
            return db_claim
        except Exception as e:
            logger.error(f"❌ Erreur mark_false_positive: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Rules =====
    def get_rules(
        self,
        active_only: bool = False,
        claim_type: Optional[str] = None
    ) -> List[FraudInsuranceRule]:
        """Récupère les règles de détection"""
        try:
            query = self.db.query(FraudInsuranceRule).order_by(desc(FraudInsuranceRule.priority))
            
            if active_only:
                query = query.filter(FraudInsuranceRule.is_active == True)
            if claim_type and claim_type != "all":
                query = query.filter(
                    (FraudInsuranceRule.claim_type == claim_type) | (FraudInsuranceRule.claim_type == "all")
                )
                
            return query.all()
        except Exception as e:
            logger.error(f"❌ Erreur get_rules: {e}")
            traceback.print_exc()
            return []

    def create_rule(self, rule: FraudInsuranceRuleCreate, current_user: User) -> FraudInsuranceRule:
        """Crée une nouvelle règle"""
        try:
            db_rule = FraudInsuranceRule(
                **rule.dict(),
                created_by_id=current_user.id
            )
            self.db.add(db_rule)
            self.db.commit()
            self.db.refresh(db_rule)
            logger.info(f"✅ Règle {rule.rule_name} créée")
            return db_rule
        except Exception as e:
            logger.error(f"❌ Erreur create_rule: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def update_rule(self, rule_id: int, update_data: FraudInsuranceRuleUpdate) -> Optional[FraudInsuranceRule]:
        """Met à jour une règle"""
        try:
            db_rule = self.db.query(FraudInsuranceRule).filter(FraudInsuranceRule.id == rule_id).first()
            if db_rule:
                for key, value in update_data.dict(exclude_unset=True).items():
                    setattr(db_rule, key, value)
                self.db.commit()
                self.db.refresh(db_rule)
                logger.info(f"✅ Règle {rule_id} mise à jour")
            return db_rule
        except Exception as e:
            logger.error(f"❌ Erreur update_rule: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Networks =====
    def get_fraud_networks(self, skip: int = 0, limit: int = 100) -> List[FraudInsuranceNetwork]:
        """Récupère les réseaux de fraude"""
        try:
            return self.db.query(FraudInsuranceNetwork).offset(skip).limit(limit).all()
        except Exception as e:
            logger.error(f"❌ Erreur get_fraud_networks: {e}")
            traceback.print_exc()
            return []

    # ===== Dashboard Stats =====
    def get_dashboard_stats(self) -> FraudInsuranceStatsResponse:
        """Récupère les statistiques pour le dashboard"""
        try:
            total = self.db.query(FraudInsuranceClaim).count()
            blocked = self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.status == "blocked").count()
            investigating = self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.status == "investigating").count()
            false_positive = self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.status == "false_positive").count()
            
            # Montant préservé
            blocked_claims = self.db.query(FraudInsuranceClaim).filter(
                FraudInsuranceClaim.status == "blocked"
            ).all()
            amount_saved = sum(c.amount for c in blocked_claims)
            
            # Taux de suspicion
            suspicious = blocked + investigating
            suspicious_rate = (suspicious / total * 100) if total > 0 else 0
            
            # Distribution par type
            by_type = {}
            for claim_type in ["auto", "habitation", "sante"]:
                count = self.db.query(FraudInsuranceClaim).filter(
                    FraudInsuranceClaim.claim_type == claim_type
                ).count()
                by_type[claim_type] = count
            
            # Distribution par niveau de risque
            by_risk = {
                "critical": self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.risk_level == "critical").count(),
                "high": self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.risk_level == "high").count(),
                "medium": self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.risk_level == "medium").count(),
                "low": self.db.query(FraudInsuranceClaim).filter(FraudInsuranceClaim.risk_level == "low").count()
            }
            
            # Alertes récentes
            recent_claims = self.db.query(FraudInsuranceClaim).filter(
                FraudInsuranceClaim.status.in_(["blocked", "investigating"])
            ).order_by(desc(FraudInsuranceClaim.created_at)).limit(5).all()
            
            recent_alerts = []
            for claim in recent_claims:
                recent_alerts.append({
                    "id": claim.id,
                    "claim": claim.claim_number,
                    "client": claim.client_name,
                    "amount": f"{claim.amount:,.0f} €",
                    "type": claim.claim_type,
                    "risk": claim.risk_level,
                    "indicators": claim.fraud_indicators[:2],
                    "status": claim.status,
                    "time": self._format_time_ago(claim.created_at)
                })
            
            # Tendance mensuelle
            monthly = []
            for i in range(6):
                month_start = datetime.now() - timedelta(days=30*i)
                month_end = datetime.now() - timedelta(days=30*(i-1))
                count = self.db.query(FraudInsuranceClaim).filter(
                    and_(
                        FraudInsuranceClaim.incident_date >= month_start,
                        FraudInsuranceClaim.incident_date < month_end
                    )
                ).count()
                monthly.append({
                    "month": month_start.strftime("%b"),
                    "count": count
                })
            
            # Règles actives
            active_rules = self.db.query(FraudInsuranceRule).filter(FraudInsuranceRule.is_active == True).count()
            
            # Réseaux de fraude
            fraud_networks = self.db.query(FraudInsuranceNetwork).count()
            
            return FraudInsuranceStatsResponse(
                total_detected=total,
                blocked=blocked,
                investigating=investigating,
                false_positive=false_positive,
                amount_saved=amount_saved,
                suspicious_rate=round(suspicious_rate, 1),
                by_claim_type=by_type,
                by_risk_level=by_risk,
                recent_alerts=recent_alerts,
                monthly_trend=monthly,
                active_rules=active_rules,
                fraud_networks=fraud_networks
            )
        except Exception as e:
            logger.error(f"❌ Erreur get_dashboard_stats: {e}")
            traceback.print_exc()
            # Retourner des données par défaut
            return FraudInsuranceStatsResponse(
                total_detected=0,
                blocked=0,
                investigating=0,
                false_positive=0,
                amount_saved=0,
                suspicious_rate=0,
                by_claim_type={},
                by_risk_level={},
                recent_alerts=[],
                monthly_trend=[],
                active_rules=0,
                fraud_networks=0
            )

    # ===== Méthodes privées =====
    def _calculate_risk_score(self, claim: FraudInsuranceClaimCreate) -> float:
        """Calcule le score de risque (0-100)"""
        try:
            score = 0
            
            # Délai de déclaration
            delay_days = (claim.filing_date - claim.incident_date).days
            if delay_days > 30:
                score += 30
            elif delay_days > 15:
                score += 20
            elif delay_days > 7:
                score += 10
            
            # Montant anormal
            avg_amounts = {
                "auto": 5000,
                "habitation": 8000,
                "sante": 2000
            }
            avg = avg_amounts.get(claim.claim_type, 5000)
            if claim.amount > avg * 3:
                score += 40
            elif claim.amount > avg * 2:
                score += 25
            elif claim.amount > avg * 1.5:
                score += 10
            
            # Historique du client
            previous_claims = self.db.query(FraudInsuranceClaim).filter(
                FraudInsuranceClaim.client_id == claim.client_id
            ).count()
            if previous_claims > 3:
                score += 25
            elif previous_claims > 1:
                score += 10
            
            return min(score, 100)
        except Exception as e:
            logger.error(f"❌ Erreur _calculate_risk_score: {e}")
            return random.uniform(20, 80)  # Valeur par défaut

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

    def _identify_fraud_indicators(self, claim: FraudInsuranceClaimCreate) -> List[str]:
        """Identifie les indicateurs de fraude"""
        try:
            indicators = []
            
            delay_days = (claim.filing_date - claim.incident_date).days
            if delay_days > 30:
                indicators.append("déclaration_tardive")
            elif delay_days > 15:
                indicators.append("déclaration_retardée")
            
            avg_amounts = {
                "auto": 5000,
                "habitation": 8000,
                "sante": 2000
            }
            avg = avg_amounts.get(claim.claim_type, 5000)
            if claim.amount > avg * 3:
                indicators.append("montant_surévalué")
            elif claim.amount > avg * 2:
                indicators.append("montant_élevé")
            
            previous_claims = self.db.query(FraudInsuranceClaim).filter(
                FraudInsuranceClaim.client_id == claim.client_id
            ).count()
            if previous_claims > 3:
                indicators.append("sinistres_récents_multiples")
            
            return indicators
        except Exception as e:
            logger.error(f"❌ Erreur _identify_fraud_indicators: {e}")
            return []

    def _detect_patterns(self, claim: FraudInsuranceClaimCreate) -> List[str]:
        """Détecte des patterns suspects"""
        try:
            patterns = []
            
            # Vérifier les sinistres similaires récents
            similar = self.db.query(FraudInsuranceClaim).filter(
                FraudInsuranceClaim.claim_type == claim.claim_type,
                FraudInsuranceClaim.amount.between(claim.amount * 0.8, claim.amount * 1.2),
                FraudInsuranceClaim.incident_date >= datetime.now() - timedelta(days=30)
            ).count()
            
            if similar > 2:
                patterns.append("sinistres_similaires_récents")
            
            return patterns
        except Exception as e:
            logger.error(f"❌ Erreur _detect_patterns: {e}")
            return []

    def _apply_detection_rules(self, claim: FraudInsuranceClaimCreate) -> List[str]:
        """Applique les règles de détection"""
        try:
            rules_triggered = []
            active_rules = self.get_rules(active_only=True, claim_type=claim.claim_type)
            
            for rule in active_rules:
                if self._evaluate_rule(rule, claim):
                    rules_triggered.append(rule.rule_name)
            
            return rules_triggered
        except Exception as e:
            logger.error(f"❌ Erreur _apply_detection_rules: {e}")
            return []

    def _evaluate_rule(self, rule: FraudInsuranceRule, claim: FraudInsuranceClaimCreate) -> bool:
        """Évalue une règle de détection"""
        # Logique d'évaluation des règles
        # À implémenter selon vos règles spécifiques
        return random.choice([True, False])

    def _create_fraud_indicators(self, claim: FraudInsuranceClaim):
        """Crée des indicateurs de fraude détaillés"""
        try:
            for indicator in claim.fraud_indicators:
                db_indicator = FraudInsuranceIndicator(
                    claim_id=claim.id,
                    indicator_type=indicator,
                    severity=claim.risk_level,
                    description=f"Indicateur de fraude: {indicator}",
                    score=random.uniform(50, 100),
                    rule_name="auto_detection"
                )
                self.db.add(db_indicator)
            self.db.commit()
        except Exception as e:
            logger.error(f"❌ Erreur _create_fraud_indicators: {e}")
            self.db.rollback()

    def _format_time_ago(self, dt: datetime) -> str:
        """Formate le temps écoulé"""
        now = datetime.now()
        diff = now - dt
        
        if diff.days > 0:
            return f"{diff.days}j"
        elif diff.seconds > 3600:
            return f"{diff.seconds // 3600}h"
        elif diff.seconds > 60:
            return f"{diff.seconds // 60}min"
        else:
            return "maintenant"