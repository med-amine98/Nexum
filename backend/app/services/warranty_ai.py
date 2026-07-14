# app/services/warranty_ai.py
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import joblib
import os
import logging
import json

logger = logging.getLogger(__name__)

class WarrantyAIEngine:
    """Moteur IA pour les recommandations de garanties avec entraînement réel"""
    
    def __init__(self, model_path: str = "models/warranty_ai/"):
        self.model_path = model_path
        self.risk_model = None
        self.price_model = None
        self.cluster_model = None
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.training_stats = {}
        
        # Créer le dossier des modèles
        os.makedirs(model_path, exist_ok=True)
        
    def prepare_features(self, client_data: Dict) -> np.ndarray:
        """Préparer les features pour l'IA"""
        features = []
        
        # Features démographiques
        features.append(client_data.get('age', 35))
        features.append(client_data.get('annual_income', 50000))
        features.append(client_data.get('credit_score', 700))
        features.append(client_data.get('family_size', 1))
        
        # Features comportementales
        features.append(client_data.get('previous_claims', 0))
        features.append(client_data.get('claims_amount', 0))
        features.append(client_data.get('years_as_customer', 1))
        
        # Features binaires
        features.append(1 if client_data.get('has_home', False) else 0)
        features.append(1 if client_data.get('has_car', False) else 0)
        features.append(1 if client_data.get('has_dependents', False) else 0)
        features.append(1 if client_data.get('is_homeowner', False) else 0)
        
        # Features financières
        features.append(client_data.get('monthly_savings', 500))
        features.append(client_data.get('avg_transaction_amount', 100))
        features.append(client_data.get('account_balance', 5000))
        
        # Features d'historique
        features.append(client_data.get('previous_subscriptions', 0))
        features.append(client_data.get('cancellation_rate', 0))
        
        return np.array(features).reshape(1, -1)
    
    def train_from_database(self, db: Session):
        """Entraîner les modèles à partir des données réelles de la base"""
        try:
            from app.models.warranty import ClientProfile, WarrantySubscription, Warranty, WarrantyClaim
            from app.models.banking import Client, Transaction
            
            logger.info("Début de l'entraînement du modèle IA...")
            
            # 1. Récupérer les données clients
            clients_data = []
            
            profiles = db.query(ClientProfile).all()
            
            for profile in profiles:
                client = db.query(Client).filter(Client.id == profile.client_id).first()
                if not client:
                    continue
                
                # Récupérer les souscriptions
                subscriptions = db.query(WarrantySubscription).filter(
                    WarrantySubscription.client_id == profile.client_id
                ).all()
                
                # Récupérer les sinistres
                claims = db.query(WarrantyClaim).join(WarrantySubscription).filter(
                    WarrantySubscription.client_id == profile.client_id
                ).all()
                
                # Calculer les métriques
                total_claims = len(claims)
                total_claims_amount = sum(c.amount for c in claims)
                
                # Transactions récentes
                one_year_ago = datetime.now() - timedelta(days=365)
                transactions = db.query(Transaction).filter(
                    Transaction.client_id == profile.client_id,
                    Transaction.created_at >= one_year_ago
                ).all()
                
                avg_transaction = sum(t.amount for t in transactions) / len(transactions) if transactions else 0
                
                # Préparer les données
                client_data = {
                    'age': getattr(client, 'age', profile.age or 35),
                    'annual_income': profile.annual_income or 50000,
                    'credit_score': getattr(client, 'credit_score', 700),
                    'family_size': 1 + (1 if profile.has_dependents else 0),
                    'previous_claims': total_claims,
                    'claims_amount': total_claims_amount,
                    'years_as_customer': (datetime.now() - client.created_at).days / 365 if client.created_at else 1,
                    'has_home': profile.has_home,
                    'has_car': profile.has_car,
                    'has_dependents': profile.has_dependents,
                    'is_homeowner': getattr(client, 'is_homeowner', False),
                    'monthly_savings': getattr(client, 'monthly_savings', 500),
                    'avg_transaction_amount': avg_transaction,
                    'account_balance': getattr(client, 'balance', 5000),
                    'previous_subscriptions': len(subscriptions),
                    'cancellation_rate': sum(1 for s in subscriptions if s.status == 'cancelled') / len(subscriptions) if subscriptions else 0,
                    'risk_score_target': profile.risk_score,
                    'premium_target': sum(s.price_paid for s in subscriptions) / len(subscriptions) if subscriptions else profile.budget_monthly
                }
                
                clients_data.append(client_data)
            
            if len(clients_data) < 10:
                logger.warning(f"Données insuffisantes pour l'entraînement: {len(clients_data)} clients")
                self._initialize_fallback_models()
                return
            
            # 2. Préparer les features et targets
            X = []
            y_risk = []
            y_premium = []
            
            for data in clients_data:
                features = [
                    data['age'], data['annual_income'], data['credit_score'], data['family_size'],
                    data['previous_claims'], data['claims_amount'], data['years_as_customer'],
                    data['has_home'], data['has_car'], data['has_dependents'], data['is_homeowner'],
                    data['monthly_savings'], data['avg_transaction_amount'], data['account_balance'],
                    data['previous_subscriptions'], data['cancellation_rate']
                ]
                X.append(features)
                y_risk.append(data['risk_score_target'])
                y_premium.append(data['premium_target'])
            
            # 3. Normaliser les données
            X_scaled = self.scaler.fit_transform(X)
            
            # 4. Entraîner le modèle de risque
            self.risk_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            self.risk_model.fit(X_scaled, y_risk)
            
            # 5. Entraîner le modèle de prix
            self.price_model = RandomForestRegressor(
                n_estimators=100,
                max_depth=8,
                random_state=42,
                n_jobs=-1
            )
            self.price_model.fit(X_scaled, y_premium)
            
            # 6. Clustering des comportements
            self.cluster_model = KMeans(n_clusters=4, random_state=42, n_init=10)
            self.cluster_model.fit(X_scaled)
            
            # 7. Évaluer les modèles
            X_train, X_test, y_risk_train, y_risk_test = train_test_split(X_scaled, y_risk, test_size=0.2, random_state=42)
            risk_accuracy = self.risk_model.score(X_test, y_risk_test)
            
            self.is_trained = True
            self.training_stats = {
                'samples_count': len(clients_data),
                'risk_model_accuracy': float(risk_accuracy),
                'features_count': len(features),
                'training_date': datetime.now().isoformat()
            }
            
            # 8. Sauvegarder les modèles
            self._save_models()
            
            logger.info(f"✅ Modèles entraînés avec succès! Précision: {risk_accuracy:.2%} sur {len(clients_data)} clients")
            
        except Exception as e:
            logger.error(f"Erreur lors de l'entraînement: {e}")
            self._initialize_fallback_models()
    
    def _initialize_fallback_models(self):
        """Initialiser des modèles de fallback basés sur des règles expertes"""
        self.is_trained = False
        logger.warning("Utilisation des modèles de fallback (règles expertes)")
    
    def _save_models(self):
        """Sauvegarder les modèles entraînés"""
        try:
            joblib.dump(self.risk_model, os.path.join(self.model_path, 'risk_model.pkl'))
            joblib.dump(self.price_model, os.path.join(self.model_path, 'price_model.pkl'))
            joblib.dump(self.cluster_model, os.path.join(self.model_path, 'cluster_model.pkl'))
            joblib.dump(self.scaler, os.path.join(self.model_path, 'scaler.pkl'))
            joblib.dump(self.training_stats, os.path.join(self.model_path, 'training_stats.json'))
            logger.info("Modèles sauvegardés avec succès")
        except Exception as e:
            logger.error(f"Erreur sauvegarde: {e}")
    
    def load_models(self):
        """Charger les modèles sauvegardés"""
        try:
            risk_path = os.path.join(self.model_path, 'risk_model.pkl')
            if os.path.exists(risk_path):
                self.risk_model = joblib.load(risk_path)
                self.price_model = joblib.load(os.path.join(self.model_path, 'price_model.pkl'))
                self.cluster_model = joblib.load(os.path.join(self.model_path, 'cluster_model.pkl'))
                self.scaler = joblib.load(os.path.join(self.model_path, 'scaler.pkl'))
                self.training_stats = joblib.load(os.path.join(self.model_path, 'training_stats.json'))
                self.is_trained = True
                logger.info("Modèles chargés avec succès")
                return True
        except Exception as e:
            logger.error(f"Erreur chargement modèles: {e}")
        return False
    
    def predict_risk_score(self, client_data: Dict) -> Dict[str, Any]:
        """Prédire le score de risque personnalisé"""
        features = self.prepare_features(client_data)
        
        if self.is_trained and self.risk_model:
            features_scaled = self.scaler.transform(features)
            risk_score = self.risk_model.predict(features_scaled)[0]
            confidence = self._calculate_confidence(features_scaled)
        else:
            # Règles expertes
            risk_score = self._expert_risk_rule(client_data)
            confidence = 65
        
        # Déterminer le niveau de risque
        if risk_score < 30:
            risk_level = "low"
            risk_label = "Client Premium"
        elif risk_score < 60:
            risk_level = "medium"
            risk_label = "Client Standard"
        else:
            risk_level = "high"
            risk_label = "Client à surveiller"
        
        return {
            'score': round(float(risk_score), 1),
            'level': risk_level,
            'label': risk_label,
            'confidence': round(confidence, 1),
            'factors': self._get_risk_factors(client_data, risk_score)
        }
    
    def _expert_risk_rule(self, client_data: Dict) -> float:
        """Règles expertes pour le calcul du risque (fallback)"""
        risk = 50
        
        if client_data.get('age', 35) < 30:
            risk += 15
        elif client_data.get('age', 35) > 60:
            risk += 10
            
        if client_data.get('annual_income', 50000) < 30000:
            risk += 20
        elif client_data.get('annual_income', 50000) > 100000:
            risk -= 15
            
        if client_data.get('credit_score', 700) < 600:
            risk += 25
        elif client_data.get('credit_score', 700) > 750:
            risk -= 15
            
        risk += client_data.get('previous_claims', 0) * 10
        
        return max(0, min(100, risk))
    
    def predict_price(self, warranty, client_data: Dict) -> float:
        """Prédire le prix personnalisé pour une garantie"""
        features = self.prepare_features(client_data)
        
        if self.is_trained and self.price_model:
            features_scaled = self.scaler.transform(features)
            base_price = self.price_model.predict(features_scaled)[0]
        else:
            base_price = warranty.monthly_price
        
        # Ajustements personnalisés
        if client_data.get('years_as_customer', 0) > 3:
            base_price *= 0.9  # -10% fidélité
        
        if client_data.get('previous_subscriptions', 0) > 2:
            base_price *= 0.85  # -15% multi-contrats
        
        risk_score = self.predict_risk_score(client_data)['score']
        if risk_score < 30:
            base_price *= 0.85  # -15% faible risque
        elif risk_score > 70:
            base_price *= 1.2   # +20% risque élevé
        
        return round(base_price, 2)
    
    def calculate_warranty_score(self, warranty, client_data: Dict, db: Session = None) -> Dict[str, Any]:
        """Calculer le score de pertinence pour une garantie"""
        
        # Score de base
        score = 50
        
        # 1. Pertinence par type (basée sur le profil)
        type_multipliers = {
            'home': 1.3 if client_data.get('has_home') else 0.7,
            'car': 1.4 if client_data.get('has_car') else 0.7,
            'health': 1.5 if client_data.get('has_dependents') else 1.0,
            'life': 1.2 if client_data.get('age', 35) > 40 else 0.8,
            'travel': 1.1,
            'electronics': 1.0
        }
        
        warranty_type = warranty.type.value if hasattr(warranty.type, 'value') else str(warranty.type)
        multiplier = type_multipliers.get(warranty_type, 1.0)
        score *= multiplier
        
        # 2. Score de risque personnalisé
        risk_info = self.predict_risk_score(client_data)
        if risk_info['level'] == 'low':
            score += 15
        elif risk_info['level'] == 'high':
            score -= 20
        
        # 3. Budget
        monthly_budget = client_data.get('monthly_savings', 500) * 0.3
        predicted_price = self.predict_price(warranty, client_data)
        
        if predicted_price <= monthly_budget:
            score += 20
        elif predicted_price <= monthly_budget * 1.3:
            score += 10
        else:
            score -= 15
        
        # 4. Historique de souscriptions similaires
        if db:
            similar_score = self._get_similar_users_score(warranty, client_data, db)
            score += similar_score * 0.2
        
        # 5. Saisonnalité
        if self._is_seasonal(warranty_type):
            score += 10
        
        # Normaliser entre 0 et 100
        final_score = max(0, min(100, score))
        
        return {
            'score': round(final_score, 1),
            'level': 'high' if final_score > 75 else 'medium' if final_score > 50 else 'low',
            'is_recommended': final_score > 70,
            'price': predicted_price,
            'reasons': self._get_recommendation_reasons(warranty, client_data, final_score)
        }
    
    def _get_similar_users_score(self, warranty, client_data: Dict, db: Session) -> float:
        """Score basé sur les utilisateurs similaires"""
        try:
            from app.models.warranty import ClientProfile, WarrantySubscription
            
            # Trouver profils similaires
            age_range = (client_data.get('age', 35) - 5, client_data.get('age', 35) + 5)
            income_range = (client_data.get('annual_income', 50000) * 0.8, client_data.get('annual_income', 50000) * 1.2)
            
            similar_profiles = db.query(ClientProfile).filter(
                ClientProfile.age.between(age_range[0], age_range[1]),
                ClientProfile.annual_income.between(income_range[0], income_range[1])
            ).limit(50).all()
            
            if not similar_profiles:
                return 50
            
            # Compter les souscriptions
            subscribed = 0
            for profile in similar_profiles:
                sub = db.query(WarrantySubscription).filter(
                    WarrantySubscription.client_id == profile.client_id,
                    WarrantySubscription.warranty_id == warranty.id
                ).first()
                if sub:
                    subscribed += 1
            
            return (subscribed / len(similar_profiles)) * 100
            
        except Exception as e:
            logger.error(f"Erreur similar users: {e}")
            return 50
    
    def _is_seasonal(self, warranty_type: str) -> bool:
        """Vérifier la pertinence saisonnière"""
        current_month = datetime.now().month
        seasonal = {
            'travel': [6, 7, 8, 12],
            'home': [9, 10, 11],
            'car': [11, 12, 1]
        }
        return current_month in seasonal.get(warranty_type, [])
    
    def _calculate_confidence(self, features_scaled: np.ndarray) -> float:
        """Calculer le niveau de confiance de la prédiction"""
        if not self.is_trained or not self.cluster_model:
            return 75.0
        
        try:
            cluster = self.cluster_model.predict(features_scaled)[0]
            centroid = self.cluster_model.cluster_centers_[cluster]
            distance = np.linalg.norm(features_scaled - centroid)
            confidence = max(0, 100 * (1 - distance / 5.0))
            return min(100, confidence)
        except:
            return 75.0
    
    def _get_risk_factors(self, client_data: Dict, risk_score: float) -> List[str]:
        """Identifier les facteurs de risque"""
        factors = []
        
        if client_data.get('age', 35) < 30:
            factors.append("Âge jeune (moins de 30 ans)")
        if client_data.get('annual_income', 50000) < 30000:
            factors.append("Revenu annuel faible")
        if client_data.get('credit_score', 700) < 600:
            factors.append("Score de crédit bas")
        if client_data.get('previous_claims', 0) > 0:
            factors.append(f"Antécédents de sinistres ({client_data.get('previous_claims')})")
        if client_data.get('years_as_customer', 1) < 1:
            factors.append("Nouveau client")
            
        if not factors:
            factors.append("Profil standard")
        
        return factors[:3]
    
    def _get_recommendation_reasons(self, warranty, client_data: Dict, score: float) -> List[str]:
        """Générer des explications pour la recommandation"""
        reasons = []
        
        if score > 80:
            reasons.append("🎯 Excellent match avec votre profil")
        elif score > 70:
            reasons.append("👍 Très bien adapté à vos besoins")
        
        warranty_type = warranty.type.value if hasattr(warranty.type, 'value') else str(warranty.type)
        
        if warranty_type == 'home' and client_data.get('has_home'):
            reasons.append("🏠 Protection pour votre résidence principale")
        if warranty_type == 'car' and client_data.get('has_car'):
            reasons.append("🚗 Couverture adaptée à votre véhicule")
        if warranty_type == 'health' and client_data.get('has_dependents'):
            reasons.append("👨‍👩‍👧‍👦 Protection pour toute la famille")
        
        if not reasons:
            reasons.append("Offre complémentaire intéressante")
        
        return reasons


# Instance globale
warranty_ai = WarrantyAIEngine()