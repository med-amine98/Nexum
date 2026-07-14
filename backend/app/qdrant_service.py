from qdrant_client import QdrantClient

client = QdrantClient(host="qdrant", port=6333)

def process_vector(data):

    vector = [0.1]*384  # placeholder embedding

    client.upsert(
        collection_name="assistant_memory",
        points=[
            {
                "id": data.get("user_id", 0),
                "vector": vector,
                "payload": data
            }
        ]
    )