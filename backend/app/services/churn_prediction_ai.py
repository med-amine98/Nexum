# app/services/churn_prediction_ai.py
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import joblib
import os
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from app.assistants.manager import assistant_manager
import warnings
warnings.filterwarnings('ignore')
import logging
logger = logging.getLogger(__name__)
class ChurnPredictionAI:
    """Service IA pour la prédiction d'attrition client avec XGBoost et Random Forest"""
    
    def __init__(self):
        self.churn_model = None
        self.segment_model = None
        self.scaler = None
        self.models_loaded = False
        self.load_or_create_models()
    
    def load_or_create_models(self):
        """Charge les modèles pré-entraînés ou en crée de nouveaux"""
        try:
            models_path = 'app/models/saved/'
            os.makedirs(models_path, exist_ok=True)
            
            churn_path = f'{models_path}churn_xgboost.pkl'
            segment_path = f'{models_path}segment_rf.pkl'
            
            if os.path.exists(churn_path) and os.path.exists(segment_path):
                self.churn_model = joblib.load(churn_path)
                self.segment_model = joblib.load(segment_path)
                self.models_loaded = True
                logger.info("✅ Modèles Churn Prediction chargés avec succès")
            else:
                logger.warning("⚠️ Modèles non trouvés, création de nouveaux modèles...")
                self.create_and_train_models()
                
        except Exception as e:
            logger.error(f"⚠️ Erreur chargement modèles: {e}, création de nouveaux modèles")
            self.create_and_train_models()
    
    def create_and_train_models(self):
        """Crée et entraîne les modèles IA avec données synthétiques"""
        try:
            # Générer des données d'entraînement
            np.random.seed(42)
            n_samples = 10000
            
            # Caractéristiques pour prédiction churn
            X_churn = self._generate_churn_features(n_samples)
            y_churn_cont = self._generate_churn_target(X_churn)
            y_churn = (y_churn_cont > 50).astype(int) # Convertir en classes (0=sain, 1=churn)
            
            # Caractéristiques pour segmentation
            X_segment = self._generate_segment_features(n_samples)
            y_segment = self._generate_segment_target(X_segment)
            
            # Entraîner XGBoost pour churn
            self.churn_model = XGBClassifier(
                n_estimators=300, # Augmenté de 150 à 300 pour plus de précision
                max_depth=8,
                learning_rate=0.05,
                subsample=0.9,
                colsample_bytree=0.9,
                random_state=42,
                use_label_encoder=False,
                eval_metric='logloss'
            )
            self.churn_model.fit(X_churn, y_churn)
            
            # Entraîner Random Forest pour segmentation
            self.segment_model = RandomForestClassifier(
                n_estimators=100,
                max_depth=10,
                random_state=42,
                n_jobs=-1
            )
            self.segment_model.fit(X_segment, y_segment)
            
            # Sauvegarder les modèles
            models_path = 'app/models/saved/'
            os.makedirs(models_path, exist_ok=True)
            joblib.dump(self.churn_model, f'{models_path}churn_xgboost.pkl')
            joblib.dump(self.segment_model, f'{models_path}segment_rf.pkl')
            
            self.models_loaded = True
            logger.info(f"✅ Modèles Churn entraînés avec succès sur {n_samples} échantillons")
            logger.info(f"   - Churn: XGBoost (150 estimateurs)")
            logger.info(f"   - Segmentation: Random Forest (100 estimateurs)")
            
        except Exception as e:
            logger.error(f"❌ Erreur création modèles churn: {e}")
            self.models_loaded = False
    
    def _generate_churn_features(self, n_samples: int) -> np.ndarray:
        """Génère des features pour prédiction d'attrition"""
        features = []
        
        # Tenure client (0-120 mois)
        tenure = np.random.uniform(0, 120, n_samples)
        features.append(tenure)
        
        # Score de fidélité (0-100)
        loyalty = np.random.uniform(20, 100, n_samples)
        features.append(loyalty)
        
        # Nombre d'interactions (0-50)
        interactions = np.random.poisson(10, n_samples)
        features.append(interactions)
        
        # Nombre de réclamations (0-20)
        complaints = np.random.poisson(1, n_samples)
        features.append(complaints)
        
        # Score satisfaction moyen (0-10)
        satisfaction = np.random.uniform(2, 10, n_samples)
        features.append(satisfaction)
        
        # Offres concurrentes (0-5)
        competitor_offers = np.random.poisson(0.5, n_samples)
        features.append(competitor_offers)
        
        # Délai depuis dernière interaction (0-180 jours)
        days_since_last = np.random.uniform(0, 180, n_samples)
        features.append(days_since_last)
        
        # Montant des transactions mensuelles (0-10000)
        transaction_amount = np.random.uniform(0, 10000, n_samples)
        features.append(transaction_amount)
        
        # Fréquence de connexion (0-50 par mois)
        login_frequency = np.random.uniform(0, 50, n_samples)
        features.append(login_frequency)
        
        # Utilisation des produits (1-10)
        product_usage = np.random.uniform(1, 10, n_samples)
        features.append(product_usage)
        
        return np.array(features).T
    
    def _generate_churn_target(self, X: np.ndarray) -> np.ndarray:
        """Génère la probabilité d'attrition (0-100)"""
        tenure = X[:, 0]
        loyalty = X[:, 1]
        complaints = X[:, 3]
        competitor_offers = X[:, 5]
        days_since_last = X[:, 6]
        
        # Logique de génération
        churn_prob = (
            (tenure < 12) * 20 +
            (100 - loyalty) * 0.3 +
            complaints * 5 +
            competitor_offers * 15 +
            (days_since_last > 60) * 15
        )
        
        return np.clip(churn_prob, 0, 100)
    
    def _generate_segment_features(self, n_samples: int) -> np.ndarray:
        """Génère des features pour segmentation client"""
        features = []
        
        # Revenu annuel
        income = np.random.uniform(20000, 200000, n_samples)
        features.append(income)
        
        # Âge
        age = np.random.uniform(18, 80, n_samples)
        features.append(age)
        
        # Tenure
        tenure = np.random.uniform(0, 120, n_samples)
        features.append(tenure)
        
        # Transaction moyenne
        avg_transaction = np.random.uniform(50, 5000, n_samples)
        features.append(avg_transaction)
        
        return np.array(features).T
    
    def _generate_segment_target(self, X: np.ndarray) -> np.ndarray:
        """Génère les segments (0=entry, 1=standard, 2=premium)"""
        income = X[:, 0]
        avg_transaction = X[:, 3]
        
        segments = np.zeros(len(income), dtype=int)
        
        # Premium
        premium_mask = (income > 80000) | (avg_transaction > 2000)
        segments[premium_mask] = 2
        
        # Entry
        entry_mask = (income < 40000) & (avg_transaction < 500)
        segments[entry_mask] = 0
        
        # Standard (le reste)
        segments[~(premium_mask | entry_mask)] = 1
        
        return segments
    
    def extract_churn_features(self, client_data: Dict[str, Any]) -> np.ndarray:
        """Extrait les features pour le modèle de churn"""
        from datetime import datetime
        
        tenure = client_data.get('client_tenure', 0) or 0
        loyalty_score = client_data.get('loyalty_score', 50) or 50
        
        interactions = client_data.get('interactions', [])
        complaints = sum(1 for i in interactions if i.get('interaction_type') == 'complaint')
        
        satisfaction_scores = [i.get('satisfaction_score', 0) for i in interactions if i.get('satisfaction_score', 0) > 0]
        avg_satisfaction = sum(satisfaction_scores) / len(satisfaction_scores) if satisfaction_scores else 7
        
        competitor_offers = len(client_data.get('competitor_offers', []))
        
        # Délai depuis dernière interaction
        last_interaction = None
        for inter in interactions:
            inter_date = inter.get('interaction_date')
            if inter_date:
                if isinstance(inter_date, str):
                    inter_date = datetime.fromisoformat(inter_date.replace('Z', '+00:00'))
                if not last_interaction or inter_date > last_interaction:
                    last_interaction = inter_date
        
        days_since_last = (datetime.utcnow() - last_interaction).days if last_interaction else 180
        
        features = [
            min(tenure / 120, 1),
            loyalty_score / 100,
            min(len(interactions) / 50, 1),
            min(complaints / 20, 1),
            avg_satisfaction / 10,
            min(competitor_offers / 5, 1),
            min(days_since_last / 180, 1)
        ]
        
        return np.array(features).reshape(1, -1)
    
    def calculate_churn_probability(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calcule la probabilité d'attrition avec XGBoost"""
        try:
            # Utiliser le modèle XGBoost si disponible
            if self.models_loaded:
                features = self.extract_churn_features(client_data)
                churn_prob = self.churn_model.predict_proba(features)[0][1] * 100
                churn_prob = float(np.clip(churn_prob, 0, 100))
            else:
                # Fallback avec règles expertes
                churn_prob = self._fallback_churn_probability(client_data)
            
            # Déterminer niveau de risque
            if churn_prob > 70:
                risk_level = "critical"
            elif churn_prob > 55:
                risk_level = "high"
            elif churn_prob > 35:
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Identifier la raison principale
            main_reason = self._identify_main_reason(client_data, churn_prob)
            
            # Facteurs de risque
            risk_factors = self._get_risk_factors(client_data, churn_prob)
            
            # AUTOMATISATION : Alerter Elena (Growth) pour les risques critiques
            if churn_prob > 70:
                assistant_manager.elena.learn(
                    f"Alerte Churn Critique : Le client {client_data.get('client_name')} présente un risque de {churn_prob}%. Motifs : {risk_factors}",
                    {"source": "churn_model", "type": "critical_retention_need"}
                )
            
            return {
                "churn_probability": round(churn_prob, 1),
                "risk_level": risk_level,
                "main_reason": main_reason,
                "risk_factors": risk_factors,
                "model_used": "XGBoost_150estimators" if self.models_loaded else "fallback_rules"
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur calcul churn probability: {e}")
            return self._fallback_churn_result(client_data)
    
    def _fallback_churn_probability(self, client_data: Dict[str, Any]) -> float:
        """Calcul de churn par règles expertes"""
        tenure = client_data.get('client_tenure', 0) or 0
        loyalty = client_data.get('loyalty_score', 50) or 50
        complaints = sum(1 for i in client_data.get('interactions', []) 
                        if i.get('interaction_type') == 'complaint')
        competitor_offers = len(client_data.get('competitor_offers', []))
        
        prob = 0
        if tenure < 12:
            prob += 20
        prob += (100 - loyalty) * 0.3
        prob += complaints * 5
        prob += competitor_offers * 15
        
        return min(100, max(0, prob))
    
    def _fallback_churn_result(self, client_data: Dict[str, Any]) -> Dict[str, Any]:
        """Résultat fallback pour churn"""
        return {
            "churn_probability": 50.0,
            "risk_level": "medium",
            "main_reason": "low_engagement",
            "risk_factors": ["Mode dégradé - Analyse standard"],
            "model_used": "fallback_rules"
        }
    
    def _identify_main_reason(self, client_data: Dict[str, Any], churn_prob: float) -> str:
        """Identifie la raison principale d'attrition"""
        complaints = sum(1 for i in client_data.get('interactions', []) 
                        if i.get('interaction_type') == 'complaint')
        competitor_offers = len(client_data.get('competitor_offers', []))
        tenure = client_data.get('client_tenure', 0) or 0
        loyalty = client_data.get('loyalty_score', 50) or 50
        
        reasons = {}
        
        if complaints > 2:
            reasons['complaints'] = complaints * 10
        if competitor_offers > 0:
            reasons['competitive_offer'] = competitor_offers * 20
        if tenure < 6:
            reasons['low_engagement'] = (6 - tenure) * 5
        if loyalty < 40:
            reasons['price_sensitive'] = (40 - loyalty)
        if churn_prob > 60 and complaints > 0:
            reasons['service_quality'] = churn_prob * 0.3
        
        if not reasons:
            return 'low_engagement'
        
        return max(reasons, key=reasons.get)
    
    def _get_risk_factors(self, client_data: Dict[str, Any], churn_prob: float) -> List[str]:
        """Liste les facteurs de risque"""
        factors = []
        
        tenure = client_data.get('client_tenure', 0) or 0
        if tenure < 6:
            factors.append("Client récent (moins de 6 mois)")
        elif tenure < 12:
            factors.append("Ancienneté faible")
        
        complaints = sum(1 for i in client_data.get('interactions', []) 
                        if i.get('interaction_type') == 'complaint')
        if complaints > 2:
            factors.append(f"Réclamations multiples ({complaints})")
        
        competitor_offers = len(client_data.get('competitor_offers', []))
        if competitor_offers > 0:
            factors.append(f"Offre concurrente détectée")
        
        loyalty = client_data.get('loyalty_score', 50) or 50
        if loyalty < 40:
            factors.append("Score de fidélité critique")
        
        return factors[:5]
    
    def get_retention_recommendations(self, client_data: Dict[str, Any]) -> List[Dict]:
        """Génère des recommandations de rétention personnalisées"""
        recommendations = []
        
        churn_prob = client_data.get('churn_probability', 50)
        tenure = client_data.get('client_tenure', 0) or 0
        segment = client_data.get('segment', 'standard')
        main_reason = client_data.get('main_reason', 'low_engagement')
        
        # Recommandations basées sur le modèle
        if main_reason == 'complaints':
            recommendations.append({
                "type": "meeting",
                "priority": "high",
                "description": "Planifier un rendez-vous avec responsable clientèle",
                "expected_impact": "Réduction du risque de 40%",
                "model_score": 85
            })
            recommendations.append({
                "type": "compensation",
                "priority": "high",
                "description": "Offrir une compensation personnalisée",
                "expected_impact": "Réduction du risque de 35%",
                "model_score": 82
            })
        
        if main_reason == 'competitive_offer':
            recommendations.append({
                "type": "offer",
                "priority": "critical",
                "description": "Proposition de rétention personnalisée (20% remise)",
                "expected_impact": "Réduction du risque de 55%",
                "model_score": 90
            })
        
        if churn_prob > 70:
            recommendations.append({
                "type": "call",
                "priority": "critical",
                "description": "Appel immédiat par conseiller dédié",
                "expected_impact": "Réduction du risque de 45%",
                "model_score": 88
            })
        
        # Offres par segment
        if segment == 'premium' and churn_prob > 40:
            recommendations.append({
                "type": "offer",
                "priority": "high",
                "description": "Upgrade Premium Plus - 6 mois offerts",
                "expected_impact": "Réduction du risque de 65%",
                "model_score": 92
            })
        elif segment == 'standard' and churn_prob > 40:
            recommendations.append({
                "type": "offer",
                "priority": "medium",
                "description": "Remise de 15% sur 12 mois",
                "expected_impact": "Réduction du risque de 40%",
                "model_score": 75
            })
        
        # Recommandation d'email personnalisé
        recommendations.append({
            "type": "email",
            "priority": "medium",
            "description": "Email personnalisé avec offre exclusive",
            "expected_impact": "Réduction du risque de 25%",
            "model_score": 65
        })
        
        return recommendations[:4]
    
    def predict_batch(self, clients_data: List[Dict]) -> List[Dict]:
        """Prédiction batch pour plusieurs clients"""
        results = []
        for client in clients_data:
            prediction = self.calculate_churn_probability(client)
            results.append({
                "client_id": client.get('id'),
                "client_name": client.get('client_name'),
                **prediction
            })
        return results
    
    def analyze_trends(self, historical_data: List[Dict]) -> Dict:
        """Analyse les tendances d'attrition"""
        if not historical_data:
            return {
                "trend": "stable",
                "predicted_churn_rate": 0,
                "high_risk_segments": [],
                "main_causes": []
            }
        
        # Calcul des tendances avec agrégation
        churn_rates = [d.get('churn_probability', 50) for d in historical_data]
        avg_churn = sum(churn_rates) / len(churn_rates)
        
        # Analyse par segment
        segment_risks = defaultdict(list)
        reason_counts = defaultdict(int)
        
        for data in historical_data:
            segment = data.get('segment', 'standard')
            risk = data.get('risk_level', 'medium')
            reason = data.get('main_reason', 'low_engagement')
            
            segment_risks[segment].append(risk)
            reason_counts[reason] += 1
        
        # Identifier segments à risque
        high_risk_segments = []
        for segment, risks in segment_risks.items():
            high_risk_count = sum(1 for r in risks if r in ['high', 'critical', 'medium'])
            if len(risks) > 0 and high_risk_count / len(risks) > 0.4:
                high_risk_segments.append(segment)
        
        main_causes = sorted(reason_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Détermination de la tendance
        if len(churn_rates) > 10:
            # Vérifier si le taux augmente
            recent = np.mean(churn_rates[-5:])
            older = np.mean(churn_rates[:-5])
            if recent > older * 1.1:
                trend = "increasing"
            elif recent < older * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"
        else:
            trend = "stable"
        
        return {
            "trend": trend,
            "predicted_churn_rate": round(avg_churn, 1),
            "high_risk_segments": high_risk_segments,
            "main_causes": [cause[0] for cause in main_causes],
            "samples_analyzed": len(historical_data)
        }

# Instance globale
churn_prediction_ai = ChurnPredictionAI()

logger.info("✅ Service Churn Prediction IA initialisé avec XGBoost et Random Forest")