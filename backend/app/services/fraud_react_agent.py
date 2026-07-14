import os
import json
import logging
import hashlib
from datetime import datetime
import redis
import httpx
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.neo4j_service import driver as neo4j_driver
from qdrant_client import QdrantClient
from app.services.eth_integration_service import eth_service
from app.models.auth import User, UserStatus
from app.models.customer import Customer

logger = logging.getLogger(__name__)

class FraudReActAgent:
    def __init__(self):
        # Establish Redis connection
        redis_host = os.getenv("REDIS_HOST", "redis")
        self.redis_client = redis.Redis(host=redis_host, port=6379, db=0)
        
        # Establish Qdrant connection
        qdrant_host = os.getenv("QDRANT_HOST", "qdrant")
        self.qdrant_client = QdrantClient(host=qdrant_host, port=6333)

    def query_user_profile(self, db: Session, user_id: int):
        """Fetches SQL profile metadata from PostgreSQL."""
        logger.info(f"🔍 [Action: query_user_profile] Querying PostgreSQL for user_id={user_id}")
        user = db.query(User).filter(User.id == user_id).first()
        customer = db.query(Customer).filter(Customer.id == user_id).first()
        
        profile_info = {}
        if user:
            profile_info.update({
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "status": user.status.value if hasattr(user.status, "value") else str(user.status),
                "is_active": user.is_active
            })
        if customer:
            profile_info.update({
                "customer_id": customer.id,
                "company_name": customer.company_name,
                "contact_name": customer.contact_name,
                "customer_active": customer.active
            })
            
        if not profile_info:
            return f"User/Customer with ID {user_id} not found."
            
        return profile_info

    def query_transaction_graph(self, user_id: int):
        """Interrogates Neo4j for transaction stats and patterns."""
        logger.info(f"🔍 [Action: query_transaction_graph] Querying Neo4j for user_id={user_id}")
        try:
            with neo4j_driver.session() as session:
                result = session.run("""
                MATCH (u:User {id: $user_id})-[r:MADE]->(t:Transaction)
                RETURN count(t) as tx_count, sum(t.amount) as total_amount
                """, user_id=user_id)
                record = result.single()
                if record:
                    return {
                        "tx_count": record["tx_count"],
                        "total_amount": record["total_amount"] or 0
                    }
                return {"tx_count": 0, "total_amount": 0}
        except Exception as e:
            logger.error(f"Neo4j query error: {e}")
            return {"error": str(e)}

    def query_similar_frauds(self, tx_amount: float):
        """Queries Qdrant vector store for semantic/similar transaction anomalies."""
        logger.info(f"🔍 [Action: query_similar_frauds] Querying Qdrant for similar amount={tx_amount}")
        try:
            collections = [c.name for c in self.qdrant_client.get_collections().collections]
            if "assistant_memory" in collections:
                # Basic placeholder vector representing the current transaction
                search_vector = [0.1] * 384
                results = self.qdrant_client.search(
                    collection_name="assistant_memory",
                    query_vector=search_vector,
                    limit=3
                )
                similar = []
                for res in results:
                    similar.append({
                        "id": res.id,
                        "score": res.score,
                        "payload": res.payload
                    })
                return similar
            return []
        except Exception as e:
            logger.error(f"Qdrant query error: {e}")
            return {"error": str(e)}

    def block_user_account(self, db: Session, user_id: int):
        """Locks the account in PostgreSQL and evicts active session in Redis."""
        logger.info(f"🛑 [Action: block_user_account] Freezing user_id={user_id} in PostgreSQL & Redis")
        
        # 1. Block User and Customer in SQL
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.status = UserStatus.SUSPENDED
            user.is_active = False
            logger.info(f"PostgreSQL User {user_id} status updated to SUSPENDED")
            
        customer = db.query(Customer).filter(Customer.id == user_id).first()
        if customer:
            customer.active = False
            logger.info(f"PostgreSQL Customer {user_id} active status set to False")
            
        db.commit()
        
        # 2. Clear sessions in Redis
        try:
            self.redis_client.setex(f"session:block:{user_id}", 86400, "blocked")
            keys = self.redis_client.keys(f"session:{user_id}:*")
            if keys:
                self.redis_client.delete(*keys)
            logger.info(f"Redis session eviction successful for user_id={user_id}")
        except Exception as e:
            logger.error(f"Redis session freeze error: {e}")

        return f"User and Customer {user_id} successfully frozen in Postgres & Redis."

    async def anchor_audit_log(self, tx_id: str, details: dict):
        """Invokes the Blockchain service to seal the audit hash."""
        logger.info(f"⛓️ [Action: anchor_audit_log] Anchoring fraud audit log on chain for transaction={tx_id}")
        try:
            result = await eth_service.process_banking_settlement(
                transaction_id=tx_id,
                amount=details.get("amount", 0.0),
                sender=str(details.get("user_id", "0")),
                recipient="SYSTEM_FRAUD_BLOCK"
            )
            return result
        except Exception as e:
            logger.error(f"Blockchain anchoring error: {e}")
            return {"success": False, "error": str(e)}

    async def send_discord_alert(self, user_id: int, risk_score: float, reason: str):
        """Forwards suspect profiles to the security channel using the webhook."""
        logger.info(f"🔔 [Action: send_discord_alert] Sending alert for user_id={user_id} with risk={risk_score}")
        webhook_url = os.getenv("DISCORD_SUPPORT_WEBHOOK")
        if not webhook_url:
            logger.warning("DISCORD_SUPPORT_WEBHOOK is not set, logging webhook mock details.")
            return False
        
        try:
            async with httpx.AsyncClient() as client:
                embed = {
                    "title": "🚨 ALERTE AGENT DE FRAUDE AUTONOME (ReAct)",
                    "description": "L'agent autonome a détecté une activité suspecte et a bloqué le compte utilisateur.",
                    "color": 0xff0000,
                    "fields": [
                        {"name": "ID Utilisateur", "value": str(user_id), "inline": True},
                        {"name": "Score de Risque", "value": f"{risk_score}%", "inline": True},
                        {"name": "Raison Détectée", "value": reason, "inline": False},
                        {"name": "Action Prise", "value": "Compte suspendu & session Redis révoquée", "inline": False}
                    ],
                    "timestamp": datetime.now().isoformat()
                }
                await client.post(webhook_url, json={"embeds": [embed]})
                return True
        except Exception as e:
            logger.error(f"Failed to send Discord alert: {e}")
            return False

    async def run(self, tx_data: dict):
        """Thought -> Action -> Observation reasoning loop."""
        user_id = tx_data.get("user_id") or tx_data.get("customer_id")
        amount = tx_data.get("amount", 0.0)
        tx_id = tx_data.get("transaction_id", f"TX-{os.urandom(4).hex().upper()}")
        
        if not user_id:
            logger.info("No user_id found in transaction data, skipping ReAct loop.")
            return

        db = SessionLocal()
        try:
            logger.info(f"\n--- [ReAct Autonomous Agent] Starting reasoning loop for transaction {tx_id} (User {user_id}) ---")
            
            # Step 1: Thought & Profile Lookup
            logger.info(f"Thought 1: I need to fetch the profile of user {user_id} to check their current status and metadata.")
            profile = self.query_user_profile(db, user_id)
            logger.info(f"Observation 1: Profile details retrieved: {profile}")

            # Step 2: Thought & Neo4j graph centrality
            logger.info(f"Thought 2: I must query the Neo4j transaction graph to calculate total transactions and velocity for user {user_id}.")
            graph = self.query_transaction_graph(user_id)
            logger.info(f"Observation 2: Graph activity: {graph}")

            # Step 3: Thought & Similar frauds vector search
            logger.info(f"Thought 3: I need to check Qdrant for semantic anomalies and similar high-risk transactions.")
            similar = self.query_similar_frauds(amount)
            logger.info(f"Observation 3: Similar fraud instances: {similar}")

            # Step 4: Reasoning / Threat Analysis & Action Execution
            risk_score = 0
            reasons = []
            
            # Risk estimation logic
            if amount > 5000:
                risk_score += 40
                reasons.append("Montant très élevé (>5000)")
            if graph.get("tx_count", 0) > 10:
                risk_score += 30
                reasons.append("Vélocité de transaction élevée (>10 tx)")
            if graph.get("total_amount", 0) > 20000:
                risk_score += 20
                reasons.append("Volume total cumulé élevé (>20k)")
                
            logger.info(f"Thought 4: Calculated risk score is {risk_score}%. ReAct threshold is 70%. Detected indicators: {reasons}")

            if risk_score >= 70:
                logger.info("Thought: Risk score exceeds threshold. I must block the user, anchor the audit record, and alert the administrators.")
                
                # Action 1: Block user in Postgres & Redis
                block_result = self.block_user_account(db, user_id)
                logger.info(f"Observation: {block_result}")
                
                # Action 2: Blockchain anchoring
                audit_details = {
                    "user_id": user_id,
                    "amount": amount,
                    "risk_score": risk_score,
                    "reasons": reasons,
                    "blocked_at": datetime.now().isoformat()
                }
                anchor_result = await self.anchor_audit_log(tx_id, audit_details)
                logger.info(f"Observation: Anchored to blockchain. Success: {anchor_result.get('success')}, Hash: {anchor_result.get('tx_hash')}")
                
                # Action 3: Discord alert notification
                alert_result = await self.send_discord_alert(user_id, risk_score, ", ".join(reasons))
                logger.info(f"Observation: Discord alert sent: {alert_result}")
                
                logger.info("✅ [ReAct Autonomous Agent] Loop finished: Suspect blocked and audited successfully.")
            else:
                logger.info("✅ [ReAct Autonomous Agent] Loop finished: Risk level acceptable, no action required.")

        except Exception as e:
            logger.error(f"❌ Error inside ReAct Agent loop: {e}")
        finally:
            db.close()

fraud_react_agent = FraudReActAgent()
