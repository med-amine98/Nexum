from app.database import engine, Base
from app.models.aml import AMLTransaction, AMLAlert, AMLConfig, AMLReport
from app.models.credit_scoring import CreditRequest, CreditHistory, CreditRule
from app.models.fraud_banking import FraudTransaction, FraudBankingAlert, FraudBankingRule, FraudBankingStats
from app.models.fraud_insurance import FraudInsuranceClaim, FraudInsuranceIndicator, FraudInsuranceRule, FraudInsuranceNetwork
from app.models.kyc import KYCDocument, KYCVerification, KYCRule
from app.models.catastrophe import CatastropheZone, CatastropheEvent, CatastropheScenario, CatastropheAlert
from app.models.risk_scoring import InsurancePolicy, InsuranceClaim, RiskFactor, RiskScoreHistory

if __name__ == "__main__":
    logger.info("🔨 Création de toutes les tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Toutes les tables ont été créées avec succès")
