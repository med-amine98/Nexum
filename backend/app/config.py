from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Dict
import logging

class Settings(BaseSettings):
    # Configuration de base
    PROJECT_NAME: str = "Nexum ERP - Assistants IA"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Flask (si utilisé)
    FLASK_APP: Optional[str] = None
    FLASK_ENV: Optional[str] = "development"
    JWT_SECRET_KEY: Optional[str] = None
    
    # PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # Neo4j
    NEO4J_URI: Optional[str] = None
    NEO4J_USER: Optional[str] = None
    NEO4J_PASSWORD: Optional[str] = None
    NEO4J_DATABASE: Optional[str] = None
    
    # MinIO
    MINIO_ENDPOINT: Optional[str] = None
    MINIO_ACCESS_KEY: Optional[str] = None
    MINIO_SECRET_KEY: Optional[str] = None
    MINIO_BUCKET: Optional[str] = None
    MINIO_SECURE: bool = False
    MINIO_REGION: str = "us-east-1"
    
    # Spark
    SPARK_MASTER: Optional[str] = None
    SPARK_APP_NAME: str = "Nexum-Assistants"
    SPARK_MEMORY: str = "2g"
    SPARK_CORES: int = 2
    
    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    
    @property
    def REDIS_URL(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # Qdrant
    QDRANT_HOST: str
    QDRANT_PORT: int = 6333
    QDRANT_GRPC_PORT: int = 6334
    QDRANT_COLLECTION: str = "assistant_memory"
    QDRANT_VECTOR_SIZE: int = 384
    QDRANT_ENABLED: bool = True
    
    @property
    def QDRANT_URL(self) -> str:
        return f"http://{self.QDRANT_HOST}:{self.QDRANT_PORT}"
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4-turbo-preview"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_TIMEOUT: int = 60
    OPENAI_MAX_RETRIES: int = 3
    LLM_PROVIDER: str = "openai"  # ← AJOUT CRUCIAL
    
    # Embeddings
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    EMBEDDING_BATCH_SIZE: int = 32
    EMBEDDING_DEVICE: str = "cpu"
    
    # AI Settings
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7
    AI_CONTEXT_WINDOW: int = 10
    AI_TOP_P: float = 0.9
    AI_FREQUENCY_PENALTY: float = 0.0
    AI_PRESENCE_PENALTY: float = 0.0
    AI_RAG_LIMIT: int = 5
    AI_RAG_SCORE_THRESHOLD: float = 0.7
    
    # Assistant specific settings
    ASSISTANT_MEMORY_LIMIT: int = 50
    ASSISTANT_MAX_HISTORY: int = 20
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    
    # Email
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = None
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    SMTP_STARTTLS: bool = True
    ADMIN_EMAILS: list[str] = []  # List of admin emails for alerts
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = None
    LOG_MAX_BYTES: int = 10485760
    LOG_BACKUP_COUNT: int = 5
    
    # Feature Flags
    ENABLE_RAG: bool = True
    ENABLE_VECTOR_MEMORY: bool = True
    ENABLE_TASK_DELEGATION: bool = True
    ENABLE_MULTI_ASSISTANT: bool = True
    ENABLE_VOICE_COMMANDS: bool = False
    ENABLE_METRICS: bool = False
    METRICS_PORT: int = 9090
    
    # Assistant names
    ASSISTANT_PREDICT_NAME: str = "Nexy Predict"
    ASSISTANT_RISK_NAME: str = "Nexy Risk"
    ASSISTANT_GROWTH_NAME: str = "Nexy Growth"
    ASSISTANT_COPILOT_NAME: str = "Copilot"
    
    # Assistant descriptions
    ASSISTANT_PREDICT_DESC: str = "Expert en solutions bancaires et financières"
    ASSISTANT_RISK_DESC: str = "Expert en assurance et gestion des risques"
    ASSISTANT_GROWTH_DESC: str = "Expert en développement commercial"
    ASSISTANT_COPILOT_DESC: str = "Assistant principal et orchestrateur"
    
    @property
    def ASSISTANT_NAMES(self) -> Dict[str, str]:
        return {
            "predict": self.ASSISTANT_PREDICT_NAME,
            "risk": self.ASSISTANT_RISK_NAME,
            "growth": self.ASSISTANT_GROWTH_NAME,
            "copilot": self.ASSISTANT_COPILOT_NAME
        }
    
    @property
    def ASSISTANT_DESCRIPTIONS(self) -> Dict[str, str]:
        return {
            "predict": self.ASSISTANT_PREDICT_DESC,
            "risk": self.ASSISTANT_RISK_DESC,
            "growth": self.ASSISTANT_GROWTH_DESC,
            "copilot": self.ASSISTANT_COPILOT_DESC
        }
    
    # Configuration Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()

def validate_settings():
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info("=" * 60)
    
    if not settings.OPENAI_API_KEY:
        logger.warning("⚠️ OPENAI_API_KEY non définie - Mode démo")
    
    logger.info(f"📦 PostgreSQL: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    logger.info(f"🔍 Qdrant: {settings.QDRANT_URL}")
    logger.info("=" * 60)
    
    return True

__all__ = ["settings", "validate_settings"]