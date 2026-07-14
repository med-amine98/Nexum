# app/schemas/call_record.py
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime

class CallRecordResponse(BaseModel):
    id: int
    caller: str
    duration: int
    sentiment: str
    satisfaction: int
    agent: str
    date: str
    tags: List[str]
    transcript: Optional[str]

class CallStatsResponse(BaseModel):
    total: int
    positive: int
    negative: int
    neutral: int
    satisfaction: float
    avg_duration: float
    missed: int
    total_duration: int
    peak_hour: str