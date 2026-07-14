# app/services/risk_scoring_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np
import random
import json
import logging
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

# ✅ Utiliser les imports depuis app.models
from app.models import (
    User,
    SaleOrder,
    PurchaseOrder,
    Invoice,
    InsurancePolicy,
    InsuranceClaimRisk,
    RiskFactor,
    RiskScoreHistory,
    RiskScoringFraudAlert,
    RiskLevel,
    PolicyStatus,
    ClaimStatus,
    FraudLevel,
    InsuranceType
)
from app.models.company import Company
from app.schemas.risk_scoring import (
    InsurancePolicyCreate,
    InsurancePolicyUpdate,
    InsuranceClaimCreate,
    RiskFactorCreate,
    RiskScoreHistoryResponse,
    RiskStatsResponse
)

logger = logging.getLogger(__name__)

class RiskScoringService:
    """Service de scoring des risques avec IA - Version complète"""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_model = None
        self.fraud_model = None
        self.scaler = StandardScaler()
        self.models_loaded = False
        self.load_or_create_models()
    
    # ============================================
    # MODÈLES IA
    # ============================================
    
    def load_or_create_models(self):
        """Charge ou crée les modèles IA"""
        try:
            models_path = 'app/models/saved/'
            os.makedirs(models_path, exist_ok=True)
            
            risk_model_path = f'{models_path}risk_scoring_rf.pkl'
            fraud_model_path = f'{models_path}fraud_detection_gb.pkl'
            scaler_path = f'{models_path}risk_scaler.pkl'
            
            if all(os.path.exists(p) for p in [risk_model_path, fraud_model_path, scaler_path]):
                self.ai_model = joblib.load(risk_model_path)
                self.fraud_model = joblib.load(fraud_model_path)
                self.scaler = joblib.load(scaler_path)
                self.models_loaded = True
                logger.info("✅ Modèles IA Risk Scoring chargés")
            else:
                self.create_and_train_models()
                
        except Exception as e:
            logger.error(f"⚠️ Erreur chargement modèles IA: {e}")
            self.create_and_train_models()
    
    def create_and_train_models(self):
        """Crée et entraîne les modèles IA avec données synthétiques"""
        try:
            np.random.seed(42)
            n_samples = 10000
            
            # Générer des données d'entraînement
            X, y_risk, y_fraud = self._generate_training_data(n_samples)
            
            # Normaliser les données
            X_scaled = self.scaler.fit_transform(X)
            
            # Modèle de scoring des risques (Régression)
            self.ai_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=15,
                random_state=42,
                n_jobs=-1
            )
            self.ai_model.fit(X_scaled, y_risk)
            
            # Modèle de détection de fraude (Classification)
            self.fraud_model = GradientBoostingClassifier(
                n_estimators=100,
                max_depth=8,
                learning_rate=0.1,
                random_state=42
            )
            self.fraud_model.fit(X_scaled, y_fraud)
            
            # Sauvegarder les modèles
            models_path = 'app/models/saved/'
            os.makedirs(models_path, exist_ok=True)
            joblib.dump(self.ai_model, f'{models_path}risk_scoring_rf.pkl')
            joblib.dump(self.fraud_model, f'{models_path}fraud_detection_gb.pkl')
            joblib.dump(self.scaler, f'{models_path}risk_scaler.pkl')
            
            self.models_loaded = True
            logger.info(f"✅ Modèles IA Risk Scoring entraînés sur {n_samples} échantillons")
            
        except Exception as e:
            logger.error(f"❌ Erreur création modèles IA: {e}")
            self.models_loaded = False
    
    def _generate_training_data(self, n_samples: int):
        """Génère des données d'entraînement synthétiques"""
        # Features
        X = np.zeros((n_samples, 12))
        
        # 1. Âge du client (18-80)
        X[:, 0] = np.random.uniform(18, 80, n_samples)
        
        # 2. Expérience de conduite (0-50)
        X[:, 1] = np.random.uniform(0, 50, n_samples)
        
        # 3. Nombre d'infractions (0-15)
        X[:, 2] = np.random.poisson(2, n_samples)
        
        # 4. Puissance du véhicule (50-400 CV)
        X[:, 3] = np.random.uniform(50, 400, n_samples)
        
        # 5. Âge du véhicule (0-20 ans)
        X[:, 4] = np.random.uniform(0, 20, n_samples)
        
        # 6. Historique sinistres (0-10)
        X[:, 5] = np.random.poisson(1.5, n_samples)
        
        # 7. Montant sinistres (0-50000)
        X[:, 6] = np.random.uniform(0, 50000, n_samples)
        
        # 8. Valeur du bien (0-1000000)
        X[:, 7] = np.random.uniform(0, 1000000, n_samples)
        
        # 9. Zone à risque (0=faible, 1=moyen, 2=élevé)
        X[:, 8] = np.random.choice([0, 1, 2], n_samples, p=[0.4, 0.35, 0.25])
        
        # 10. Usage (0=personnel, 1=professionnel, 2=kilométrage élevé)
        X[:, 9] = np.random.choice([0, 1, 2], n_samples, p=[0.5, 0.3, 0.2])
        
        # 11. Nombre de commandes (0-100)
        X[:, 10] = np.random.poisson(10, n_samples)
        
        # 12. Montant total des commandes (0-100000)
        X[:, 11] = np.random.uniform(0, 100000, n_samples)
        
        # Calcul des scores de risque (cible)
        y_risk = (
            (X[:, 0] < 25) * 25 +  # Jeune conducteur
            (X[:, 0] > 65) * 15 +  # Conducteur âgé
            (X[:, 1] < 2) * 20 +   # Peu d'expérience
            X[:, 2] * 10 +         # Infractions
            (X[:, 3] > 200) * 15 + # Puissance élevée
            (X[:, 4] > 10) * 10 +  # Véhicule ancien
            X[:, 5] * 15 +         # Sinistres
            (X[:, 6] > 10000) * 15 + # Montant sinistres élevé
            (X[:, 7] > 500000) * 15 + # Valeur élevée
            X[:, 8] * 25 +         # Zone à risque
            X[:, 9] * 20 +         # Usage
            (X[:, 10] > 50) * 10 +  # Beaucoup de commandes
            (X[:, 11] > 50000) * 15  # Montant élevé
        )
        
        # Normaliser à 100
        y_risk = np.clip(y_risk, 0, 100)
        
        # Scores de fraude (cible)
        fraud_base = (
            (X[:, 2] > 5) * 20 +   # Infractions
            (X[:, 5] > 3) * 25 +   # Sinistres
            (X[:, 6] > 20000) * 20 + # Montant élevé
            (X[:, 8] == 2) * 15 +  # Zone à risque élevé
            (X[:, 7] > 800000) * 20 + # Valeur très élevée
            (X[:, 10] > 80) * 15 +  # Commandes anormales
            (X[:, 11] > 80000) * 20 # Montant anormal
        )
        
        y_fraud = np.clip(fraud_base + np.random.normal(0, 10, n_samples), 0, 100)
        
        return X, y_risk, y_fraud
    
    # ============================================
    # CALCUL IA DU SCORE DE RISQUE - CORRIGÉ
    # ============================================
    
    def calculate_risk_score_ai(self, policy_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calcule le score de risque avec IA"""
        try:
            # Extraire les features
            features = self._extract_features(policy_data)
            
            if self.models_loaded:
                # Normaliser
                features_scaled = self.scaler.transform([features])
                
                # Prédire le score de risque
                risk_score = self.ai_model.predict(features_scaled)[0]
                risk_score = max(0, min(100, risk_score))
                
                # Prédire le score de fraude
                fraud_score = self.fraud_model.predict_proba(features_scaled)[0][1] * 100
                fraud_score = max(0, min(100, fraud_score))
                
                # Obtenir les facteurs de risque importants
                feature_importance = self._get_feature_importance(features)
                
                # Prédiction à 12 mois
                forecast_12m = risk_score * (1 + random.uniform(-0.15, 0.15))
                forecast_12m = max(0, min(100, forecast_12m))
                
                # Prime optimale
                premium_optimization = self._calculate_optimal_premium(risk_score, policy_data)
                
                # Insights
                insights = self._generate_insights(risk_score, fraud_score, feature_importance)
                
            else:
                # Fallback: calcul manuel
                risk_score = self._calculate_risk_score_manual(policy_data)
                fraud_score = self._calculate_fraud_score_manual(policy_data)
                feature_importance = []
                forecast_12m = risk_score * 1.1
                premium_optimization = policy_data.get('premium', 500) * (1 + risk_score / 100)
                insights = {"status": "models_not_loaded", "message": "Modèles IA non disponibles"}
            
            # Déterminer le niveau de risque
            if risk_score >= 70:
                risk_level = RiskLevel.CRITICAL.value
            elif risk_score >= 50:
                risk_level = RiskLevel.HIGH.value
            elif risk_score >= 25:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value
            
            # Déterminer le niveau de fraude
            if fraud_score >= 70:
                fraud_level = FraudLevel.CRITICAL.value
            elif fraud_score >= 50:
                fraud_level = FraudLevel.HIGH.value
            elif fraud_score >= 25:
                fraud_level = FraudLevel.MEDIUM.value
            else:
                fraud_level = FraudLevel.LOW.value
            
            return {
                "risk_score": round(risk_score, 2),
                "risk_level": risk_level,
                "fraud_score": round(fraud_score, 2),
                "fraud_level": fraud_level,
                "risk_factors": feature_importance,
                "forecast_12m": round(forecast_12m, 2),
                "premium_optimization": round(premium_optimization, 2),
                "insights": insights
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur calcul IA: {e}")
            # Fallback
            risk_score = self._calculate_risk_score_manual(policy_data)
            return {
                "risk_score": risk_score,
                "risk_level": "medium",
                "fraud_score": 0,
                "fraud_level": "low",
                "risk_factors": [],
                "forecast_12m": risk_score * 1.1,
                "premium_optimization": policy_data.get('premium', 500) * 1.5,
                "insights": {"error": str(e)}
            }
    
    def _extract_features(self, data: Dict[str, Any]) -> List[float]:
        """Extrait les features pour le modèle IA"""
        return [
            float(data.get('client_age', 40)),
            float(data.get('driver_experience', 10)),
            float(data.get('infractions_count', 0)),
            float(data.get('vehicle_power', 100)),
            float(data.get('vehicle_age', 5)),
            float(data.get('claims_count', 0)),
            float(data.get('total_claims_amount', 0) / 1000),
            float(data.get('property_value', 200000) / 10000),
            float(data.get('property_risk_zone', 0)),
            float(data.get('usage_type', 0)),
            float(data.get('total_orders', 0)),
            float(data.get('total_amount', 0) / 1000)
        ]
    
    def _get_feature_importance(self, features: List[float]) -> List[Dict]:
        """Retourne l'importance des features"""
        feature_names = [
            "Âge du client",
            "Expérience de conduite",
            "Infractions",
            "Puissance du véhicule",
            "Âge du véhicule",
            "Historique sinistres",
            "Montant sinistres",
            "Valeur du bien",
            "Zone à risque",
            "Usage",
            "Activité commerciale",
            "Montant total"
        ]
        
        importance = []
        for i, name in enumerate(feature_names):
            value = features[i] if i < len(features) else 0
            # Calculer l'importance relative
            if i == 0 and value < 25:
                importance.append({"name": name, "impact": "+25", "severity": "high"})
            elif i == 0 and value > 65:
                importance.append({"name": name, "impact": "+15", "severity": "medium"})
            elif i == 1 and value < 2:
                importance.append({"name": name, "impact": "+20", "severity": "high"})
            elif i == 2 and value > 0:
                importance.append({"name": name, "impact": f"+{min(value * 10, 30)}", "severity": "medium"})
            elif i == 3 and value > 200:
                importance.append({"name": name, "impact": "+15", "severity": "medium"})
            elif i == 4 and value > 10:
                importance.append({"name": name, "impact": "+10", "severity": "medium"})
            elif i == 5 and value > 0:
                importance.append({"name": name, "impact": f"+{min(value * 15, 45)}", "severity": "high"})
            elif i == 7 and value > 50:  # >500k€
                importance.append({"name": name, "impact": "+15", "severity": "medium"})
            elif i == 8 and value > 1:  # Zone à risque
                importance.append({"name": name, "impact": "+25", "severity": "high"})
            elif i == 10 and value > 50:  # Beaucoup de commandes
                importance.append({"name": name, "impact": "+10", "severity": "medium"})
            elif i == 11 and value > 50:  # Montant élevé
                importance.append({"name": name, "impact": "+15", "severity": "medium"})
        
        return importance[:5]  # Top 5
    
    def _generate_insights(self, risk_score: float, fraud_score: float, factors: List[Dict]) -> Dict:
        """Génère des insights stratégiques"""
        insights = {
            "risk_assessment": "",
            "recommendations": [],
            "fraud_indicators": []
        }
        
        # Évaluation du risque
        if risk_score >= 70:
            insights["risk_assessment"] = "⚠️ Risque critique - Action immédiate requise"
        elif risk_score >= 50:
            insights["risk_assessment"] = "🔴 Risque élevé - Surveillance renforcée"
        elif risk_score >= 25:
            insights["risk_assessment"] = "🟡 Risque modéré - Suivi recommandé"
        else:
            insights["risk_assessment"] = "🟢 Risque faible - Accepté"
        
        # Recommandations
        if fraud_score > 50:
            insights["recommendations"].append("🚨 Investigation anti-fraude approfondie")
        if risk_score > 50:
            insights["recommendations"].append("📊 Analyse détaillée des facteurs de risque")
        if len(factors) > 0:
            insights["recommendations"].append(f"🎯 Focus sur: {', '.join([f['name'] for f in factors[:3]])}")
        
        # Indicateurs de fraude
        if fraud_score > 70:
            insights["fraud_indicators"].append("Score de fraude critique")
        if fraud_score > 50:
            insights["fraud_indicators"].append("Incohérences détectées")
        
        return insights
    
    def _calculate_optimal_premium(self, risk_score: float, policy_data: Dict[str, Any]) -> float:
        """Calcule la prime optimale"""
        base_premium = policy_data.get('premium', 500)
        risk_multiplier = 1 + (risk_score / 100)
        return base_premium * risk_multiplier
    
    def _calculate_risk_score_manual(self, data: Dict[str, Any]) -> float:
        """Calcul manuel du score de risque (fallback)"""
        score = 0
        
        # Âge
        age = data.get('client_age', 40)
        if age < 25:
            score += 25
        elif age > 65:
            score += 15
        
        # Expérience
        experience = data.get('driver_experience', 10)
        if experience < 2:
            score += 20
        
        # Infractions
        infractions = data.get('infractions_count', 0)
        score += min(infractions * 10, 30)
        
        # Sinistres
        claims = data.get('claims_count', 0)
        score += min(claims * 15, 45)
        
        # Activité commerciale
        orders = data.get('total_orders', 0)
        if orders > 50:
            score += 10
        
        return min(100, score)
    
    def _calculate_fraud_score_manual(self, data: Dict[str, Any]) -> float:
        """Calcul manuel du score de fraude (fallback)"""
        score = 0
        
        if data.get('infractions_count', 0) > 5:
            score += 20
        if data.get('claims_count', 0) > 3:
            score += 25
        if data.get('total_claims_amount', 0) > 20000:
            score += 20
        if data.get('property_value', 0) > 800000:
            score += 20
        if data.get('total_orders', 0) > 80:
            score += 15
        
        return min(100, score)
    
    # ============================================
    # CALCUL POUR UTILISATEUR
    # ============================================
    
    @staticmethod
    def calculate_user_risk_score(db: Session, user_id: int) -> Dict[str, Any]:
        """Calcule le score de risque pour un utilisateur"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"risk_score": 0, "level": "unknown"}
        
        total_orders = db.query(func.count(SaleOrder.id)).filter(
            SaleOrder.user_id == user_id
        ).scalar() or 0
        
        total_invoices = db.query(func.count(Invoice.id)).filter(
            Invoice.user_id == user_id
        ).scalar() or 0
        
        risk_score = 100 - min(100, (total_orders + total_invoices) * 2)
        
        if risk_score < 30:
            level = "high"
        elif risk_score < 60:
            level = "medium"
        else:
            level = "low"
        
        return {
            "user_id": user_id,
            "risk_score": risk_score,
            "level": level,
            "factors": {
                "total_orders": total_orders,
                "total_invoices": total_invoices
            }
        }
    
    @staticmethod
    def get_high_risk_users(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """Récupère les utilisateurs à haut risque"""
        users = db.query(User).limit(limit).all()
        high_risk_users = []
        
        for user in users:
            risk = RiskScoringService.calculate_user_risk_score(db, user.id)
            if risk["level"] == "high":
                high_risk_users.append(risk)
        
        return high_risk_users
    
    # ============================================
    # DASHBOARD - CORRIGÉ AVEC DONNÉES RÉELLES
    # ============================================
    
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques du dashboard"""
        try:
            total_policies = self.db.query(InsurancePolicy).count()
            logger.info(f"📊 Total polices en base: {total_policies}")
            
            # Statistiques par niveau de risque
            low_risk = self.db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == "low").count()
            medium_risk = self.db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == "medium").count()
            high_risk = self.db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == "high").count()
            critical_risk = self.db.query(InsurancePolicy).filter(InsurancePolicy.risk_level == "critical").count()
            
            avg_premium = self.db.query(func.avg(InsurancePolicy.premium)).scalar() or 0
            
            total_claims = self.db.query(func.sum(InsurancePolicy.total_claims_amount)).scalar() or 0
            total_premiums = self.db.query(func.sum(InsurancePolicy.premium)).scalar() or 1
            loss_ratio = (total_claims / total_premiums) * 100 if total_premiums > 0 else 0
            
            logger.info(f"✅ Dashboard: total={total_policies}, low={low_risk}, medium={medium_risk}, high={high_risk}")
            
            return {
                "total_policies": total_policies,
                "low_risk": low_risk,
                "medium_risk": medium_risk,
                "high_risk": high_risk,
                "critical_risk": critical_risk,
                "avg_premium": float(avg_premium),
                "loss_ratio": round(float(loss_ratio), 2),
                "risk_distribution": {
                    "low": low_risk,
                    "medium": medium_risk,
                    "high": high_risk,
                    "critical": critical_risk
                }
            }
        except Exception as e:
            logger.error(f"❌ Erreur dashboard stats: {e}")
            return {
                "total_policies": 0,
                "low_risk": 0,
                "medium_risk": 0,
                "high_risk": 0,
                "critical_risk": 0,
                "avg_premium": 0,
                "loss_ratio": 0,
                "risk_distribution": {"low": 0, "medium": 0, "high": 0, "critical": 0}
            }
    
    # ============================================
    # CRUD POLICES - CORRIGÉ
    # ============================================
    
    def create_policy(self, policy_data: InsurancePolicyCreate, current_user: User) -> InsurancePolicy:
        """Crée une nouvelle police avec scoring IA"""
        try:
            # Calculer le score IA
            ai_result = self.calculate_risk_score_ai(policy_data.dict())
            
            # Récupérer l'entreprise de l'utilisateur
            company_id = current_user.company_id or 1
            
            # Créer la police
            policy = InsurancePolicy(
                client_name=policy_data.client_name,
                client_age=policy_data.client_age,
                client_profession=policy_data.client_profession,
                client_email=policy_data.client_email,
                policy_type=policy_data.policy_type,
                policy_number=policy_data.policy_number,
                premium=policy_data.premium,
                coverage_amount=policy_data.coverage_amount,
                risk_score=ai_result['risk_score'],
                risk_level=ai_result['risk_level'],
                risk_factors=ai_result['risk_factors'],
                fraud_score=ai_result['fraud_score'],
                fraud_level=ai_result['fraud_level'],
                status="active",
                start_date=datetime.now(),
                end_date=datetime.now() + timedelta(days=365),
                claims_count=0,
                total_claims_amount=0,
                company_id=company_id,
                analyzed_by_id=current_user.id,
                ai_risk_forecast_12m=ai_result['forecast_12m'],
                ai_premium_optimization=ai_result['premium_optimization'],
                ai_insights=ai_result['insights'],
                last_ai_update=datetime.utcnow()
            )
            
            self.db.add(policy)
            self.db.commit()
            self.db.refresh(policy)
            
            # Enregistrer l'historique
            history = RiskScoreHistory(
                policy_id=policy.id,
                score=ai_result['risk_score'],
                level=ai_result['risk_level'],
                reason="Scoring initial IA"
            )
            self.db.add(history)
            self.db.commit()
            
            logger.info(f"✅ Police créée: {policy.policy_number} - Score: {policy.risk_score}")
            return policy
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Erreur create_policy: {e}")
            raise e
    
    def get_policies(self, skip: int = 0, limit: int = 100, risk_level: str = None,
                    policy_type: str = None, status: str = None, company_id: int = None,
                    min_score: float = None, max_score: float = None) -> List[InsurancePolicy]:
        """Récupère les polices avec filtres"""
        try:
            query = self.db.query(InsurancePolicy)
            
            if risk_level:
                query = query.filter(InsurancePolicy.risk_level == risk_level)
            if policy_type:
                query = query.filter(InsurancePolicy.policy_type == policy_type)
            if status:
                query = query.filter(InsurancePolicy.status == status)
            if company_id:
                query = query.filter(InsurancePolicy.company_id == company_id)
            if min_score is not None:
                query = query.filter(InsurancePolicy.risk_score >= min_score)
            if max_score is not None:
                query = query.filter(InsurancePolicy.risk_score <= max_score)
            
            query = query.order_by(desc(InsurancePolicy.created_at))
            policies = query.offset(skip).limit(limit).all()
            
            logger.info(f"✅ {len(policies)} polices récupérées")
            return policies
        except Exception as e:
            logger.error(f"❌ Erreur get_policies: {e}")
            return []
    
    def get_policy(self, policy_id: int) -> Optional[InsurancePolicy]:
        """Récupère une police par ID"""
        try:
            policy = self.db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id).first()
            if policy:
                logger.info(f"✅ Police trouvée: {policy.policy_number}")
            return policy
        except Exception as e:
            logger.error(f"❌ Erreur get_policy: {e}")
            return None
    
    def get_policy_by_number(self, policy_number: str) -> Optional[InsurancePolicy]:
        """Récupère une police par numéro"""
        try:
            return self.db.query(InsurancePolicy).filter(InsurancePolicy.policy_number == policy_number).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_policy_by_number: {e}")
            return None
    
    def update_policy(self, policy_id: int, update_data: InsurancePolicyUpdate, current_user: User) -> Optional[InsurancePolicy]:
        """Met à jour une police"""
        try:
            policy = self.get_policy(policy_id)
            if not policy:
                return None
            
            update_dict = update_data.dict(exclude_unset=True)
            for key, value in update_dict.items():
                setattr(policy, key, value)
            
            # Recalculer le score si nécessaire
            if 'premium' in update_dict or 'coverage_amount' in update_dict:
                policy_dict = {c.name: getattr(policy, c.name) for c in policy.__table__.columns}
                ai_result = self.calculate_risk_score_ai(policy_dict)
                policy.risk_score = ai_result['risk_score']
                policy.risk_level = ai_result['risk_level']
                policy.fraud_score = ai_result['fraud_score']
                policy.fraud_level = ai_result['fraud_level']
                policy.last_ai_update = datetime.utcnow()
                
                history = RiskScoreHistory(
                    policy_id=policy.id,
                    score=ai_result['risk_score'],
                    level=ai_result['risk_level'],
                    reason="Mise à jour des données"
                )
                self.db.add(history)
            
            self.db.commit()
            self.db.refresh(policy)
            return policy
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Erreur update_policy: {e}")
            return None
    
    # ============================================
    # CRUD SINISTRES
    # ============================================
    
    def add_claim(self, claim_data: InsuranceClaimCreate, current_user: User) -> InsuranceClaimRisk:
        """Ajoute un sinistre à une police"""
        try:
            policy = self.get_policy(claim_data.policy_id)
            if not policy:
                raise ValueError("Police non trouvée")
            
            claim = InsuranceClaimRisk(
                policy_id=claim_data.policy_id,
                claim_amount=claim_data.claim_amount,
                claim_type=claim_data.claim_type,
                description=claim_data.description,
                claim_date=claim_data.claim_date or datetime.now(),
                status="submitted"
            )
            
            self.db.add(claim)
            
            # Mettre à jour la police
            policy.claims_count = (policy.claims_count or 0) + 1
            policy.total_claims_amount = (policy.total_claims_amount or 0) + claim_data.claim_amount
            
            # Recalculer le score
            policy_dict = {c.name: getattr(policy, c.name) for c in policy.__table__.columns}
            ai_result = self.calculate_risk_score_ai(policy_dict)
            policy.risk_score = ai_result['risk_score']
            policy.risk_level = ai_result['risk_level']
            policy.fraud_score = ai_result['fraud_score']
            policy.fraud_level = ai_result['fraud_level']
            policy.last_ai_update = datetime.utcnow()
            
            history = RiskScoreHistory(
                policy_id=policy.id,
                score=ai_result['risk_score'],
                level=ai_result['risk_level'],
                reason=f"Après ajout sinistre"
            )
            self.db.add(history)
            
            self.db.commit()
            self.db.refresh(claim)
            return claim
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Erreur add_claim: {e}")
            raise e
    
    def get_claims(self, policy_id: Optional[int] = None, skip: int = 0, limit: int = 100) -> List[InsuranceClaimRisk]:
        """Récupère les sinistres"""
        try:
            query = self.db.query(InsuranceClaimRisk)
            if policy_id:
                query = query.filter(InsuranceClaimRisk.policy_id == policy_id)
            return query.order_by(desc(InsuranceClaimRisk.claim_date)).offset(skip).limit(limit).all()
        except Exception as e:
            logger.error(f"❌ Erreur get_claims: {e}")
            return []
    
    # ============================================
    # FACTEURS DE RISQUE
    # ============================================
    
    def get_risk_factors(self, active_only: bool = False) -> List[RiskFactor]:
        """Récupère les facteurs de risque"""
        try:
            query = self.db.query(RiskFactor)
            if active_only:
                query = query.filter(RiskFactor.is_active == True)
            return query.all()
        except Exception as e:
            logger.error(f"❌ Erreur get_risk_factors: {e}")
            return []
    
    def create_risk_factor(self, factor_data: RiskFactorCreate) -> RiskFactor:
        """Crée un nouveau facteur de risque"""
        try:
            factor = RiskFactor(**factor_data.dict())
            self.db.add(factor)
            self.db.commit()
            self.db.refresh(factor)
            return factor
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Erreur create_risk_factor: {e}")
            raise e
    
    # ============================================
    # HISTORIQUE
    # ============================================
    
    def get_policy_history(self, policy_id: int) -> List[RiskScoreHistory]:
        """Récupère l'historique des scores"""
        try:
            return self.db.query(RiskScoreHistory).filter(
                RiskScoreHistory.policy_id == policy_id
            ).order_by(desc(RiskScoreHistory.calculated_at)).all()
        except Exception as e:
            logger.error(f"❌ Erreur get_policy_history: {e}")
            return []
    
    # ============================================
    # ALERTES FRAUDE
    # ============================================
    
    def get_fraud_alerts(self, limit: int = 50, resolved: bool = False) -> List[RiskScoringFraudAlert]:
        """Récupère les alertes de fraude"""
        try:
            query = self.db.query(RiskScoringFraudAlert)
            if not resolved:
                query = query.filter(RiskScoringFraudAlert.resolved == False)
            return query.order_by(desc(RiskScoringFraudAlert.created_at)).limit(limit).all()
        except Exception as e:
            logger.error(f"❌ Erreur get_fraud_alerts: {e}")
            return []
    
    def create_fraud_alert(self, policy_id: int, fraud_score: float, 
                          detection_method: str, indicators: List[str]) -> RiskScoringFraudAlert:
        """Crée une alerte de fraude"""
        try:
            policy = self.get_policy(policy_id)
            if not policy:
                raise ValueError("Police non trouvée")
            
            if fraud_score >= 70:
                fraud_level = "critical"
            elif fraud_score >= 50:
                fraud_level = "high"
            elif fraud_score >= 25:
                fraud_level = "medium"
            else:
                fraud_level = "low"
            
            alert = RiskScoringFraudAlert(
                policy_id=policy_id,
                client_name=policy.client_name,
                company_id=policy.company_id,
                fraud_score=fraud_score,
                fraud_level=fraud_level,
                detection_method=detection_method,
                indicators=indicators,
                techniques_used=[detection_method, "IA Scoring"],
                recommendation=f"Investigation recommandée - Score: {fraud_score}%",
                resolved=False
            )
            
            self.db.add(alert)
            self.db.commit()
            self.db.refresh(alert)
            return alert
        except Exception as e:
            self.db.rollback()
            logger.error(f"❌ Erreur create_fraud_alert: {e}")
            raise e

logger.info("✅ RiskScoringService initialisé avec IA")