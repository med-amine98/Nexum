# app/models/__init__.py
from app.database import Base
from app.models.base import Base, BaseModel

# Auth
from app.models.auth import User, UserSession, Role, Permission, UserRole, UserStatus, AuditLog, AuditAction

# Core
from app.models.company import Company
from app.models.partner import Partner
from .user_module import UserModule

# Products
from app.models.product import Product, Category

# Sales
from app.models.sale import SaleOrder, SaleOrderLine, OrderStatus, PaymentStatus

# Purchases
from app.models.purchase import PurchaseOrder, PurchaseOrderLine, PurchaseOrderStatus, DeliveryStatus

# HR
from app.models.hr import Employee, Department, Leave, EmployeeStatus, LeaveType, LeaveStatus

# Stock
from app.models.stock import StockMovement, MovementType

# Accounting
from app.models.account import Account, Invoice, InvoiceLine, AccountType, InvoiceStatus

# KYC
from app.models.kyc import KYCDocument, KYCVerification, KYCRule, KYCStatus, VerificationStatus, VerificationType

# OCR
from app.models.ocr import (
    OCRDocument, OCRFraudAlert, OCRCorrection, DetectionModelMetrics, 
    DocumentTemplate, ExtractionRule, DocumentStatus, DocumentType, FraudLevel as OCRFraudLevel, DetectionModel
)
from app.models.aml import (
    AMLTransaction as AMLTransactionModel, AMLAlert as AMLAlertModel, 
    AMLConfig as AMLConfigModel, AMLReport as AMLReportModel, 
    RiskLevel as AMLRiskLevel, AMLStatus, FraudTechnique
)

# Claim Tracking
from app.models.claim_tracking import (
    ClaimTracking, ClaimTrackingStep, ClaimTrackingNotification, 
    ClaimTrackingDocument, ClaimTrackingMessage, Expert, ClaimStatus
)

# Document Intelligence
from app.models.document_intelligence import (
    DocumentIntelligence, DocumentIntelligenceStatus, DocumentIntelligenceType, 
    ProcessingStatus, OCRTemplate, OCRTemplateType, DocumentIntelligenceField, 
    DocumentIntelligenceTable, DocumentIntelligenceSignature, DocumentIntelligenceFraudAlert, 
    ProcessingQueue, ProcessingQueueStatus, DocumentIntelligenceTypeStats
)

# Blockchain
from app.models.blockchain import (
    BlockchainTransaction, BlockchainBlock, Block, Transaction, 
    SmartContract, BlockchainNode, Node, BlockchainLog, 
    ConsensusStatus, BlockchainFraudAlert
)

# Project
from app.models.project import (
    Project, ProjectModule, ProjectActivity, ProjectMilestone, 
    ProjectInsight, KanbanTask, ProjectStatus, ProjectPriority, ProjectPhase
)

# Credit Scoring
from app.models.credit_scoring import (
    CreditRequest, CreditFraudAlert, CreditNotification, CreditClient, 
    IncomeSource, Expense, Property, Investment, BankHistory, 
    IncomeType, ExpenseType, PropertyType, InvestmentType, BankIncidentType
)

# Churn
from app.models.churn import (
    ChurnClient, ChurnInteraction, CompetitorOffer, RetentionAction, 
    RetentionOffer, ChurnRiskLevel, ClientSegment, ChurnReason, 
    InteractionType, RetentionActionType, ActionResult
)

# Prediction
from app.models.prediction import (
    HistoricalData, Prediction, Scenario, ExogenousFactor, 
    AlertThreshold, PredictionAlert, PredictionMetric, 
    ScenarioType, ExogenousFactorType, AlertLevel, AlertCondition
)

# Claims & Insurance
from app.models.claim import Claim, ClaimPhoto, ClaimAnalysis, ClaimEstimate, ClaimActivity
from app.models.insurance_claims import (
    ClaimInsurance, ClaimInsuranceStatus, ClaimInsuranceStep, ClaimInsuranceTimeline, 
    ClaimInsuranceRequiredDocument, ClaimInsuranceEstimation, ClaimInsuranceNotification
)

# Catastrophe
from app.models.catastrophe import (
    CatastropheZone, CatastropheEvent, CatastropheScenario, 
    CatastropheAlert, CatastropheFraudAlert, 
    RiskLevel as CatRiskLevel, FraudLevel as CatFraudLevel, 
    CatastropheType, DetectionMethod
)

# Warranty
from app.models.warranty import (
    Warranty, WarrantySubscription, WarrantyClaim, ClientProfile, 
    WarrantyType, WarrantyStatus
)

# Support
from app.models.support import (
    SupportTicket, TicketSolution, SolutionFeedback, TicketMessage, 
    KnowledgeBase, TicketPriority, TicketStatus, TicketCategory, TicketSector
)

# Strategic Modules
from app.models.insight import Insight
from app.models.insurance import InsuranceClaim, InsuranceFraudAlert, InsuranceDocument, InsuranceWitness, InsuranceExpertise, InsuranceClient, FraudDetectionRule
try: from app.models.module import Module
except ImportError: Module = None
try: from app.models.tax import Tax
except ImportError: Tax = None
try: from app.models.weather_forecast import WeatherForecast
except ImportError: WeatherForecast = None

# ✅ Call Analytics - Import depuis call_analytics UNIQUEMENT
from app.models.call_analytics import (
    CallRecord, CallAnalytics, CallTopicStats, CallDailyStats,
    CallStatus, CallSentiment, CallTopic
)

# Banking
from app.models.banking import Client, Transaction as BankingTransaction

# Scraping & AI
from app.models.scraping import ScrapingTask, ScrapingResult, SocialMention, SentimentAnalysis
from app.models.ai_report import AIReport

# Settings
from app.models.settings import UserPreference, PreferenceType, BusinessRule, Integration, SecurityConfig

# Digital Twin
from app.models.digital_twin import DigitalTwin

# Insurance
from app.models.risk_scoring import (
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

from app.models.user_module import UserModule

# CRM
from app.models.crm import Lead, LeadStatus, PipelineStage

# HR
from app.models.hr import Leave as LeaveRequest
from app.models.enterprise import (
    EnterpriseProject,
    EnterpriseSale,
    EnterpriseEmployee,
    EnterpriseFinancialForecast,
    EnterpriseAlert
)
__all__ = [
    'Base',
    'BaseModel',
    # Auth
    'User', 'UserSession', 'Role', 'Permission', 'UserRole', 'UserStatus', 'AuditLog', 'AuditAction',
    # Core
    'Company', 'Partner',
    # Products
    'Product', 'Category',
    # Sales
    'SaleOrder', 'SaleOrderLine', 'OrderStatus', 'PaymentStatus', 'LeaveRequest',
    # Purchases
    'PurchaseOrder', 'PurchaseOrderLine', 'PurchaseOrderStatus', 'DeliveryStatus',
    # HR
    'Employee', 'Department', 'Leave', 'EmployeeStatus', 'LeaveType', 'LeaveStatus',
    # Stock
    'StockMovement', 'MovementType',
    # Accounting
    'Account', 'Invoice', 'InvoiceLine', 'AccountType', 'InvoiceStatus',
    # KYC
    'KYCDocument', 'KYCVerification', 'KYCRule', 'KYCStatus', 'VerificationStatus', 'VerificationType',
    # OCR
    'OCRDocument', 'OCRFraudAlert', 'OCRCorrection', 'DetectionModelMetrics', 'DocumentTemplate', 
    'ExtractionRule', 'DocumentStatus', 'DocumentType', 'OCRFraudLevel', 'DetectionModel',
    # AML
    'AMLTransactionModel', 'AMLAlertModel', 'AMLConfigModel', 'AMLReportModel', 'AMLRiskLevel', 
    'AMLStatus', 'FraudTechnique',
    # Claim Tracking
    'ClaimTracking', 'ClaimTrackingStep', 'ClaimTrackingNotification', 'ClaimTrackingDocument', 
    'ClaimTrackingMessage', 'Expert', 'ClaimStatus',
    # Document Intelligence
    'DocumentIntelligence', 'DocumentIntelligenceStatus', 'DocumentIntelligenceType', 'ProcessingStatus', 
    'OCRTemplate', 'OCRTemplateType', 'DocumentIntelligenceField', 'DocumentIntelligenceTable', 
    'DocumentIntelligenceSignature', 'DocumentIntelligenceFraudAlert', 'ProcessingQueue', 
    'ProcessingQueueStatus', 'DocumentIntelligenceTypeStats',
    # Blockchain
    'BlockchainTransaction', 'BlockchainBlock', 'Block', 'Transaction', 'SmartContract', 
    'BlockchainNode', 'Node', 'BlockchainLog', 'ConsensusStatus', 'BlockchainFraudAlert',
    # Project
    'Project', 'ProjectModule', 'ProjectActivity', 'ProjectMilestone', 'ProjectInsight', 
    'ProjectStatus', 'ProjectPriority', 'ProjectPhase',
    # Credit Scoring
    'CreditRequest', 'CreditFraudAlert', 'CreditNotification', 'CreditClient', 'IncomeSource', 
    'Expense', 'Property', 'Investment', 'BankHistory', 'IncomeType', 'ExpenseType', 'PropertyType', 
    'InvestmentType', 'BankIncidentType',
    # Churn
    'ChurnClient', 'ChurnInteraction', 'CompetitorOffer', 'RetentionAction', 'RetentionOffer', 
    'ChurnRiskLevel', 'ClientSegment', 'ChurnReason', 'InteractionType', 'RetentionActionType', 'ActionResult',
    # Prediction
    'HistoricalData', 'Prediction', 'Scenario', 'ExogenousFactor', 'AlertThreshold', 'PredictionAlert', 
    'PredictionMetric', 'ScenarioType', 'ExogenousFactorType', 'AlertLevel', 'AlertCondition',
    # Claims & Insurance
    'Claim', 'ClaimPhoto', 'ClaimAnalysis', 'ClaimEstimate', 'ClaimActivity',
    'ClaimInsurance', 'ClaimInsuranceStatus', 'ClaimInsuranceStep', 'ClaimInsuranceTimeline', 
    'ClaimInsuranceRequiredDocument', 'ClaimInsuranceEstimation', 'ClaimInsuranceNotification',
    # Catastrophe
    'CatastropheZone', 'CatastropheEvent', 'CatastropheScenario', 'CatastropheAlert', 'CatastropheFraudAlert', 
    'CatRiskLevel', 'CatFraudLevel', 'CatastropheType', 'DetectionMethod',
    # Warranty
    'Warranty', 'WarrantySubscription', 'WarrantyClaim', 'ClientProfile', 'WarrantyType', 'WarrantyStatus',
    # Support
    'SupportTicket', 'TicketSolution', 'SolutionFeedback', 'TicketMessage', 'KnowledgeBase', 
    'TicketPriority', 'TicketStatus', 'TicketCategory', 'TicketSector',
    # Strategic Modules
    'Insight',
    'InsuranceClaim', 'InsuranceFraudAlert', 'InsuranceDocument', 'InsuranceWitness', 
    'InsuranceExpertise', 'InsuranceClient', 'FraudDetectionRule', 
    'Module', 'Tax', 'WeatherForecast',
    # ✅ Call Analytics - UNIQUEMENT depuis call_analytics
    'CallRecord', 'CallAnalytics', 'CallTopicStats', 'CallDailyStats',
    'CallStatus', 'CallSentiment', 'CallTopic',
    # Banking
    'Client', 'BankingTransaction',
    # Scraping & AI
    'ScrapingTask', 'ScrapingResult', 'SocialMention', 'SentimentAnalysis',
    'AIReport', 'KanbanTask',
    # Settings
    'UserPreference', 'PreferenceType', 'DigitalTwin', 
    'UserModule', 
    # CRM
    'Lead', 'LeadStatus', 'PipelineStage', 
    # Insurance Risk Scoring
    'InsurancePolicy', 'InsuranceClaimRisk', 'RiskFactor', 'RiskScoreHistory', 
    'RiskScoringFraudAlert', 'RiskLevel', 'PolicyStatus',
    'ClaimStatus', 'FraudLevel', 'InsuranceType'
]