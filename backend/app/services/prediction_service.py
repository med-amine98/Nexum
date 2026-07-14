# app/services/prediction_service.py
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, inspect
from sqlalchemy.orm import clear_mappers
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import numpy as np
from collections import defaultdict
import math
import logging

from app.models.prediction import SalesPrediction, MetricPrediction, PredictionModel, PredictionResult
from app.models.sale import SaleOrder
from app.schemas.prediction import (
    SalesPredictionCreate, MetricPredictionCreate,
    PredictionModelBase, PredictionDashboard
)

logger = logging.getLogger(__name__)

class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        # Force le rechargement des métadonnées à l'initialisation
        self._refresh_metadata()
    
    def _refresh_metadata(self):
        """Force le rechargement des métadonnées SQLAlchemy"""
        try:
            clear_mappers()
            inspector = inspect(self.db.bind)
            
            # Vérifier que les tables existent
            tables = inspector.get_table_names()
            logger.info(f"Tables disponibles: {tables}")
            
            # Vérifier spécifiquement les tables de prédiction
            required_tables = ['sales_predictions', 'metric_predictions', 'prediction_models']
            for table in required_tables:
                if table not in tables:
                    logger.warning(f"⚠️ Table {table} manquante, création...")
                    if table == 'sales_predictions':
                        SalesPrediction.__table__.create(self.db.bind)
                    elif table == 'metric_predictions':
                        MetricPrediction.__table__.create(self.db.bind)
                    elif table == 'prediction_models':
                        PredictionModel.__table__.create(self.db.bind)
            
            logger.info("✅ Métadonnées rechargées")
        except Exception as e:
            logger.error(f"❌ Erreur refresh metadata: {e}")

    # ========== SALES FORECAST ==========
    def get_sales_forecast(self, period: str = "month", limit: int = 12):
        """Récupère les prévisions de ventes"""
        logger.info(f"get_sales_forecast: period={period}, limit={limit}")
        
        # Force le rechargement à chaque appel (pour éviter le cache)
        self._refresh_metadata()
        
        try:
            # Vérifier que la table existe et a des données
            count = self.db.query(SalesPrediction).count()
            logger.info(f"Nombre de prédictions existantes: {count}")
            
            if count < limit:
                logger.info("Génération de nouvelles prédictions...")
                self.generate_sales_predictions(period, limit)
            
            query = self.db.query(SalesPrediction).filter(
                SalesPrediction.period == period
            ).order_by(SalesPrediction.date).limit(limit)
            
            result = query.all()
            logger.info(f"Résultats trouvés: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur dans get_sales_forecast: {e}")
            import traceback
            traceback.print_exc()
            # En cas d'erreur, retourner une liste vide
            return []

    def generate_sales_predictions(self, period: str = "month", count: int = 12):
        """Génère des prédictions de ventes basées sur l'historique"""
        logger.info(f"Génération de {count} prédictions pour période {period}")
        
        try:
            # Récupérer les ventes historiques
            historical_sales = self.db.query(SaleOrder).order_by(SaleOrder.date_order).all()
            
            # Extraire les valeurs et dates
            dates = []
            values = []
            for sale in historical_sales:
                if sale.date_order and sale.amount_total:
                    dates.append(sale.date_order)
                    values.append(sale.amount_total)
            
            # Calculer les tendances
            if len(values) > 1:
                trend = np.polyfit(range(len(values)), values, 1)[0]
                seasonality = self._calculate_seasonality(values)
            else:
                trend = 1000
                seasonality = 1.05
            
            # Date de départ
            if dates:
                last_date = max(dates)
            else:
                last_date = datetime.now()
            
            # Supprimer les anciennes prédictions pour cette période
            self.db.query(SalesPrediction).filter(
                SalesPrediction.period == period
            ).delete()
            self.db.commit()
            
            # Générer les nouvelles prédictions
            for i in range(1, count + 1):
                if period == "month":
                    pred_date = last_date + timedelta(days=30 * i)
                    base_value = values[-1] if values else 50000
                    seasonal_factor = seasonality ** (i % 12 / 12)
                elif period == "week":
                    pred_date = last_date + timedelta(days=7 * i)
                    base_value = values[-1] if values else 50000
                    seasonal_factor = 1 + (math.sin(i / 4) * 0.1)
                else:  # quarter
                    pred_date = last_date + timedelta(days=90 * i)
                    base_value = values[-1] if values else 50000
                    seasonal_factor = 1 + (math.sin(i / 2) * 0.15)
                
                # Calculer la valeur prédite avec tendance et saisonnalité
                trend_factor = 1 + (trend / base_value) * i if base_value > 0 else 1
                predicted = base_value * trend_factor * seasonal_factor
                
                # Ajouter une marge d'erreur
                error_margin = predicted * 0.1  # 10% d'erreur
                confidence = max(0, min(100, 95 - (i * 2)))  # La confiance diminue avec le temps
                
                # Créer la prédiction
                prediction = SalesPrediction(
                    period=period,
                    date=pred_date,
                    actual_value=0,  # Pas encore de valeur réelle
                    predicted_value=predicted,
                    lower_bound=predicted - error_margin,
                    upper_bound=predicted + error_margin,
                    confidence=confidence
                )
                self.db.add(prediction)
            
            self.db.commit()
            logger.info(f"✅ {count} prédictions générées")
            
        except Exception as e:
            logger.error(f"❌ Erreur dans generate_sales_predictions: {e}")
            import traceback
            traceback.print_exc()
            self.db.rollback()

    def _calculate_seasonality(self, values: List[float]) -> float:
        """Calcule un facteur de saisonnalité basé sur les données"""
        if len(values) < 12:
            return 1.05
        
        # Calcul simple de la saisonnalité
        monthly_avg = []
        for i in range(0, len(values), 30):
            month_values = values[i:i+30]
            if month_values:
                monthly_avg.append(sum(month_values) / len(month_values))
        
        if len(monthly_avg) > 1:
            return monthly_avg[-1] / monthly_avg[-2]
        return 1.05

    # ========== METRIC PREDICTIONS ==========
    def get_metric_predictions(self):
        """Récupère les prédictions pour toutes les métriques"""
        logger.info("get_metric_predictions")
        
        self._refresh_metadata()
        
        try:
            count = self.db.query(MetricPrediction).count()
            logger.info(f"Nombre de métriques existantes: {count}")
            
            if count < 5:
                self.generate_metric_predictions()
            
            result = self.db.query(MetricPrediction).all()
            logger.info(f"Métriques trouvées: {len(result)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur dans get_metric_predictions: {e}")
            import traceback
            traceback.print_exc()
            return []

    def _float_to_trend(self, value: float) -> str:
        """Convertit une valeur numérique en tendance textuelle"""
        if value > 5:
            return "up"
        elif value < -5:
            return "down"
        else:
            return "stable"

    def generate_metric_predictions(self):
        """Génère des prédictions pour les métriques clés"""
        logger.info("Génération des prédictions métriques")
        
        try:
            # Récupérer les données historiques
            sales = self.db.query(SaleOrder).all()
            
            # Calculer les métriques actuelles
            total_revenue = sum(s.amount_total for s in sales)
            total_orders = len(sales)
            avg_basket = total_revenue / total_orders if total_orders > 0 else 190
            
            # Compter les clients uniques
            customers = set()
            for sale in sales:
                if hasattr(sale, 'partner_id') and sale.partner_id:
                    customers.add(sale.partner_id)
            unique_customers = len(customers)
            
            # Taux de conversion (simulé)
            conversion_rate = 3.2
            
            # Calculer les tendances
            if len(sales) > 10:
                recent_sales = sales[-10:]
                old_sales = sales[:10]
                recent_avg = sum(s.amount_total for s in recent_sales) / len(recent_sales)
                old_avg = sum(s.amount_total for s in old_sales) / len(old_sales)
                revenue_trend = ((recent_avg - old_avg) / old_avg) * 100 if old_avg > 0 else 10
            else:
                revenue_trend = 15
            
            # Supprimer les anciennes métriques
            self.db.query(MetricPrediction).delete()
            self.db.commit()
            
            # Métriques à prédire
            metrics = [
                {
                    "metric_name": "revenue",
                    "current_value": total_revenue,
                    "predicted_value": total_revenue * (1 + revenue_trend/100),
                    "trend": self._float_to_trend(revenue_trend),
                    "confidence": 85 + random.randint(-5, 5),
                    "unit": "€",
                    "format_string": "{value:,.0f} €"
                },
                {
                    "metric_name": "orders",
                    "current_value": total_orders,
                    "predicted_value": total_orders * 1.15,
                    "trend": "up",
                    "confidence": 87,
                    "unit": "",
                    "format_string": "{value:,.0f}"
                },
                {
                    "metric_name": "avg_basket",
                    "current_value": avg_basket,
                    "predicted_value": avg_basket * 1.1,
                    "trend": "up",
                    "confidence": 82,
                    "unit": "€",
                    "format_string": "{value:,.0f} €"
                },
                {
                    "metric_name": "conversion",
                    "current_value": conversion_rate,
                    "predicted_value": conversion_rate * 1.15,
                    "trend": "up",
                    "confidence": 78,
                    "unit": "%",
                    "format_string": "{value:.1f}%"
                },
                {
                    "metric_name": "new_clients",
                    "current_value": unique_customers,
                    "predicted_value": unique_customers * 1.2,
                    "trend": "up",
                    "confidence": 75,
                    "unit": "",
                    "format_string": "{value:,.0f}"
                }
            ]
            
            for metric_data in metrics:
                metric = MetricPrediction(**metric_data)
                self.db.add(metric)
            
            self.db.commit()
            logger.info(f"✅ {len(metrics)} métriques générées")
            
        except Exception as e:
            logger.error(f"❌ Erreur dans generate_metric_predictions: {e}")
            import traceback
            traceback.print_exc()
            self.db.rollback()

    # ========== PREDICTION MODELS ==========
    def get_active_model(self):
        """Récupère le modèle actif"""
        return self.db.query(PredictionModel).filter(
            PredictionModel.is_active == True
        ).first()

    def create_model(self, model_data: PredictionModelBase):
        """Crée un nouveau modèle de prédiction"""
        model = PredictionModel(**model_data.model_dump())
        self.db.add(model)
        self.db.commit()
        self.db.refresh(model)
        return model

    def set_active_model(self, model_id: int):
        """Définit le modèle actif"""
        # Désactiver tous les modèles
        self.db.query(PredictionModel).update({"is_active": False})
        
        # Activer le modèle choisi
        model = self.db.query(PredictionModel).filter(PredictionModel.id == model_id).first()
        if model:
            model.is_active = True
            self.db.commit()
        
        return model

    # ========== DASHBOARD ==========
    def get_dashboard_data(self) -> PredictionDashboard:
        """Récupère toutes les données pour le dashboard"""
        logger.info("get_dashboard_data")
        
        self._refresh_metadata()
        
        try:
            # S'assurer que les données existent
            sales_count = self.db.query(SalesPrediction).count()
            metrics_count = self.db.query(MetricPrediction).count()
            
            logger.info(f"Sales count: {sales_count}, Metrics count: {metrics_count}")
            
            if sales_count < 12:
                self.generate_sales_predictions("month", 12)
            
            if metrics_count < 5:
                self.generate_metric_predictions()
            
            # Récupérer les données
            sales_forecast = self.get_sales_forecast("month", 12)
            metric_predictions = self.get_metric_predictions()
            active_model = self.get_active_model()
            
            # Calculer la confiance globale
            if metric_predictions:
                overall_confidence = sum(m.confidence for m in metric_predictions) / len(metric_predictions)
            else:
                overall_confidence = 87
            
            # Calculer la marge d'erreur moyenne
            if sales_forecast:
                error_margins = []
                for forecast in sales_forecast:
                    if forecast.predicted_value > 0:
                        margin = ((forecast.upper_bound - forecast.lower_bound) / forecast.predicted_value) * 50
                        error_margins.append(margin)
                avg_error_margin = sum(error_margins) / len(error_margins) if error_margins else 5
            else:
                avg_error_margin = 5
            
            # Objectif (simulé)
            target_value = 300000
            
            logger.info(f"Dashboard créé avec succès")
            
            return PredictionDashboard(
                sales_forecast=sales_forecast,
                metric_predictions=metric_predictions,
                overall_confidence=overall_confidence,
                error_margin=avg_error_margin,
                target_value=target_value,
                active_model=active_model
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur dans get_dashboard_data: {e}")
            import traceback
            traceback.print_exc()
            # Retourner un dashboard vide en cas d'erreur
            return PredictionDashboard(
                sales_forecast=[],
                metric_predictions=[],
                overall_confidence=0,
                error_margin=0,
                target_value=300000,
                active_model=None
            )

    # ========== STATISTIQUES ==========
    def get_prediction_stats(self):
        """Récupère les statistiques des prédictions"""
        metrics = self.get_metric_predictions()
        
        return {
            "total_metrics": len(metrics),
            "avg_confidence": sum(m.confidence for m in metrics) / len(metrics) if metrics else 0,
            "avg_trend": "mixed",
            "best_prediction": max(metrics, key=lambda m: m.confidence).metric_name if metrics else None,
            "worst_prediction": min(metrics, key=lambda m: m.confidence).metric_name if metrics else None
        }

    # ========== INITIALISATION ==========
    def seed_initial_data(self):
        """Initialise les données de test"""
        self.generate_sales_predictions("month", 12)
        self.generate_metric_predictions()
        
        # Créer un modèle par défaut
        if not self.db.query(PredictionModel).first():
            default_model = PredictionModel(
                name="ARIMA avec saisonnalité",
                model_type="arima",
                accuracy=94.2,
                mape=5.8,
                is_active=True,
                parameters={
                    "order": [1, 1, 1],
                    "seasonal_order": [1, 1, 1, 12]
                },
                metrics={
                    "mae": 2345.67,
                    "rmse": 3123.45,
                    "r2": 0.89
                }
            )
            self.db.add(default_model)
            self.db.commit()