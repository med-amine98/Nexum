# app/services/neo4j_service.py
"""
Service Neo4j - Connexion réelle au conteneur neura-neo4j
"""

import logging
from typing import Dict, Any, List, Optional
from neo4j import GraphDatabase, Session, Result, Transaction

from app.core.config import settings

logger = logging.getLogger(__name__)

class Neo4jService:
    """Service Neo4j pour l'analyse des graphes"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.driver = None
        self.is_connected = False
        self._connect()
        logger.info(f"✅ Neo4jService initialisé ({settings.NEO4J_URI})")
    
    def _connect(self):
        """Connecte à Neo4j"""
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                max_connection_lifetime=settings.NEO4J_MAX_CONNECTION_LIFETIME
            )
            
            # Tester la connexion
            with self.driver.session() as session:
                result = session.run("RETURN 1 as test")
                if result.single():
                    self.is_connected = True
                    logger.info(f"✅ Connecté à Neo4j sur {settings.NEO4J_URI}")
                else:
                    logger.error("❌ Échec de connexion Neo4j")
                    self.is_connected = False
                    
        except Exception as e:
            logger.error(f"❌ Erreur connexion Neo4j: {e}")
            self.is_connected = False
    
    def query(self, query: str, parameters: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Exécute une requête Cypher"""
        if not self.is_connected or not self.driver:
            self._connect()
            if not self.is_connected or not self.driver:
                return []
        
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            logger.error(f"❌ Erreur requête Neo4j: {e}")
            return []
    
    def save_transaction(self, transaction: Dict[str, Any]) -> bool:
        """Sauvegarde une transaction dans Neo4j"""
        query = """
        CREATE (t:Transaction {
            id: $id,
            amount: $amount,
            currency: $currency,
            timestamp: $timestamp,
            status: $status,
            fraud_score: $fraud_score,
            risk_level: $risk_level
        })
        WITH t
        MERGE (s:Account {id: $sender_id})
        ON CREATE SET s.name = $sender_name, s.country = $sender_country
        MERGE (r:Account {id: $recipient_id})
        ON CREATE SET r.name = $recipient_name, r.country = $recipient_country
        CREATE (s)-[:SENT {amount: $amount, timestamp: $timestamp}]->(t)
        CREATE (t)-[:RECEIVED_BY]->(r)
        RETURN t.id as transaction_id
        """
        
        params = {
            "id": transaction.get("transaction_id"),
            "amount": transaction.get("amount", 0),
            "currency": transaction.get("currency", "EUR"),
            "timestamp": transaction.get("timestamp"),
            "status": transaction.get("status", "pending"),
            "fraud_score": transaction.get("fraud_score", 0),
            "risk_level": transaction.get("risk_level", "low"),
            "sender_id": transaction.get("sender", {}).get("id", "unknown"),
            "sender_name": transaction.get("sender", {}).get("name", "Inconnu"),
            "sender_country": transaction.get("sender", {}).get("country", "FR"),
            "recipient_id": transaction.get("recipient", {}).get("id", "unknown"),
            "recipient_name": transaction.get("recipient", {}).get("name", "Inconnu"),
            "recipient_country": transaction.get("recipient", {}).get("country", "FR")
        }
        
        try:
            result = self.query(query, params)
            return len(result) > 0
        except Exception as e:
            logger.error(f"❌ Erreur sauvegarde Neo4j: {e}")
            return False
    
    def get_transaction_graph(self, transaction_id: str) -> Dict[str, Any]:
        """Récupère le graphe d'une transaction"""
        query = """
        MATCH (t:Transaction {id: $id})
        OPTIONAL MATCH (t)-[:SENT_BY]->(s:Account)
        OPTIONAL MATCH (t)-[:RECEIVED_BY]->(r:Account)
        OPTIONAL MATCH (s)-[:RELATED_TO*1..2]-(a:Account)-[:RELATED_TO*1..2]-(r)
        RETURN 
            t.id as transaction_id,
            t.amount as amount,
            t.timestamp as timestamp,
            s.id as sender_id,
            s.name as sender_name,
            r.id as receiver_id,
            r.name as receiver_name,
            count(DISTINCT a) as intermediaries,
            collect(DISTINCT a.id) as intermediary_accounts,
            exists((s)-[:RELATED_TO]-(r)) as is_related
        """
        
        result = self.query(query, {"id": transaction_id})
        return result[0] if result else {}
    
    def get_account_network(self, account_id: str, depth: int = 3) -> Dict[str, Any]:
        """Récupère le réseau d'un compte"""
        query = """
        MATCH path = (a:Account {id: $id})-[r:RELATED_TO|SENT|RECEIVED_BY*1..$depth]-(connected)
        RETURN 
            a.id as account_id,
            a.name as account_name,
            collect(DISTINCT connected.id) as connected_accounts,
            count(DISTINCT connected) as network_size,
            collect(DISTINCT type(r)) as relationship_types
        """
        
        result = self.query(query, {"id": account_id, "depth": depth})
        return result[0] if result else {}
    
    def detect_communities(self, min_size: int = 3) -> List[Dict[str, Any]]:
        """Détecte les communautés dans le graphe"""
        query = """
        CALL gds.louvain.stream('account-network')
        YIELD nodeId, communityId
        WITH communityId, collect(nodeId) as nodes
        WHERE size(nodes) >= $min_size
        RETURN 
            communityId,
            nodes,
            size(nodes) as community_size
        ORDER BY community_size DESC
        """
        
        return self.query(query, {"min_size": min_size})
    
    def get_risk_distribution(self) -> Dict[str, Any]:
        """Récupère la distribution des risques"""
        query = """
        MATCH (t:Transaction)
        RETURN 
            t.risk_level as risk_level,
            count(*) as count,
            avg(t.amount) as avg_amount,
            sum(t.amount) as total_amount
        ORDER BY 
            CASE t.risk_level 
                WHEN 'critical' THEN 1 
                WHEN 'high' THEN 2 
                WHEN 'medium' THEN 3 
                WHEN 'low' THEN 4 
            END
        """
        
        result = self.query(query)
        distribution = {}
        for row in result:
            distribution[row['risk_level']] = {
                'count': row['count'],
                'avg_amount': row['avg_amount'],
                'total_amount': row['total_amount']
            }
        return distribution

# Instance globale
neo4j_service = Neo4jService()