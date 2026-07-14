import json
from datetime import datetime
from typing import Any, Dict

# Placeholder for embedding function – replace with actual model call
def embed_text(text: str) -> list[float]:
    # Simple dummy embedding (e.g., length vector)
    return [len(text) % 1000 / 1000.0]

class LearningManager:
    def __init__(self, qdrant_client):
        self.qdrant = qdrant_client

    def log_interaction(self, user_id: int, text: str, metadata: Optional[Dict[str, Any]] = None):
        """Store raw interaction in a local table (optional) and upsert to Qdrant."""
        # Here you could insert into a DB table for audit – omitted for brevity
        self.embed_and_upsert(user_id, text, metadata)

    def embed_and_upsert(self, user_id: int, text: str, metadata: Optional[Dict[str, Any]] = None):
        vector = embed_text(text)
        payload = {
            "user_id": user_id,
            "text": text,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if metadata:
            payload.update(metadata)
        # Upsert into Qdrant collection "interactions"
        self.qdrant.upsert(collection_name="interactions", points=[
            {
                "id": f"{user_id}_{int(datetime.utcnow().timestamp())}",
                "vector": vector,
                "payload": payload,
            }
        ])
