# app/services/embedding_service.py
import logging
import numpy as np
from typing import List

logger = logging.getLogger(__name__)

# Tentative d'import avec gestion d'erreur
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
    logger.info("✅ Sentence-transformers chargé")
except ImportError as e:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.warning(f"⚠️ sentence-transformers non disponible: {e}")
    
    # Fallback simple
    class SentenceTransformer:
        def __init__(self, model_name):
            self.model_name = model_name
            logger.info(f"Mode démo - utilisation du modèle {model_name}")
        
        def encode(self, text):
            return np.random.randn(384).tolist()
        
        def encode(self, texts):
            return [np.random.randn(384).tolist() for _ in texts]

class EmbeddingService:
    def __init__(self):
        self.model = None
        self.available = SENTENCE_TRANSFORMERS_AVAILABLE
        
        try:
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                logger.info("✅ Mode démo embedding activé")
            else:
                logger.info("✅ Modèle d'embedding chargé")
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle: {e}")
            self.model = None
    
    def encode(self, text: str) -> List[float]:
        """Convertit un texte en embedding"""
        if not self.model:
            return list(np.random.randn(384).astype(float))
        
        try:
            embedding = self.model.encode(text)
            return embedding.tolist() if hasattr(embedding, 'tolist') else embedding
        except Exception as e:
            logger.error(f"Erreur encodage: {e}")
            return list(np.random.randn(384).astype(float))
    
    def encode_batch(self, texts: List[str]) -> List[List[float]]:
        """Convertit plusieurs textes en embeddings"""
        if not self.model:
            return [list(np.random.randn(384).astype(float)) for _ in texts]
        
        try:
            embeddings = self.model.encode(texts)
            return [e.tolist() if hasattr(e, 'tolist') else e for e in embeddings]
        except Exception as e:
            logger.error(f"Erreur encodage batch: {e}")
            return [list(np.random.randn(384).astype(float)) for _ in texts]

embedding_service = EmbeddingService()