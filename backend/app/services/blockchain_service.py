# app/services/blockchain_service.py - Version finale connectée à l'API

import logging
import requests
import json
from typing import Dict, Any, Optional
from datetime import datetime
from web3 import Web3

logger = logging.getLogger(__name__)

class BlockchainService:
    """Service Blockchain pour l'enregistrement des preuves"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.rpc_url = "http://neura-blockchain:8545"
        self.api_url = "http://neura-blockchain:8000"
        self.w3 = None
        self.is_connected = False
        self.account = None
        self._connect()
        logger.info(f"✅ BlockchainService initialisé ({self.rpc_url})")
    
    def _connect(self):
        """Connecte à la blockchain via Web3"""
        try:
            self.w3 = Web3(Web3.HTTPProvider(
                self.rpc_url,
                request_kwargs={'timeout': 10}
            ))
            
            if self.w3.is_connected():
                self.is_connected = True
                chain_id = self.w3.eth.chain_id
                block_number = self.w3.eth.block_number
                logger.info(f"✅ Blockchain connectée (Chain ID: {chain_id}, Block: {block_number})")
                
                if self.w3.eth.accounts:
                    self.account = self.w3.eth.accounts[0]
                    logger.info(f"✅ Compte blockchain: {self.account}")
            else:
                logger.warning(f"⚠️ Blockchain non connectée à {self.rpc_url}")
                self.is_connected = False
                
        except Exception as e:
            logger.error(f"❌ Erreur connexion Blockchain: {e}")
            self.is_connected = False
    
    def _check_api(self) -> bool:
        """Vérifie si l'API blockchain est accessible"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=3)
            return response.status_code == 200
        except:
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Récupère les statistiques de la blockchain"""
        # ✅ Essayer d'abord via l'API blockchain
        try:
            if self._check_api():
                response = requests.get(
                    f"{self.api_url}/blockchain/status",
                    timeout=5
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Ajouter les infos Web3 si connecté
                    if self.is_connected and self.w3:
                        try:
                            block_number = self.w3.eth.block_number
                            data["block_number"] = block_number
                            data["web3_connected"] = True
                            data["connected_provider"] = self.rpc_url
                        except:
                            pass
                    
                    # Ajouter les transactions de la base de données
                    from app.database import SessionLocal
                    from app.models.blockchain import BlockchainTransaction
                    
                    db = SessionLocal()
                    try:
                        total_tx = db.query(BlockchainTransaction).count()
                        pending_tx = db.query(BlockchainTransaction).filter(
                            BlockchainTransaction.status == "pending"
                        ).count()
                        data["total_transactions"] = total_tx
                        data["pending_transactions"] = pending_tx
                    finally:
                        db.close()
                    
                    return data
        except Exception as e:
            logger.warning(f"⚠️ Erreur API blockchain: {e}")
        
        # ✅ Fallback sur la base de données
        return self._get_stats_from_db()
    
    def _get_stats_from_db(self) -> Dict[str, Any]:
        """Récupère les stats depuis la base de données"""
        try:
            from app.database import SessionLocal
            from app.models.blockchain import BlockchainTransaction, BlockchainBlock
            from sqlalchemy import desc
            
            db = SessionLocal()
            try:
                total_tx = db.query(BlockchainTransaction).count()
                pending_tx = db.query(BlockchainTransaction).filter(
                    BlockchainTransaction.status == "pending"
                ).count()
                total_blocks = db.query(BlockchainBlock).count()
                latest_block = db.query(BlockchainBlock).order_by(
                    desc(BlockchainBlock.height)
                ).first()
                
                return {
                    "total_transactions": total_tx,
                    "pending_transactions": pending_tx,
                    "total_blocks": total_blocks,
                    "latest_block_height": latest_block.height if latest_block else 0,
                    "latest_block_hash": latest_block.hash if latest_block else None,
                    "chain_id": 1337,
                    "block_number": latest_block.height if latest_block else 0,
                    "web3_connected": self.is_connected,
                    "connected_provider": self.rpc_url if self.is_connected else None
                }
            finally:
                db.close()
        except Exception as e:
            logger.error(f"❌ Erreur get_stats_from_db: {e}")
            return {
                "total_transactions": 0,
                "pending_transactions": 0,
                "total_blocks": 0,
                "latest_block_height": 0,
                "latest_block_hash": None,
                "chain_id": 0,
                "block_number": 0,
                "web3_connected": self.is_connected,
                "connected_provider": self.rpc_url if self.is_connected else None
            }
    
    def record_transaction(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Enregistre une transaction dans la blockchain"""
        try:
            # ✅ Utiliser le bon endpoint /secure-transaction
            response = requests.post(
                f"{self.api_url}/secure-transaction",
                json={
                    "transaction_id": data.get("transaction_id"),
                    "verdict": data.get("fraud_type", "NONE"),
                    "path": "api",
                    "scores": {
                        "fraud_score": data.get("confidence", 0),
                        "risk_score": data.get("risk_score", 0)
                    },
                    "timestamp": data.get("timestamp", datetime.now().isoformat()),
                    "analysis": {
                        "fraud_type": data.get("fraud_type", "NONE"),
                        "confidence": data.get("confidence", 0),
                        "amount": data.get("amount", 0)
                    }
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "tx_hash": data.get("transaction_id"),
                    "block_number": 0,
                    "status": "confirmed",
                    "data": result
                }
            else:
                logger.error(f"❌ API Blockchain erreur: {response.status_code}")
                return {
                    "success": False,
                    "error": f"API retourne {response.status_code}"
                }
                
        except requests.exceptions.ConnectionError:
            logger.error("❌ Connexion à l'API Blockchain impossible")
            return {
                "success": False,
                "error": "Connexion à l'API Blockchain impossible"
            }
        except Exception as e:
            logger.error(f"❌ Erreur enregistrement blockchain: {e}")
            return {
                "success": False,
                "error": str(e)
            }

# Instance globale
blockchain_service = BlockchainService()