# app/services/web3_service.py - Version corrigée

import logging
from web3 import Web3
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class Web3Service:
    """Service Web3 pour les interactions blockchain"""
    
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
        self._web3 = None
        self.account = None
        self.is_connected = False
        self._connect()
        logger.info(f"✅ Web3Service initialisé ({self.rpc_url})")
    
    @property
    def web3(self):
        """Retourne l'instance Web3"""
        return self._web3
    
    def _connect(self):
        """Connecte à la blockchain"""
        try:
            self._web3 = Web3(Web3.HTTPProvider(
                self.rpc_url,
                request_kwargs={'timeout': 10}
            ))
            
            if self._web3.is_connected():
                self.is_connected = True
                chain_id = self._web3.eth.chain_id
                block_number = self._web3.eth.block_number
                logger.info(f"✅ Web3 connecté (Chain ID: {chain_id}, Block: {block_number})")
                
                if self._web3.eth.accounts:
                    self.account = self._web3.eth.accounts[0]
                    logger.info(f"✅ Compte: {self.account}")
            else:
                logger.warning(f"⚠️ Web3 non connecté à {self.rpc_url}")
                self.is_connected = False
                
        except Exception as e:
            logger.error(f"❌ Erreur connexion Web3: {e}")
            self.is_connected = False
    
    def get_status(self) -> Dict[str, Any]:
        """Retourne le statut Web3"""
        return {
            "connected": self.is_connected,
            "address": self.account,
            "url": self.rpc_url,
            "simulation": not self.is_connected
        }
    
    def get_balance(self, address: Optional[str] = None) -> Dict[str, Any]:
        """Récupère le solde d'une adresse"""
        if not self.is_connected or not self._web3:
            return {"balance": "0", "simulated": True, "error": "Web3 non connecté"}
        
        try:
            target = address or self.account
            if not target:
                return {"balance": "0", "simulated": True, "error": "Aucune adresse"}
            
            balance_wei = self._web3.eth.get_balance(target)
            balance_eth = self._web3.from_wei(balance_wei, 'ether')
            
            return {
                "balance": str(balance_eth),
                "address": target,
                "simulated": False
            }
        except Exception as e:
            logger.error(f"❌ Erreur balance: {e}")
            return {"balance": "0", "simulated": True, "error": str(e)}

# Instance globale
web3_service = Web3Service()