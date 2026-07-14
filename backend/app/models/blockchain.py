# app/models/blockchain.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey, JSON, Index, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
import enum
from app.database import Base

# ========== ENUMS ==========

class RiskLevel(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ========== MODÈLE TRANSACTIONS BLOCKCHAIN ==========
class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"
    __table_args__ = (
        Index('idx_blockchain_tx_hash', 'hash'),
        Index('idx_blockchain_tx_status', 'status'),
        Index('idx_blockchain_tx_timestamp', 'timestamp'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    hash = Column(String(100), unique=True, nullable=False, index=True)
    from_address = Column(String(100), nullable=False)
    to_address = Column(String(100), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="EUR")
    data = Column(Text, nullable=True)
    signature = Column(String(200), nullable=True)
    status = Column(String(20), default="pending")
    
    # IA Stratégique Blockchain Nexum
    ai_anomaly_score = Column(Float, default=0.0)
    ai_pattern_analysis = Column(JSON, default=dict)
    ai_risk_assessment = Column(JSON, default=dict)
    ai_insights = Column(JSON, default=dict)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    block_height = Column(Integer, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # ✅ Champs ajoutés pour compatibilité
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Relations
    creator = relationship("User", foreign_keys=[created_by_id])
    
    def to_dict(self):
        """Convertit l'objet en dictionnaire"""
        return {
            "id": self.id,
            "company_id": self.company_id,
            "hash": self.hash,
            "from_address": self.from_address,
            "to_address": self.to_address,
            "amount": self.amount,
            "currency": self.currency,
            "data": self.data,
            "signature": self.signature,
            "status": self.status,
            "ai_anomaly_score": self.ai_anomaly_score,
            "ai_pattern_analysis": self.ai_pattern_analysis,
            "ai_risk_assessment": self.ai_risk_assessment,
            "ai_insights": self.ai_insights,
            "block_height": self.block_height,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by_id": self.created_by_id
        }


# ========== MODÈLE BLOCS BLOCKCHAIN ==========
# app/models/blockchain.py - Corriger BlockchainBlock

class BlockchainBlock(Base):
    __tablename__ = "blockchain_blocks"
    __table_args__ = (
        Index('idx_blockchain_block_height', 'height'),
        Index('idx_blockchain_block_hash', 'hash'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    height = Column(Integer, unique=True, nullable=False)
    hash = Column(String(100), unique=True, nullable=False)
    previous_hash = Column(String(100), nullable=False)
    merkle_root = Column(String(100), nullable=False)
    transactions = Column(JSON, default=list)
    transaction_count = Column(Integer, default=0)
    validator = Column(String(100), nullable=False)
    timestamp = Column(DateTime, server_default=func.now())
    nonce = Column(Integer, default=0)
    difficulty = Column(Integer, default=0)
    
    # ❌ SUPPRIMER temporairement ces colonnes si elles n'existent pas en base
    # created_at = Column(DateTime, server_default=func.now())
    # updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "height": self.height,
            "hash": self.hash,
            "previous_hash": self.previous_hash,
            "merkle_root": self.merkle_root,
            "transactions": self.transactions or [],
            "transaction_count": self.transaction_count,
            "validator": self.validator,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "nonce": self.nonce,
            "difficulty": self.difficulty
        }


# ========== ALIAS POUR COMPATIBILITÉ ==========
Block = BlockchainBlock
Transaction = BlockchainTransaction


# ========== MODÈLE SMART CONTRACT ==========
class SmartContract(Base):
    __tablename__ = "smart_contracts"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    address = Column(String(100), unique=True, nullable=False, index=True)
    code = Column(Text, nullable=False)
    abi = Column(Text, nullable=True)
    conditions = Column(Text, nullable=True)
    owner = Column(String(100), nullable=False)
    status = Column(String(20), default="active")
    
    # IA Stratégique Smart Contract Nexum
    ai_vulnerability_scan = Column(JSON, default=dict)
    ai_optimization_tips = Column(JSON, default=dict)
    ai_risk_score = Column(Float, default=0.0)
    last_ai_audit = Column(DateTime, default=datetime.utcnow)
    
    transaction_count = Column(Integer, default=0)
    deployed_at = Column(DateTime, server_default=func.now())
    last_execution = Column(DateTime, nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "name": self.name,
            "address": self.address,
            "code": self.code[:100] + "..." if self.code and len(self.code) > 100 else self.code,
            "abi": self.abi,
            "conditions": self.conditions,
            "owner": self.owner,
            "status": self.status,
            "ai_vulnerability_scan": self.ai_vulnerability_scan,
            "ai_optimization_tips": self.ai_optimization_tips,
            "ai_risk_score": self.ai_risk_score,
            "transaction_count": self.transaction_count,
            "deployed_at": self.deployed_at.isoformat() if self.deployed_at else None,
            "last_execution": self.last_execution.isoformat() if self.last_execution else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "created_by_id": self.created_by_id
        }


# ========== MODÈLE NŒUDS BLOCKCHAIN ==========
class BlockchainNode(Base):
    __tablename__ = "blockchain_nodes"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    address = Column(String(200), unique=True, nullable=False, index=True)
    role = Column(String(50), default="validator")
    stake = Column(Float, default=0.0)
    status = Column(String(20), default="active")
    version = Column(String(20), nullable=True)
    last_seen = Column(DateTime, server_default=func.now())
    joined_at = Column(DateTime, server_default=func.now())
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "address": self.address,
            "role": self.role,
            "stake": self.stake,
            "status": self.status,
            "version": self.version,
            "last_seen": self.last_seen.isoformat() if self.last_seen else None,
            "joined_at": self.joined_at.isoformat() if self.joined_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# ========== MODÈLE ALERTES DE FRAUDE ==========
class BlockchainFraudAlert(Base):
    __tablename__ = "blockchain_fraud_alerts"
    __table_args__ = (
        Index('idx_fraud_alerts_tx_hash', 'transaction_hash'),
        Index('idx_fraud_alerts_risk_level', 'risk_level'),
        Index('idx_fraud_alerts_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False, index=True)
    transaction_hash = Column(String(100), nullable=False, index=True)
    transaction_id = Column(Integer, nullable=True)
    fraud_score = Column(Float, default=0.0)
    risk_level = Column(String(20), default="medium")
    
    # IA Stratégique Alerte Blockchain Nexum
    ai_logic_explanation = Column(Text, nullable=True)
    ai_confidence_score = Column(Float, default=0.0)
    ai_suggested_actions = Column(JSON, default=list)
    last_ai_update = Column(DateTime, default=datetime.utcnow)
    
    description = Column(Text, nullable=False)
    indicators = Column(JSON, default=list)
    status = Column(String(20), default="pending")
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    def to_dict(self):
        return {
            "id": self.id,
            "company_id": self.company_id,
            "transaction_hash": self.transaction_hash,
            "transaction_id": self.transaction_id,
            "fraud_score": self.fraud_score,
            "risk_level": self.risk_level,
            "ai_logic_explanation": self.ai_logic_explanation,
            "ai_confidence_score": self.ai_confidence_score,
            "ai_suggested_actions": self.ai_suggested_actions or [],
            "description": self.description,
            "indicators": self.indicators or [],
            "status": self.status,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }


# ========== ALIAS POUR NŒUDS ==========
Node = BlockchainNode


# ========== MODÈLE LOGS BLOCKCHAIN ==========
class BlockchainLog(Base):
    __tablename__ = "blockchain_logs"
    __table_args__ = (
        Index('idx_blockchain_logs_type', 'log_type'),
        Index('idx_blockchain_logs_created', 'created_at'),
        {'extend_existing': True}
    )

    id = Column(Integer, primary_key=True, index=True)
    log_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    hash = Column(String(100), nullable=True)
    transaction_id = Column(Integer, nullable=True)
    block_height = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.log_type,
            "message": self.message,
            "hash": self.hash,
            "transaction_id": self.transaction_id,
            "block_height": self.block_height,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }


# ========== MODÈLE CONSENSUS ==========
class ConsensusStatus(Base):
    __tablename__ = "consensus_status"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, default=0)
    proposer = Column(String(100), nullable=True)
    validators = Column(JSON, default=list)
    votes = Column(JSON, default=dict)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "round_number": self.round_number,
            "proposer": self.proposer,
            "validators": self.validators or [],
            "votes": self.votes or {},
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None
        }


# ========== EXPORTS ==========
__all__ = [
    "RiskLevel",
    "BlockchainTransaction",
    "BlockchainBlock",
    "Block",
    "Transaction",
    "SmartContract",
    "BlockchainNode",
    "Node",
    "BlockchainFraudAlert",
    "BlockchainLog",
    "ConsensusStatus"
]


# ========== MODÈLE POUR L'ENDPOINT TRANSACTIONS (COMPATIBILITÉ) ==========
# Cette classe est un wrapper pour l'endpoint get_blockchain_transactions
class BlockchainTransactionResponse:
    """Wrapper pour la réponse des transactions blockchain"""
    
    @staticmethod
    def from_transaction(tx: BlockchainTransaction) -> dict:
        """Convertit une transaction en réponse API"""
        return {
            "id": tx.id,
            "hash": tx.hash,
            "from_address": tx.from_address,
            "to_address": tx.to_address,
            "amount": tx.amount,
            "currency": tx.currency,
            "status": tx.status,
            "block_height": tx.block_height,
            "signature": tx.signature,
            "data": tx.data,
            "created_by_id": tx.created_by_id,
            "company_id": tx.company_id,
            "created_at": tx.created_at.isoformat() if tx.created_at else None,
            "updated_at": tx.updated_at.isoformat() if tx.updated_at else None,
            "timestamp": tx.timestamp.isoformat() if tx.timestamp else None,
            "ai_anomaly_score": tx.ai_anomaly_score,
            "web3_verified": tx.status == "confirmed"
        }

# Models Blockchain loaded