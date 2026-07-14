# schemas/robo_advisor.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class InvestmentProfileCreate(BaseModel):
    risk_score: int = Field(..., ge=1, le=10)
    investment_goal: float = Field(..., gt=0)
    time_horizon: int = Field(..., ge=1, le=50)
    current_capital: float = Field(default=0)
    monthly_contribution: float = Field(default=0)

class InvestmentProfileResponse(BaseModel):
    id: int
    user_id: int
    risk_score: int
    investment_goal: float
    time_horizon: int
    current_capital: float
    monthly_contribution: float
    created_at: datetime
    updated_at: datetime

class PortfolioAssetResponse(BaseModel):
    asset: str
    allocation: float
    performance: float
    risk: int
    color: str = "#1890ff"

class PortfolioResponse(BaseModel):
    id: int
    name: str
    expected_return: float
    risk_level: int
    projected_value: float
    assets: List[PortfolioAssetResponse]
    allocation: List[Dict[str, Any]]
    performance: List[Dict[str, Any]]

class RecommendationResponse(BaseModel):
    id: int
    title: str
    text: str
    priority: int
    is_applied: bool

class RoboAdvisorRequest(BaseModel):
    risk: int = Field(..., ge=1, le=10)
    goal: float = Field(..., gt=0)

class RoboAdvisorResponse(BaseModel):
    profile: InvestmentProfileResponse
    portfolio: PortfolioResponse
    recommendations: List[RecommendationResponse]