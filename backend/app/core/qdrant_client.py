import datetime
from qdrant_client import QdrantClient
from qdrant_client.http import models
from .config import settings
import logging

logger = logging.getLogger(__name__)

class QdrantManager:
    def __init__(self):
        self.client = QdrantClient(
            host=settings.QDRANT_HOST,
            port=settings.QDRANT_PORT
        )
        self.collection_name = settings.QDRANT_COLLECTION
        self.vector_size = settings.EMBEDDING_DIM
        
    def init_collection(self):
        """Initialise la collection Qdrant"""
        try:
            collections = self.client.get_collections().collections
            if not any(c.name == self.collection_name for c in collections):
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=models.VectorParams(
                        size=self.vector_size,
                        distance=models.Distance.COSINE
                    )
                )
                logger.info(f"Collection {self.collection_name} créée")
        except Exception as e:
            logger.error(f"Erreur init collection: {e}")
    
    def store_embedding(self, assistant_id: str, text: str, embedding: list, metadata: dict = None):
        """Stocke un embedding dans Qdrant"""
        try:
            point_id = f"{assistant_id}_{hash(text)}"
            self.client.upsert(
                collection_name=self.collection_name,
                points=[
                    models.PointStruct(
                        id=point_id,
                        vector=embedding,
                        payload={
                            "assistant_id": assistant_id,
                            "text": text,
                            "metadata": metadata or {},
                            "timestamp": str(datetime.now())
                        }
                    )
                ]
            )
            return point_id
        except Exception as e:
            logger.error(f"Erreur store embedding: {e}")
            return None
    
    def search_similar(self, assistant_id: str, embedding: list, limit: int = 5):
        """Recherche des textes similaires"""
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=embedding,
                query_filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="assistant_id",
                            match=models.MatchValue(value=assistant_id)
                        )
                    ]
                ),
                limit=limit
            )
            return [{"text": r.payload["text"], "score": r.score} for r in results]
        except Exception as e:
            logger.error(f"Erreur search similar: {e}")
            return []

qdrant_manager = QdrantManager()