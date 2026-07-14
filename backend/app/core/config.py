# app/core/config.py
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Dict, List
import logging
import os

class Settings(BaseSettings):
    # Configuration de base
    PROJECT_NAME: str = "Nexum ERP - Assistants IA"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "votre-clé-secrète-très-longue-et-aléatoire"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Flask (si utilisé)
    FLASK_APP: Optional[str] = None
    FLASK_ENV: Optional[str] = "development"
    JWT_SECRET_KEY: Optional[str] = None
    
    # PostgreSQL
    POSTGRES_USER: str = "odoo"
    POSTGRES_PASSWORD: str = "odoo"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: str = "5432"
    POSTGRES_DB: str = "erp"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # ============================================
    # NEO4J - CONFIGURATION RÉELLE
    # ============================================
    NEO4J_URI: str = Field(default="bolt://neura-neo4j:7687", alias="NEO4J_URI")
    NEO4J_USER: str = Field(default="neo4j", alias="NEO4J_USER")
    NEO4J_PASSWORD: str = Field(default="neo4j123", alias="NEO4J_PASSWORD")
    NEO4J_DATABASE: str = Field(default="neo4j", alias="NEO4J_DATABASE")
    NEO4J_MAX_CONNECTION_LIFETIME: int = 3000
    NEO4J_CONNECTION_TIMEOUT: int = 30
    
    # ============================================
    # KAFKA - CONFIGURATION RÉELLE
    # ============================================
    KAFKA_BOOTSTRAP_SERVERS: str = Field(default="neura-kafka:9092", alias="KAFKA_BOOTSTRAP_SERVERS")
    KAFKA_TOPIC_TRANSACTIONS: str = Field(default="transactions-verdict", alias="KAFKA_TOPIC_TRANSACTIONS")
    KAFKA_TOPIC_ALERTS: str = Field(default="fraud-alerts", alias="KAFKA_TOPIC_ALERTS")
    KAFKA_TOPIC_ANALYTICS: str = Field(default="analytics-events", alias="KAFKA_TOPIC_ANALYTICS")
    KAFKA_TOPIC_PREPROCESSED: str = Field(default="transactions-preprocessed", alias="KAFKA_TOPIC_PREPROCESSED")
    KAFKA_TOPIC_RAW: str = Field(default="transactions-raw", alias="KAFKA_TOPIC_RAW")
    KAFKA_TOPIC_ASSISTANT: str = Field(default="assistant-events", alias="KAFKA_TOPIC_ASSISTANT")
    KAFKA_TOPIC_FEEDBACK: str = Field(default="feedback-loop", alias="KAFKA_TOPIC_FEEDBACK")
    KAFKA_CONSUMER_GROUP: str = Field(default="fraud-detection-group", alias="KAFKA_CONSUMER_GROUP")
    KAFKA_AUTO_OFFSET_RESET: str = Field(default="earliest", alias="KAFKA_AUTO_OFFSET_RESET")
    KAFKA_ENABLE_AUTO_COMMIT: bool = Field(default=True, alias="KAFKA_ENABLE_AUTO_COMMIT")
    KAFKA_REQUEST_TIMEOUT_MS: int = Field(default=10000, alias="KAFKA_REQUEST_TIMEOUT_MS")
    KAFKA_CONSUMER_TIMEOUT_MS: int = Field(default=3000, alias="KAFKA_CONSUMER_TIMEOUT_MS")
    
    # ============================================
    # SPARK - CONFIGURATION RÉELLE
    # ============================================
    SPARK_MASTER: str = Field(default="spark://neura-spark-master:7077", alias="SPARK_MASTER")
    SPARK_APP_NAME: str = Field(default="FraudDetection", alias="SPARK_APP_NAME")
    SPARK_MEMORY: str = Field(default="2g", alias="SPARK_MEMORY")
    SPARK_CORES: int = Field(default=2, alias="SPARK_CORES")
    SPARK_UI_URL: str = Field(default="http://neura-spark-master:8080", alias="SPARK_UI_URL")
    SPARK_DRIVER_MEMORY: str = Field(default="1g", alias="SPARK_DRIVER_MEMORY")
    SPARK_EXECUTOR_MEMORY: str = Field(default="2g", alias="SPARK_EXECUTOR_MEMORY")
    SPARK_EXECUTOR_CORES: int = Field(default=2, alias="SPARK_EXECUTOR_CORES")
    SPARK_SQL_SHUFFLE_PARTITIONS: int = Field(default=200, alias="SPARK_SQL_SHUFFLE_PARTITIONS")
    SPARK_STREAMING_BATCH_INTERVAL: int = Field(default=5, alias="SPARK_STREAMING_BATCH_INTERVAL")  # secondes
    
    # ============================================
    # GRAPH TRANSFORMER (GNN) - CONFIGURATION RÉELLE
    # ============================================
    GRAPH_TRANSFORMER_URL: str = Field(default="http://neura-graph-transformer:8000", alias="GRAPH_TRANSFORMER_URL")
    GRAPH_TRANSFORMER_MODEL_PATH: str = Field(default="/app/models/graph_transformer_v1.pt", alias="GRAPH_TRANSFORMER_MODEL_PATH")
    GRAPH_TRANSFORMER_TIMEOUT: int = Field(default=10, alias="GRAPH_TRANSFORMER_TIMEOUT")
    GRAPH_TRANSFORMER_MAX_RETRIES: int = Field(default=3, alias="GRAPH_TRANSFORMER_MAX_RETRIES")
    GRAPH_TRANSFORMER_IN_CHANNELS: int = Field(default=384, alias="GRAPH_TRANSFORMER_IN_CHANNELS")
    GRAPH_TRANSFORMER_HIDDEN_CHANNELS: int = Field(default=128, alias="GRAPH_TRANSFORMER_HIDDEN_CHANNELS")
    GRAPH_TRANSFORMER_OUT_CHANNELS: int = Field(default=64, alias="GRAPH_TRANSFORMER_OUT_CHANNELS")
    GRAPH_TRANSFORMER_HEALTH_CHECK_INTERVAL: int = Field(default=30, alias="GRAPH_TRANSFORMER_HEALTH_CHECK_INTERVAL")  # secondes
    
    # ============================================
    # GROVER QUANTUM - CONFIGURATION RÉELLE
    # ============================================
    GROVER_URL: str = Field(default="http://neura-grover:8000", alias="GROVER_URL")
    GROVER_HEALTH_CHECK_INTERVAL: int = Field(default=30, alias="GROVER_HEALTH_CHECK_INTERVAL")
    GROVER_TIMEOUT: int = Field(default=10, alias="GROVER_TIMEOUT")
    GROVER_MAX_RETRIES: int = Field(default=3, alias="GROVER_MAX_RETRIES")
    GROVER_USE_QUANTUM: bool = Field(default=True, alias="GROVER_USE_QUANTUM")
    GROVER_OPTIMIZATION_ITERATIONS: int = Field(default=100, alias="GROVER_OPTIMIZATION_ITERATIONS")
    
    # ============================================
    # BLOCKCHAIN WEB3 - CONFIGURATION RÉELLE
    # ============================================
    WEB3_RPC_URL: str = Field(default="http://neura-blockchain:8545", alias="WEB3_RPC_URL")
    BLOCKCHAIN_API_URL: str = Field(default="http://neura-blockchain:8008", alias="BLOCKCHAIN_API_URL")
    BLOCKCHAIN_CHAIN_ID: int = Field(default=1337, alias="BLOCKCHAIN_CHAIN_ID")
    BLOCKCHAIN_GAS_LIMIT: int = Field(default=8000000, alias="BLOCKCHAIN_GAS_LIMIT")
    BLOCKCHAIN_GAS_PRICE: int = Field(default=20000000000, alias="BLOCKCHAIN_GAS_PRICE")  # 20 Gwei
    BLOCKCHAIN_CONFIRMATIONS: int = Field(default=1, alias="BLOCKCHAIN_CONFIRMATIONS")
    BLOCKCHAIN_HEALTH_CHECK_INTERVAL: int = Field(default=30, alias="BLOCKCHAIN_HEALTH_CHECK_INTERVAL")
    WEB3_TIMEOUT: int = Field(default=10, alias="WEB3_TIMEOUT")
    
    # ============================================
    # REDIS - CONFIGURATION RÉELLE
    # ============================================
    REDIS_HOST: str = Field(default="neura-redis", alias="REDIS_HOST")
    REDIS_PORT: int = Field(default=6379, alias="REDIS_PORT")
    REDIS_DB: int = Field(default=0, alias="REDIS_DB")
    REDIS_PASSWORD: Optional[str] = Field(default=None, alias="REDIS_PASSWORD")
    
    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # ============================================
    # QDRANT - CONFIGURATION RÉELLE
    # ============================================
    QDRANT_HOST: str = Field(default="neura-qdrant", alias="QDRANT_HOST")
    QDRANT_PORT: int = Field(default=6333, alias="QDRANT_PORT")
    QDRANT_GRPC_PORT: int = Field(default=6334, alias="QDRANT_GRPC_PORT")
    QDRANT_COLLECTION: str = Field(default="transactions", alias="QDRANT_COLLECTION")
    QDRANT_VECTOR_SIZE: int = Field(default=384, alias="QDRANT_VECTOR_SIZE")
    QDRANT_API_KEY: Optional[str] = Field(default=None, alias="QDRANT_API_KEY")
    QDRANT_PREFER_GRPC: bool = Field(default=False, alias="QDRANT_PREFER_GRPC")
    QDRANT_TIMEOUT: int = Field(default=10, alias="QDRANT_TIMEOUT")
    
    @property
    def QDRANT_URL(self) -> str:
        return f"http://{self.QDRANT_HOST}:{self.QDRANT_PORT}"
    
    # ============================================
    # MINIO - CONFIGURATION RÉELLE
    # ============================================
    MINIO_ENDPOINT: str = Field(default="neura-minio:9000", alias="MINIO_ENDPOINT")
    MINIO_ACCESS_KEY: str = Field(default="minioadmin", alias="MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY: str = Field(default="minioadmin", alias="MINIO_SECRET_KEY")
    MINIO_BUCKET: str = Field(default="assistant-documents", alias="MINIO_BUCKET")
    MINIO_SECURE: bool = Field(default=False, alias="MINIO_SECURE")
    MINIO_REGION: str = Field(default="us-east-1", alias="MINIO_REGION")
    
    # ============================================
    # OPENAI - CONFIGURATION RÉELLE
    # ============================================
    OPENAI_API_KEY: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    OPENAI_MODEL: str = Field(default="gpt-4-turbo-preview", alias="OPENAI_MODEL")
    OPENAI_BASE_URL: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    OPENAI_TIMEOUT: int = Field(default=60, alias="OPENAI_TIMEOUT")
    OPENAI_MAX_RETRIES: int = Field(default=3, alias="OPENAI_MAX_RETRIES")
    
    # ============================================
    # EMBEDDINGS - CONFIGURATION RÉELLE
    # ============================================
    EMBEDDING_MODEL: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", alias="EMBEDDING_MODEL")
    EMBEDDING_DIM: int = Field(default=384, alias="EMBEDDING_DIM")
    EMBEDDING_BATCH_SIZE: int = Field(default=32, alias="EMBEDDING_BATCH_SIZE")
    EMBEDDING_DEVICE: str = Field(default="cpu", alias="EMBEDDING_DEVICE")
    
    # ============================================
    # AI SETTINGS
    # ============================================
    AI_MAX_TOKENS: int = 4096
    AI_TEMPERATURE: float = 0.7
    AI_CONTEXT_WINDOW: int = 10
    AI_TOP_P: float = 0.9
    AI_FREQUENCY_PENALTY: float = 0.0
    AI_PRESENCE_PENALTY: float = 0.0
    AI_RAG_LIMIT: int = 5
    AI_RAG_SCORE_THRESHOLD: float = 0.7
    
    # ============================================
    # ASSISTANT SETTINGS
    # ============================================
    ASSISTANT_MEMORY_LIMIT: int = 50
    ASSISTANT_MAX_HISTORY: int = 20
    
    ASSISTANT_PREDICT_NAME: str = "Nexy Predict"
    ASSISTANT_RISK_NAME: str = "Nexy Risk"
    ASSISTANT_GROWTH_NAME: str = "Nexy Growth"
    ASSISTANT_COPILOT_NAME: str = "Copilot"
    
    ASSISTANT_PREDICT_DESC: str = "Expert en solutions bancaires et financières - Scoring crédit, détection fraude, prévisions"
    ASSISTANT_RISK_DESC: str = "Expert en assurance et gestion des risques - Sinistres, scoring risques, modélisation catastrophe"
    ASSISTANT_GROWTH_DESC: str = "Expert en développement commercial - Ventes, attrition, cross-selling, optimisation pipeline"
    ASSISTANT_COPILOT_DESC: str = "Assistant principal et orchestrateur - Coordination et délégation aux assistants spécialisés"
    
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
    
    # ============================================
    # RATE LIMITING
    # ============================================
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    
    # ============================================
    # EMAIL
    # ============================================
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = "assistants@nexum.com"
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = "assistants@nexum.com"
    SMTP_STARTTLS: bool = True
    SMTP_SSL: bool = False
    
    # ============================================
    # LOGGING
    # ============================================
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE: Optional[str] = "/app/logs/assistants.log"
    LOG_MAX_BYTES: int = 10485760
    LOG_BACKUP_COUNT: int = 5
    
    # ============================================
    # FEATURE FLAGS
    # ============================================
    ENABLE_RAG: bool = True
    ENABLE_VECTOR_MEMORY: bool = True
    ENABLE_TASK_DELEGATION: bool = True
    ENABLE_MULTI_ASSISTANT: bool = True
    ENABLE_VOICE_COMMANDS: bool = False
    ENABLE_METRICS: bool = False
    METRICS_PORT: int = 9090
    
    # ============================================
    # FRAUD DETECTION - CONFIGURATION RÉELLE
    # ============================================
    FRAUD_DETECTION_ENABLED: bool = True
    FRAUD_CLASSIFICATION_THRESHOLD: float = 0.6
    FRAUD_REAL_TIME_ANALYSIS: bool = True
    FRAUD_USE_GRAPH_ANALYSIS: bool = True
    FRAUD_USE_QUANTUM_OPTIMIZATION: bool = True
    FRAUD_RECORD_TO_BLOCKCHAIN: bool = True
    FRAUD_ALERT_CHANNELS: List[str] = ["kafka", "websocket", "email"]
    
    # ============================================
    # DAMAGE ESTIMATION - CONFIGURATION RÉELLE
    # ============================================
    UPLOAD_DIR: str = "uploads"
    DAMAGE_PHOTOS_DIR: str = "damage_photos"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_IMAGE_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
    
    @property
    def DAMAGE_PHOTOS_PATH(self) -> str:
        return os.path.join(self.UPLOAD_DIR, self.DAMAGE_PHOTOS_DIR)
    
    DAMAGE_DETECTION_MODEL: str = "yolov8n"
    DAMAGE_DETECTION_CONFIDENCE_THRESHOLD: float = 0.5
    DAMAGE_DETECTION_IOU_THRESHOLD: float = 0.45
    
    DEFAULT_REPAIR_HOURLY_RATE: float = 60.0
    DEFAULT_MATERIALS_MARKUP: float = 1.2
    DEFAULT_WARRANTY_MONTHS: int = 12
    
    DEFAULT_REPAIR_OPTIONS: Dict = {
        "standard": {
            "name": "Réparation standard",
            "multiplier": 0.9,
            "delay_days": [3, 7],
            "warranty_months": 12
        },
        "express": {
            "name": "Réparation express",
            "multiplier": 1.2,
            "delay_days": [1, 3],
            "warranty_months": 6
        },
        "premium": {
            "name": "Remplacement des pièces",
            "multiplier": 1.8,
            "delay_days": [5, 14],
            "warranty_months": 24
        }
    }
    
    DAMAGE_SEVERITY_FACTORS: Dict[int, float] = {
        1: 0.3, 2: 0.4, 3: 0.5, 4: 0.6, 5: 0.7,
        6: 0.8, 7: 0.9, 8: 1.0, 9: 1.2, 10: 1.5
    }
    
    DAMAGE_TYPE_MULTIPLIERS: Dict[str, float] = {
        "rayure": 0.5, "éclat": 0.6, "bosse": 0.8,
        "fissure": 1.0, "déformation": 1.2, "cassure": 1.5
    }
    
    AUTO_PARTS_REFERENCE: Dict[str, Dict] = {
        "pare-chocs avant": {"min": 300, "max": 800, "replacement": 450},
        "pare-chocs arrière": {"min": 300, "max": 800, "replacement": 450},
        "capot": {"min": 400, "max": 1000, "replacement": 550},
        "coffre": {"min": 350, "max": 900, "replacement": 500},
        "porte avant gauche": {"min": 400, "max": 1200, "replacement": 650},
        "porte avant droite": {"min": 400, "max": 1200, "replacement": 650},
        "porte arrière gauche": {"min": 350, "max": 1000, "replacement": 600},
        "porte arrière droite": {"min": 350, "max": 1000, "replacement": 600},
        "aile avant gauche": {"min": 200, "max": 500, "replacement": 350},
        "aile avant droite": {"min": 200, "max": 500, "replacement": 350},
        "rétroviseur gauche": {"min": 80, "max": 200, "replacement": 180},
        "rétroviseur droit": {"min": 80, "max": 200, "replacement": 180},
        "phare avant gauche": {"min": 150, "max": 400, "replacement": 280},
        "phare avant droit": {"min": 150, "max": 400, "replacement": 280},
        "jante": {"min": 100, "max": 300, "replacement": 200}
    }
    
    HOME_PARTS_REFERENCE: Dict[str, Dict] = {
        "fenêtre": {"min": 150, "max": 400, "replacement": 350},
        "vitre": {"min": 100, "max": 300, "replacement": 250},
        "porte": {"min": 200, "max": 600, "replacement": 400},
        "plafond": {"min": 100, "max": 400, "replacement": None},
        "mur": {"min": 120, "max": 500, "replacement": None},
        "sol": {"min": 150, "max": 600, "replacement": None},
        "toiture": {"min": 500, "max": 3000, "replacement": None}
    }
    
    # Configuration Pydantic V2
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

# Instance globale des settings
settings = Settings()

# Créer les dossiers d'upload s'ils n'existent pas
def ensure_upload_directories():
    """Crée les dossiers d'upload s'ils n'existent pas"""
    try:
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        os.makedirs(settings.DAMAGE_PHOTOS_PATH, exist_ok=True)
    except Exception as e:
        logging.warning(f"Impossible de créer les dossiers d'upload: {e}")

# Validation au démarrage
def validate_settings():
    """Valide les settings critiques au démarrage"""
    logger = logging.getLogger(__name__)
    
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info("=" * 60)
    
    # Vérifier SECRET_KEY
    if settings.SECRET_KEY == "votre-clé-secrète-très-longue-et-aléatoire":
        logger.warning("⚠️ SECRET_KEY utilise la valeur par défaut - Changez-la en production!")
    
    # Vérifier les connexions aux services
    logger.info("📦 Services configurés:")
    logger.info(f"   - PostgreSQL: {settings.POSTGRES_HOST}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}")
    logger.info(f"   - Kafka: {settings.KAFKA_BOOTSTRAP_SERVERS}")
    logger.info(f"   - Spark: {settings.SPARK_MASTER}")
    logger.info(f"   - Neo4j: {settings.NEO4J_URI}")
    logger.info(f"   - GraphTransformer: {settings.GRAPH_TRANSFORMER_URL}")
    logger.info(f"   - Grover: {settings.GROVER_URL}")
    logger.info(f"   - Blockchain: {settings.WEB3_RPC_URL}")
    logger.info(f"   - Qdrant: {settings.QDRANT_URL}")
    logger.info(f"   - Redis: {settings.REDIS_URL}")
    logger.info(f"   - MinIO: {settings.MINIO_ENDPOINT}")
    
    # Feature flags
    logger.info("🔧 Feature Flags:")
    logger.info(f"   - Détection fraude: {'✅' if settings.FRAUD_DETECTION_ENABLED else '❌'}")
    logger.info(f"   - Analyse temps réel: {'✅' if settings.FRAUD_REAL_TIME_ANALYSIS else '❌'}")
    logger.info(f"   - Analyse graphe: {'✅' if settings.FRAUD_USE_GRAPH_ANALYSIS else '❌'}")
    logger.info(f"   - Optimisation quantique: {'✅' if settings.FRAUD_USE_QUANTUM_OPTIMIZATION else '❌'}")
    logger.info(f"   - Blockchain: {'✅' if settings.FRAUD_RECORD_TO_BLOCKCHAIN else '❌'}")
    
    # Créer les dossiers d'upload
    ensure_upload_directories()
    
    logger.info("=" * 60)
    
    return True

# Exporter les settings et la fonction de validation
__all__ = ["settings", "validate_settings", "ensure_upload_directories"]