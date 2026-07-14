# app/schemas/prediction.py
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# ================== SALES PREDICTION SCHEMAS (CORRIGÉS) ==================

class SalesPredictionBase(BaseModel):
    period: str
    date: datetime
    actual_value: Optional[float] = None  # ← Changé : Optional avec valeur par défaut None
    predicted_value: float
    lower_bound: Optional[float] = None   # ← Changé : Optional
    upper_bound: Optional[float] = None   # ← Changé : Optional
    confidence: Optional[float] = None    # ← Changé : Optional

    @validator('actual_value', 'lower_bound', 'upper_bound', 'confidence', pre=True)
    def convert_none_to_optional(cls, v):
        """Accepte None comme valeur valide et convertit les types"""
        if v is None:
            return None
        # Si c'est une string, essayer de convertir en float
        if isinstance(v, str):
            try:
                return float(v)
            except ValueError:
                return None
        return v

class SalesPredictionCreate(SalesPredictionBase):
    pass

class SalesPredictionInDB(SalesPredictionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# ================== METRIC PREDICTION SCHEMAS ==================

class MetricPredictionBase(BaseModel):
    metric_name: str
    current_value: Optional[float] = None  # ← Changé : Optional
    predicted_value: float
    trend: str
    confidence: Optional[float] = None     # ← Changé : Optional
    unit: str = "€"
    format_string: str = "{value} {unit}"

    @validator('trend')
    def validate_trend(cls, v):
        """Valide que la tendance est une valeur autorisée"""
        if v is None:
            return 'stable'
        allowed_values = ['up', 'down', 'stable', 'upward', 'downward', 'increasing', 'decreasing']
        if v not in allowed_values:
            # Si c'est un nombre, convertir en tendance
            if isinstance(v, (int, float)):
                if v > 0:
                    return 'up'
                elif v < 0:
                    return 'down'
                else:
                    return 'stable'
            # Sinon, retourner la valeur par défaut
            return 'stable'
        return v
    
    @validator('current_value', 'confidence', pre=True)
    def convert_none_to_optional_metric(cls, v):
        """Accepte None comme valeur valide"""
        return v

class MetricPredictionCreate(MetricPredictionBase):
    pass

class MetricPredictionInDB(MetricPredictionBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
    
    def formatted_current(self) -> str:
        """Retourne la valeur actuelle formatée"""
        if self.current_value is None:
            return "N/A"
        if self.unit == "€":
            return f"{self.current_value:,.0f} €".replace(",", " ")
        elif self.unit == "%":
            return f"{self.current_value:.1f}%"
        else:
            return f"{self.current_value:,.0f}".replace(",", " ")
    
    def formatted_predicted(self) -> str:
        """Retourne la valeur prédite formatée"""
        if self.predicted_value is None:
            return "N/A"
        if self.unit == "€":
            return f"{self.predicted_value:,.0f} €".replace(",", " ")
        elif self.unit == "%":
            return f"{self.predicted_value:.1f}%"
        else:
            return f"{self.predicted_value:,.0f}".replace(",", " ")

# ================== MODEL SCHEMAS ==================

class PredictionModelBase(BaseModel):
    name: str
    model_type: str = "arima"
    accuracy: Optional[float] = None
    mape: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None
    metrics: Optional[Dict[str, Any]] = None

class PredictionModelInDB(PredictionModelBase):
    id: int
    last_trained: datetime
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# ================== DASHBOARD SCHEMAS ==================

class PredictionDashboard(BaseModel):
    sales_forecast: List[SalesPredictionInDB]
    metric_predictions: List[MetricPredictionInDB]
    overall_confidence: float
    error_margin: float
    target_value: float
    active_model: Optional[PredictionModelInDB] = None