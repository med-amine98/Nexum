# app/services/fraud_types.py
"""
Définition des types de fraude bancaire
"""

from enum import Enum
from typing import Dict, List, Any

class FraudType(Enum):
    """Types de fraude bancaire"""
    CARD_FRAUD = "CARD_FRAUD"
    MONEY_LAUNDERING = "MONEY_LAUNDERING"
    ORGANIZED_FRAUD = "ORGANIZED_FRAUD"
    MONEY_MULE = "MONEY_MULE"
    ACCOUNT_TAKEOVER = "ACCOUNT_TAKEOVER"
    LOAN_FRAUD = "LOAN_FRAUD"
    IDENTITY_FRAUD = "IDENTITY_FRAUD"
    ANOMALOUS_TRANSACTION = "ANOMALOUS_TRANSACTION"
    INSIDER_FRAUD = "INSIDER_FRAUD"
    SWIFT_FRAUD = "SWIFT_FRAUD"

# Configuration par type de fraude
FRAUD_CONFIG = {
    FraudType.CARD_FRAUD: {
        "name": "Fraude à la carte bancaire",
        "icon": "💳",
        "severity": "HIGH",
        "indicators": ["multiple_countries", "unusual_amount", "new_device", "unusual_time", "merchant_category"],
        "threshold": 0.70,
        "actions": ["block_card", "alert_customer", "investigate"]
    },
    FraudType.MONEY_LAUNDERING: {
        "name": "Blanchiment d'argent",
        "icon": "🏦",
        "severity": "CRITICAL",
        "indicators": ["circular_transactions", "multiple_intermediaries", "smurfing", "high_frequency", "offshore_accounts"],
        "threshold": 0.75,
        "actions": ["report_to_aml", "freeze_accounts", "investigate"]
    },
    FraudType.ORGANIZED_FRAUD: {
        "name": "Réseau de fraude organisé",
        "icon": "👥",
        "severity": "CRITICAL",
        "indicators": ["shared_devices", "shared_ips", "connected_accounts", "community_detection", "synchronized_behavior"],
        "threshold": 0.80,
        "actions": ["network_investigation", "freeze_all", "law_enforcement"]
    },
    FraudType.MONEY_MULE: {
        "name": "Compte mule",
        "icon": "🐴",
        "severity": "HIGH",
        "indicators": ["rapid_redistribution", "high_turnover", "new_account", "inflow_outflow_ratio", "no_legitimate_activity"],
        "threshold": 0.70,
        "actions": ["freeze_account", "investigate", "alert_bank"]
    },
    FraudType.ACCOUNT_TAKEOVER: {
        "name": "Prise de contrôle de compte",
        "icon": "🔓",
        "severity": "HIGH",
        "indicators": ["new_device", "location_change", "unusual_amount", "multiple_failed_attempts", "password_change"],
        "threshold": 0.75,
        "actions": ["lock_account", "reset_credentials", "alert_customer"]
    },
    FraudType.LOAN_FRAUD: {
        "name": "Fraude au prêt",
        "icon": "📋",
        "severity": "MEDIUM",
        "indicators": ["income_discrepancy", "fake_employer", "shared_identity", "document_reuse", "multiple_applications"],
        "threshold": 0.65,
        "actions": ["reject_loan", "investigate", "report_fraud"]
    },
    FraudType.IDENTITY_FRAUD: {
        "name": "Fraude à l'identité",
        "icon": "🎭",
        "severity": "HIGH",
        "indicators": ["shared_identity", "document_reuse", "inconsistent_data", "multiple_accounts", "synthetic_identity"],
        "threshold": 0.70,
        "actions": ["block_accounts", "investigate", "credit_freeze"]
    },
    FraudType.ANOMALOUS_TRANSACTION: {
        "name": "Transaction anormale",
        "icon": "⚡",
        "severity": "MEDIUM",
        "indicators": ["amount_outlier", "frequency_outlier", "unusual_merchant", "time_anomaly", "velocity_anomaly"],
        "threshold": 0.60,
        "actions": ["review_transaction", "alert", "monitor"]
    },
    FraudType.INSIDER_FRAUD: {
        "name": "Fraude interne",
        "icon": "👨‍💼",
        "severity": "CRITICAL",
        "indicators": ["unusual_access", "unusual_validations", "off_hours_activity", "data_exfiltration", "privilege_abuse"],
        "threshold": 0.75,
        "actions": ["suspend_employee", "investigate", "audit"]
    },
    FraudType.SWIFT_FRAUD: {
        "name": "Fraude SWIFT / Virement international",
        "icon": "🌍",
        "severity": "CRITICAL",
        "indicators": ["unusual_route", "repeated_beneficiary", "high_risk_country", "large_amount", "urgency_indicator"],
        "threshold": 0.80,
        "actions": ["block_transfer", "investigate", "report_authorities"]
    }
}