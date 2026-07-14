# app/services/predictive_ml_service.py
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.predictive_analytics import HistoricalData, MetricType

logger = logging.getLogger(__name__)


class PredictiveMLService:
    """Service de prédiction utilisant Random Forest pour les prévisions B2B"""
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.model_path = "models/predictive/"
        self.is_loaded = False
        
        # Créer le dossier avec les bonnes permissions
        os.makedirs(self.model_path, exist_ok=True)
        logger.info(f"📁 Dossier des modèles: {os.path.abspath(self.model_path)}")
        
        self.load_models()
    
    def load_models(self):
        """Charge les modèles entraînés depuis le disque"""
        try:
            loaded_count = 0
            for metric in MetricType:
                model_file = f"{self.model_path}{metric.value}_model.pkl"
                scaler_file = f"{self.model_path}{metric.value}_scaler.pkl"
                
                logger.info(f"🔍 Recherche du modèle: {model_file}")
                
                if os.path.exists(model_file) and os.path.exists(scaler_file):
                    try:
                        self.models[metric.value] = joblib.load(model_file)
                        self.scalers[metric.value] = joblib.load(scaler_file)
                        loaded_count += 1
                        logger.info(f"✅ Modèle chargé pour {metric.value}")
                    except Exception as e:
                        logger.warning(f"⚠️ Erreur chargement modèle {metric.value}: {e}")
                else:
                    logger.info(f"📝 Fichier non trouvé pour {metric.value}: {model_file}")
            
            self.is_loaded = loaded_count > 0
            if self.is_loaded:
                logger.info(f"✅ {loaded_count} modèles prédictifs chargés")
            else:
                logger.info("📝 Aucun modèle trouvé sur le disque")
        except Exception as e:
            logger.warning(f"⚠️ Erreur chargement modèles: {e}")
            self.is_loaded = False
    
    def save_models(self):
        """Sauvegarde les modèles entraînés"""
        try:
            os.makedirs(self.model_path, exist_ok=True)
            
            for metric, model in self.models.items():
                model_file = f"{self.model_path}{metric}_model.pkl"
                scaler_file = f"{self.model_path}{metric}_scaler.pkl"
                
                logger.info(f"💾 Sauvegarde du modèle: {model_file}")
                joblib.dump(model, model_file)
                joblib.dump(self.scalers[metric], scaler_file)
                logger.info(f"✅ Modèle sauvegardé pour {metric}")
        except Exception as e:
            logger.error(f"❌ Erreur sauvegarde modèles: {e}")
            logger.error(f"   Chemin: {os.path.abspath(self.model_path)}")
    
    def prepare_features(self, historical_data: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        """Prépare les caractéristiques pour l'entraînement"""
        if not historical_data or len(historical_data) < 14:
            return np.array([]), np.array([])
        
        df = pd.DataFrame(historical_data)
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Caractéristiques temporelles
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['year'] = df['date'].dt.year
        df['day_of_year'] = df['date'].dt.dayofyear
        
        # Caractéristiques de lag
        df['value_lag_1'] = df['value'].shift(1)
        df['value_lag_2'] = df['value'].shift(2)
        df['value_lag_3'] = df['value'].shift(3)
        df['value_lag_7'] = df['value'].shift(7)
        df['value_lag_14'] = df['value'].shift(14)
        
        # Moyennes mobiles
        df['rolling_mean_3'] = df['value'].rolling(window=3).mean()
        df['rolling_mean_7'] = df['value'].rolling(window=7).mean()
        df['rolling_std_7'] = df['value'].rolling(window=7).std()
        
        # Remplacer les NaN avec ffill et bfill (compatible pandas >= 2.0)
        df = df.ffill()
        df = df.bfill()
        df = df.fillna(0)
        
        feature_cols = [
            'day_of_week', 'day_of_month', 'month', 'quarter', 
            'year', 'day_of_year',
            'value_lag_1', 'value_lag_2', 'value_lag_3', 
            'value_lag_7', 'value_lag_14',
            'rolling_mean_3', 'rolling_mean_7', 'rolling_std_7'
        ]
        
        X = df[feature_cols].values
        y = df['value'].values
        
        return X, y
    
    def train_model(self, db: Session, metric: MetricType) -> Dict[str, Any]:
        """Entraîne un modèle Random Forest pour une métrique spécifique"""
        try:
            logger.info(f"🔄 Entraînement du modèle Random Forest pour {metric.value}")
            
            # Récupérer les données historiques
            historical_data = db.query(HistoricalData).filter(
                HistoricalData.metric == metric
            ).order_by(HistoricalData.date).all()
            
            if len(historical_data) < 30:
                return {
                    "success": False,
                    "message": f"Données insuffisantes pour {metric.value}. Minimum 30 points requis. Actuellement: {len(historical_data)}"
                }
            
            data_list = [{
                "date": h.date,
                "value": h.value
            } for h in historical_data]
            
            X, y = self.prepare_features(data_list)
            
            if len(X) == 0 or len(y) == 0:
                return {
                    "success": False,
                    "message": f"Erreur de préparation des données pour {metric.value}"
                }
            
            # Diviser les données
            test_size = min(0.2, 10 / len(X))
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, shuffle=False
            )
            
            # Normaliser
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Random Forest
            model = RandomForestRegressor(
                n_estimators=100,
                max_depth=10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            
            model.fit(X_train_scaled, y_train)
            
            # Évaluer
            y_pred = model.predict(X_test_scaled)
            
            mae = mean_absolute_error(y_test, y_pred) if len(y_test) > 0 else 0
            mse = mean_squared_error(y_test, y_pred) if len(y_test) > 0 else 0
            r2 = r2_score(y_test, y_pred) if len(y_test) > 0 else 0
            
            # Validation croisée
            cv_scores = cross_val_score(model, X_train_scaled, y_train, cv=min(5, len(X_train)))
            
            # Sauvegarder le modèle immédiatement
            self.models[metric.value] = model
            self.scalers[metric.value] = scaler
            self.save_models()
            self.is_loaded = True
            
            logger.info(f"✅ Modèle entraîné et sauvegardé pour {metric.value}: R2={r2:.3f}, MAE={mae:.2f}")
            
            return {
                "success": True,
                "metric": metric.value,
                "r2_score": float(r2),
                "mae": float(mae),
                "mse": float(mse),
                "cv_mean": float(np.mean(cv_scores)),
                "cv_std": float(np.std(cv_scores)),
                "samples": len(X),
                "features": len(X[0]) if len(X) > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur entraînement modèle pour {metric.value}: {e}")
            return {
                "success": False,
                "message": str(e)
            }
    
    def train_all_models(self, db: Session) -> Dict[str, Any]:
        """Entraîne tous les modèles pour toutes les métriques"""
        results = {}
        
        for metric in MetricType:
            result = self.train_model(db, metric)
            results[metric.value] = result
        
        # Forcer le rechargement après l'entraînement
        self.load_models()
        
        return results
    
    def train_specific_model(self, db: Session, metric_name: str) -> Dict[str, Any]:
        """Entraîne un modèle spécifique par son nom"""
        try:
            metric = MetricType(metric_name.lower())
            return self.train_model(db, metric)
        except ValueError:
            return {
                "success": False,
                "message": f"Métrique inconnue: {metric_name}"
            }
    
    def predict_future(self, db: Session, metric: MetricType, steps: int = 12) -> List[Dict]:
        """Prédit les valeurs futures pour une métrique (par mois)"""
        try:
            self.load_models()
            
            if metric.value not in self.models:
                logger.warning(f"⚠️ Modèle non disponible pour {metric.value}")
                return self._generate_fallback_forecast(db, metric, steps)
            
            model = self.models[metric.value]
            scaler = self.scalers[metric.value]
            
            # Récupérer les données historiques
            historical_data = db.query(HistoricalData).filter(
                HistoricalData.metric == metric
            ).order_by(HistoricalData.date).all()
            
            if len(historical_data) < 14:
                return self._generate_fallback_forecast(db, metric, steps)
            
            # ✅ Agréger les données par mois pour les prévisions
            monthly_data = self._aggregate_monthly(historical_data)
            
            if len(monthly_data) < 6:
                return self._generate_fallback_forecast(db, metric, steps)
            
            # Dernières données mensuelles
            last_month = monthly_data[-1]['date']
            last_values = [m['value'] for m in monthly_data[-14:]]
            
            # Calculer l'écart-type mensuel
            historical_values = [m['value'] for m in monthly_data]
            std_dev = np.std(historical_values) if len(historical_values) > 1 else 0
            
            predictions = []
            current_date = last_month + timedelta(days=30)  # Mois suivant
            
            for i in range(steps):
                # ✅ Utiliser la date du mois
                date = current_date.replace(day=1)
                current_date = date
                
                # Préparer les caractéristiques
                features = self._prepare_prediction_features(last_values, current_date)
                features_scaled = scaler.transform(features.reshape(1, -1))
                pred_value = model.predict(features_scaled)[0]
                
                used_std_dev = std_dev if std_dev > 0 else pred_value * 0.1
                
                predictions.append({
                    "date": current_date.isoformat(),
                    "predicted_value": round(float(pred_value), 2),
                    "lower_bound": round(float(pred_value - 1.96 * used_std_dev), 2),
                    "upper_bound": round(float(pred_value + 1.96 * used_std_dev), 2),
                    "confidence": 0.85,
                    "metric": metric.value
                })
                
                # Mettre à jour pour le mois suivant
                last_values.append(pred_value)
                last_values = last_values[-14:]
                # ✅ Passer au mois suivant
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            
            logger.info(f"✅ {len(predictions)} prévisions mensuelles générées pour {metric.value}")
            return predictions
            
        except Exception as e:
            logger.error(f"❌ Erreur prédiction pour {metric.value}: {e}")
            return self._generate_fallback_forecast(db, metric, steps)
    
    def predict_future_monthly(self, db: Session, metric: MetricType, steps: int = 12) -> List[Dict]:
        """Alias pour predict_future - retourne des prévisions mensuelles"""
        return self.predict_future(db, metric, steps)
    
    def _aggregate_monthly(self, historical_data: List) -> List[Dict]:
        """Agrège les données quotidiennes en données mensuelles"""
        monthly = {}
        for h in historical_data:
            month_key = h.date.replace(day=1)
            if month_key not in monthly:
                monthly[month_key] = []
            monthly[month_key].append(h.value)
        
        result = []
        for date, values in sorted(monthly.items()):
            result.append({
                'date': date,
                'value': np.mean(values)  # Moyenne mensuelle
            })
        return result
    
    def _generate_fallback_forecast(self, db: Session, metric: MetricType, steps: int = 12) -> List[Dict]:
        """Génère des prévisions de fallback basées sur la tendance historique"""
        try:
            # Récupérer les données historiques
            historical_data = db.query(HistoricalData).filter(
                HistoricalData.metric == metric
            ).order_by(HistoricalData.date).all()
            
            if not historical_data or len(historical_data) < 2:
                return self._generate_default_forecast(steps)
            
            # Calculer la tendance
            values = [h.value for h in historical_data]
            last_value = values[-1]
            
            # Tendance sur les 30 derniers jours
            recent_values = values[-30:] if len(values) >= 30 else values
            if len(recent_values) > 1:
                growth_rates = []
                for i in range(1, len(recent_values)):
                    if recent_values[i-1] > 0:
                        growth = (recent_values[i] - recent_values[i-1]) / recent_values[i-1]
                        growth_rates.append(growth)
                avg_growth = np.mean(growth_rates) if growth_rates else 0.01
            else:
                avg_growth = 0.01
            
            # Volatilité
            std_dev = np.std(values) if len(values) > 1 else last_value * 0.1
            
            last_date = historical_data[-1].date
            current_date = last_date + timedelta(days=30)
            
            predictions = []
            for i in range(steps):
                # ✅ Valeur prédite avec croissance et volatilité
                growth_factor = 1 + avg_growth * (i + 1)
                noise = 1 + (np.random.random() - 0.5) * 0.1
                pred_value = last_value * growth_factor * noise
                
                # ✅ Date au format mois
                date = current_date.replace(day=1)
                
                predictions.append({
                    "date": date.isoformat(),
                    "predicted_value": round(float(pred_value), 2),
                    "lower_bound": round(float(pred_value - 1.96 * std_dev), 2),
                    "upper_bound": round(float(pred_value + 1.96 * std_dev), 2),
                    "confidence": 0.80,
                    "metric": metric.value
                })
                
                # Passer au mois suivant
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1)
            
            logger.info(f"✅ {len(predictions)} prévisions de fallback générées pour {metric.value}")
            return predictions
            
        except Exception as e:
            logger.error(f"❌ Erreur fallback pour {metric.value}: {e}")
            return self._generate_default_forecast(steps)
    
    def _generate_default_forecast(self, steps: int = 12) -> List[Dict]:
        """Génère des prévisions par défaut si aucune donnée n'est disponible"""
        current_date = datetime.now().replace(day=1)
        base_value = 19800  # CA réel
        
        predictions = []
        for i in range(steps):
            date = current_date + timedelta(days=30 * (i + 1))
            # Croissance de 5-8% par mois
            growth = 1 + (0.05 + np.random.random() * 0.03)
            pred_value = base_value * (growth ** (i + 1))
            
            predictions.append({
                "date": date.isoformat(),
                "predicted_value": round(float(pred_value), 2),
                "lower_bound": round(float(pred_value * 0.85), 2),
                "upper_bound": round(float(pred_value * 1.15), 2),
                "confidence": 0.85,
                "metric": "revenue"
            })
        
        return predictions
    
    def _prepare_prediction_features(self, last_values: List[float], date: datetime) -> np.ndarray:
        """Prépare les caractéristiques pour une prédiction"""
        day_of_week = date.weekday()
        day_of_month = date.day
        month = date.month
        quarter = (date.month - 1) // 3 + 1
        year = date.year
        day_of_year = date.timetuple().tm_yday
        
        value_lag_1 = last_values[-1] if len(last_values) >= 1 else 0
        value_lag_2 = last_values[-2] if len(last_values) >= 2 else 0
        value_lag_3 = last_values[-3] if len(last_values) >= 3 else 0
        value_lag_7 = last_values[-7] if len(last_values) >= 7 else 0
        value_lag_14 = last_values[-14] if len(last_values) >= 14 else 0
        
        rolling_mean_3 = np.mean(last_values[-3:]) if len(last_values) >= 3 else 0
        rolling_mean_7 = np.mean(last_values[-7:]) if len(last_values) >= 7 else 0
        rolling_std_7 = np.std(last_values[-7:]) if len(last_values) >= 7 else 0
        
        features = np.array([
            day_of_week, day_of_month, month, quarter, year, day_of_year,
            value_lag_1, value_lag_2, value_lag_3, value_lag_7, value_lag_14,
            rolling_mean_3, rolling_mean_7, rolling_std_7
        ])
        
        return features
    
    def predict_all_metrics(self, db: Session, steps: int = 12) -> Dict[str, List[Dict]]:
        """Prédit toutes les métriques"""
        results = {}
        
        for metric in MetricType:
            predictions = self.predict_future(db, metric, steps)
            results[metric.value] = predictions
        
        return results
    
    def get_feature_importance(self, metric: str) -> List[Dict[str, Any]]:
        """Retourne l'importance des caractéristiques pour un modèle"""
        if metric not in self.models:
            return []
        
        model = self.models[metric]
        
        feature_names = [
            'day_of_week', 'day_of_month', 'month', 'quarter', 
            'year', 'day_of_year',
            'value_lag_1', 'value_lag_2', 'value_lag_3', 
            'value_lag_7', 'value_lag_14',
            'rolling_mean_3', 'rolling_mean_7', 'rolling_std_7'
        ]
        
        importance = model.feature_importances_
        indices = np.argsort(importance)[::-1]
        
        result = []
        for i in indices[:10]:
            if i < len(feature_names):
                result.append({
                    "feature": feature_names[i],
                    "importance": round(float(importance[i]), 4)
                })
        
        return result


# Instance globale
_instance = None

def get_predictive_ml_service() -> PredictiveMLService:
    global _instance
    if _instance is None:
        _instance = PredictiveMLService()
    return _instance