from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class KPIData(BaseModel):
    title: str
    value: float
    prefix: Optional[str] = None
    trend: float
    trend_up: bool
    subtitle: str

class ChartDataPoint(BaseModel):
    month: str
    ventes: float
    prevision: float
    commandes: int

class CategoryData(BaseModel):
    name: str
    value: float
    color: str

class PipelineStage(BaseModel):
    stage: str
    count: int
    value: float

class DashboardResponse(BaseModel):
    kpi_data: List[KPIData]
    sales_chart: List[ChartDataPoint]
    category_distribution: List[CategoryData]
    pipeline: List[PipelineStage]
    recent_orders: List[dict]