from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

class SeverityLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[datetime] = None
    type: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []

class ReimbursementSimulationRequest(BaseModel):
    act_type: str
    amount: float

class DifferentialDiagnosis(BaseModel):
    condition: str
    probability: int
    details: str
    tests: List[str]

class MedicalRecommendation(BaseModel):
    priority: int
    action: str
    detail: str
    timing: str

class SymptomAnalysisResponse(BaseModel):
    detected_symptoms: List[str]
    symptom_details: List[Dict]
    differential_diagnosis: List[DifferentialDiagnosis]
    severity: SeverityLevel
    severity_score: int
    urgency_level: str
    consultation_delay: str
    confidence: float
    emergency: bool
    recommendations: List[MedicalRecommendation]
    recommended_specialist: Dict
    warning_signs: List[Dict]

class MedicalConsultationResponse(BaseModel):
    id: int
    consultation_id: str
    user_name: Optional[str]
    symptoms: str
    symptoms_list: List[str]
    analysis: Optional[str]
    recommendation: Optional[str]
    confidence_score: float
    severity_score: int
    severity: SeverityLevel
    emergency: bool
    possible_conditions: List[str]
    status: str
    created_at: Optional[str]
    completed_at: Optional[str]
    step: Optional[int] = 1

class AssistantResponse(BaseModel):
    reply: str
    type: str = "medical_analysis"
    consultation: Optional[MedicalConsultationResponse] = None
    emergency: bool = False
    analysis: Optional[SymptomAnalysisResponse] = None

class ReimbursementSimulationResponse(BaseModel):
    total_amount: float
    base_reimbursement: float
    mutuelle_reimbursement: float
    patient_share: float

class MedicalDirectoryEntry(BaseModel):
    id: int
    name: str
    specialty: str
    address: str
    rating: float
    consultation_fee: float
    available: bool
    phone: str
    available_times: List[str]
    color: Optional[str] = None

class HealthStatsResponse(BaseModel):
    consultations: int
    documents: int
    satisfaction: float
    savings: float