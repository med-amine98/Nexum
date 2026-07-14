from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON, ForeignKey, Enum, LargeBinary, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import os
from app.utils.security import encrypt_data, decrypt_data

# Enums for status and payment providers
class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class PaymentProvider(str, enum.Enum):
    STRIPE = "stripe"
    BANK_TRANSFER = "bank_transfer"
    CRYPTO = "crypto"

# Mixin amélioré avec compatibilité Odoo
class AuditMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Compatibilité Odoo - ajout des colonnes standard Odoo
    create_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    write_date = Column(DateTime(timezone=True), onupdate=func.now())
    create_uid = Column(Integer, nullable=True)
    write_uid = Column(Integer, nullable=True)

# Subscription Plan model
class SubscriptionPlan(Base, AuditMixin):
    __tablename__ = "subscription_plans"
    __table_args__ = (
        Index("ix_subscription_plans_code", "code"),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, index=True)  # e.g., free, standard, premium, enterprise
    price = Column(Float, nullable=False, default=0.0)
    billing_cycle = Column(String(20), nullable=False, default="monthly")
    description = Column(String(255), nullable=True)
    trial_days = Column(Integer, nullable=False, default=0)
    max_users = Column(Integer, nullable=False, default=5)
    max_storage_gb = Column(Float, nullable=False, default=1.0)
    tax_rate = Column(Float, nullable=False, default=0.0)
    features = Column(JSON, nullable=True)  # List of feature flags
    is_active = Column(Boolean, default=True, nullable=False)
    iso_compliance = Column(Boolean, default=False, nullable=False)  # ISO‑27001 flag

# SaaS Payment model
class SaaSPayment(Base, AuditMixin):
    __tablename__ = "saas_payments"
    __table_args__ = (
        Index("ix_saas_payments_company_id", "company_id"),
        Index("ix_saas_payments_plan_id", "plan_id"),
        Index("ix_saas_payments_status", "status"),
        {"extend_existing": True}
    )

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=False)

    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="EUR")
    status = Column(Enum(PaymentStatus), nullable=False, default=PaymentStatus.PENDING)
    provider = Column(Enum(PaymentProvider), nullable=False, default=PaymentProvider.STRIPE)

    # Encrypted fields for sensitive data
    encrypted_payment_method = Column(LargeBinary, nullable=True)
    encrypted_transaction_id = Column(LargeBinary, nullable=True)

    receipt_url = Column(String(500), nullable=True)
    metadata = Column(JSON, nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="payments")
    plan = relationship("SubscriptionPlan", back_populates="payments")

    # Helper properties for encryption/decryption
    @property
    def payment_method(self):
        if self.encrypted_payment_method:
            return decrypt_data(self.encrypted_payment_method)
        return None

    @payment_method.setter
    def payment_method(self, value: str):
        if value:
            self.encrypted_payment_method = encrypt_data(value)
        else:
            self.encrypted_payment_method = None

    @property
    def transaction_id(self):
        if self.encrypted_transaction_id:
            return decrypt_data(self.encrypted_transaction_id)
        return None

    @transaction_id.setter
    def transaction_id(self, value: str):
        if value:
            self.encrypted_transaction_id = encrypt_data(value)
        else:
            self.encrypted_transaction_id = None