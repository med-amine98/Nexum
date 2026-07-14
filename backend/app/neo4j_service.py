from neo4j import GraphDatabase
import os
import logging
logger = logging.getLogger(__name__)

# 🔗 Connexion Neo4j (via docker)
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j123")

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USER, NEO4J_PASSWORD)
)

# ==========================
# INSERT TRANSACTION GRAPH
# ==========================
def insert_tx(data):
    """
    Crée :
    (User)-[:MADE]->(Transaction)-[:USING]->(Device)
    """

    try:
        with driver.session() as session:
            session.run("""
            MERGE (u:User {id: $user_id})
            MERGE (d:Device {type: $device})

            CREATE (t:Transaction {
                amount: $amount,
                timestamp: timestamp()
            })

            CREATE (u)-[:MADE]->(t)
            CREATE (t)-[:USING]->(d)
            """,
            user_id=data.get("user_id", 0),
            amount=data.get("amount", 0),
            device=data.get("device", "unknown")
            )

    except Exception as e:
        logger.error("❌ Neo4j error:", e)