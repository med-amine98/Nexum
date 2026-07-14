from fastapi import APIRouter, HTTPException
from neo4j import GraphDatabase
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/neo4j", tags=["neo4j"])

# Configuration Neo4j
NEO4J_URI = "bolt://neura-neo4j:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "neo4j123"

class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    def close(self):
        self.driver.close()
    
    def run_query(self, query: str, parameters: dict = None) -> List[Dict]:
        with self.driver.session() as session:
            result = session.run(query, parameters or {})
            return [record.data() for record in result]

neo4j = Neo4jClient()

@router.get("/transactions")
async def get_neo4j_transactions(limit: int = 50):
    """Récupérer les transactions depuis Neo4j"""
    try:
        query = """
        MATCH (s:Account)-[r:SENT]->(t:Account)
        WHERE r.enriched_by = 'spark'
        RETURN 
            r.transaction_id as transaction_id,
            r.amount as amount,
            r.currency as currency,
            r.timestamp as timestamp,
            r.fraud_score as fraud_score,
            r.risk_level as risk_level,
            r.enriched_by as enriched_by,
            s.name as sender_name,
            s.id as sender_id,
            t.name as recipient_name,
            t.id as recipient_id
        ORDER BY r.timestamp DESC
        LIMIT $limit
        """
        
        results = neo4j.run_query(query, {"limit": limit})
        
        # Formater les résultats
        transactions = []
        for record in results:
            transactions.append({
                "transaction_id": record.get("transaction_id"),
                "amount": record.get("amount"),
                "currency": record.get("currency") or "EUR",
                "timestamp": record.get("timestamp"),
                "fraud_score": record.get("fraud_score") or 0,
                "risk_level": record.get("risk_level") or "low",
                "enriched_by": record.get("enriched_by") or "spark",
                "sender": {
                    "id": record.get("sender_id"),
                    "name": record.get("sender_name")
                },
                "recipient": {
                    "id": record.get("recipient_id"),
                    "name": record.get("recipient_name")
                }
            })
        
        return {"transactions": transactions, "total": len(transactions)}
        
    except Exception as e:
        logger.error(f"Erreur Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/transactions/{transaction_id}")
async def get_neo4j_transaction(transaction_id: str):
    """Récupérer une transaction spécifique depuis Neo4j"""
    try:
        query = """
        MATCH (s:Account)-[r:SENT]->(t:Account)
        WHERE r.transaction_id = $transaction_id
        RETURN 
            r.transaction_id as transaction_id,
            r.amount as amount,
            r.currency as currency,
            r.timestamp as timestamp,
            r.fraud_score as fraud_score,
            r.risk_level as risk_level,
            r.enriched_by as enriched_by,
            s.name as sender_name,
            s.id as sender_id,
            t.name as recipient_name,
            t.id as recipient_id
        """
        
        results = neo4j.run_query(query, {"transaction_id": transaction_id})
        
        if not results:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        
        record = results[0]
        return {
            "transaction_id": record.get("transaction_id"),
            "amount": record.get("amount"),
            "currency": record.get("currency") or "EUR",
            "timestamp": record.get("timestamp"),
            "fraud_score": record.get("fraud_score") or 0,
            "risk_level": record.get("risk_level") or "low",
            "enriched_by": record.get("enriched_by") or "spark",
            "sender": {
                "id": record.get("sender_id"),
                "name": record.get("sender_name")
            },
            "recipient": {
                "id": record.get("recipient_id"),
                "name": record.get("recipient_name")
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats")
async def get_neo4j_stats():
    """Récupérer les statistiques depuis Neo4j"""
    try:
        query = """
        MATCH (s:Account)-[r:SENT]->(t:Account)
        WHERE r.enriched_by = 'spark'
        RETURN 
            count(r) as total_transactions,
            avg(r.amount) as avg_amount,
            max(r.amount) as max_amount,
            min(r.amount) as min_amount,
            avg(r.fraud_score) as avg_fraud_score,
            sum(CASE WHEN r.fraud_score > 0.6 THEN 1 ELSE 0 END) as fraud_count
        """
        
        results = neo4j.run_query(query)
        stats = results[0] if results else {}
        
        return {
            "total_transactions": stats.get("total_transactions", 0),
            "avg_amount": stats.get("avg_amount", 0),
            "max_amount": stats.get("max_amount", 0),
            "min_amount": stats.get("min_amount", 0),
            "avg_fraud_score": stats.get("avg_fraud_score", 0),
            "fraud_count": stats.get("fraud_count", 0)
        }
        
    except Exception as e:
        logger.error(f"Erreur Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/risk-distribution")
async def get_risk_distribution():
    """Récupérer la distribution des risques"""
    try:
        query = """
        MATCH (s:Account)-[r:SENT]->(t:Account)
        WHERE r.enriched_by = 'spark'
        RETURN 
            r.risk_level as risk_level,
            count(*) as count,
            avg(r.amount) as avg_amount
        ORDER BY 
            CASE r.risk_level 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END
        """
        
        results = neo4j.run_query(query)
        return {"distribution": results}
        
    except Exception as e:
        logger.error(f"Erreur Neo4j: {e}")
        raise HTTPException(status_code=500, detail=str(e))
