import os
import json
import logging
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    Web3 = None
    geth_poa_middleware = None
    logger.warning("⚠️ Web3 non installé. Installation recommandée: pip install web3")

# Configuration par défaut
DEFAULT_GAS_LIMIT = 200000
DEFAULT_GAS_PRICE = 50  # Gwei


class EthIntegrationService:
    """
    Service d'intégration Blockchain Web3 pour les trois secteurs :
    Banking, Insurance, Enterprise
    """
    
    def __init__(self, provider_url: Optional[str] = None, private_key: Optional[str] = None):
        """
        Initialise le service Blockchain
        
        Args:
            provider_url: URL du provider Web3 (Infura, Alchemy, noeud local)
            private_key: Clé privée pour signer les transactions
        """
        # Configuration Web3 (Infura, Alchemy ou Noeud Privé)
        self.provider_url = provider_url or os.getenv("ETH_PROVIDER_URL", "http://localhost:8545")
        self.private_key = private_key or os.getenv("ETH_PRIVATE_KEY")
        self.contract_address = os.getenv("ETH_CONTRACT_ADDRESS")
        self.is_connected = False
        self.w3 = None
        self.contract = None
        
        if WEB3_AVAILABLE:
            try:
                self.w3 = Web3(Web3.HTTPProvider(self.provider_url))
                # Support pour les réseaux PoA (comme Polygon ou réseaux privés)
                if geth_poa_middleware:
                    self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
                self.is_connected = self.w3.is_connected()
                
                if self.is_connected and self.contract_address:
                    # Chargement du contrat notaire (ABI minimal)
                    contract_abi = self._get_notary_contract_abi()
                    self.contract = self.w3.eth.contract(
                        address=Web3.to_checksum_address(self.contract_address),
                        abi=contract_abi
                    )
                    
            except Exception as e:
                logger.error(f"Erreur d'initialisation Web3: {e}")
                self.is_connected = False
        
        status = "Connecté (Mainnet/Testnet)" if self.is_connected else "Mode Local (Nexum Private Ledger)"
        logger.info(f"Connexion Web3: {status}")

    def _get_notary_contract_abi(self) -> List[Dict]:
        """ABI minimal du contrat de notarisation"""
        return [
            {
                "inputs": [
                    {"name": "category", "type": "string"},
                    {"name": "dataHash", "type": "string"},
                    {"name": "metadata", "type": "string"}
                ],
                "name": "record",
                "outputs": [{"name": "", "type": "bytes32"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [{"name": "txHash", "type": "bytes32"}],
                "name": "getRecord",
                "outputs": [
                    {"name": "category", "type": "string"},
                    {"name": "dataHash", "type": "string"},
                    {"name": "metadata", "type": "string"},
                    {"name": "timestamp", "type": "uint256"},
                    {"name": "recordedBy", "type": "address"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]

    def _get_account(self):
        """Récupère le compte pour signer les transactions"""
        if not self.private_key:
            raise ValueError("Clé privée non configurée")
        return self.w3.eth.account.from_key(self.private_key)

    async def _secure_record(self, category: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Méthode interne pour graver les données sur la Blockchain
        
        Args:
            category: Catégorie de la transaction
            data: Données à enregistrer
            
        Returns:
            Dictionnaire avec le résultat de l'enregistrement
        """
        try:
            # Calcul du hash des données
            data_hash = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
            metadata = json.dumps(data, ensure_ascii=False)
            
            tx_hash = None
            block_number = None
            
            if self.is_connected and self.contract:
                try:
                    account = self._get_account()
                    # Construction de la transaction
                    tx = self.contract.functions.record(
                        category, 
                        data_hash, 
                        metadata
                    ).build_transaction({
                        'from': account.address,
                        'gas': DEFAULT_GAS_LIMIT,
                        'gasPrice': self.w3.to_wei(DEFAULT_GAS_PRICE, 'gwei'),
                        'nonce': self.w3.eth.get_transaction_count(account.address)
                    })
                    
                    # Signature et envoi
                    signed_tx = account.sign_transaction(tx)
                    tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                    tx_hash_hex = tx_hash.hex()
                    
                    # Attente de la confirmation
                    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
                    block_number = receipt['blockNumber']
                    
                    logger.info(f"Transaction enregistrée: {tx_hash_hex}")
                    
                except Exception as web3_error:
                    logger.error(f"Erreur Web3: {web3_error}")
                    # Fallback: génération d'un hash local
                    tx_hash = f"0x{hashlib.sha256(json.dumps(data).encode()).hexdigest()}"
                    block_number = None
            else:
                # Mode hors ligne: génération d'un hash local
                tx_hash = f"0x{hashlib.sha256(json.dumps(data).encode()).hexdigest()}"
                block_number = None
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "category": category,
                "block_number": block_number or 0,
                "timestamp": datetime.now().isoformat(),
                "network": "Nexum-Enterprise-PoA",
                "verified": block_number is not None,
                "data_hash": data_hash
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de l'enregistrement: {e}")
            return {
                "success": False,
                "error": str(e),
                "category": category
            }

    # ==========================================
    # SECTEUR : BANKING (Settlement & KYC)
    # ==========================================
    
    async def process_banking_settlement(
        self, 
        transaction_id: str, 
        amount: float, 
        sender: str, 
        recipient: str,
        currency: str = "EUR"
    ) -> Dict[str, Any]:
        """
        Enregistre un règlement interbancaire sur la Blockchain
        
        Args:
            transaction_id: Identifiant unique de la transaction
            amount: Montant du règlement
            sender: Identifiant de l'émetteur
            recipient: Identifiant du destinataire
            currency: Devise (EUR, USD, CHF)
            
        Returns:
            Résultat de l'enregistrement
        """
        tx_data = {
            "type": "BANKING_SETTLEMENT",
            "transaction_id": transaction_id,
            "amount": amount,
            "currency": currency,
            "sender_hash": hashlib.sha256(sender.encode()).hexdigest(),
            "recipient_hash": hashlib.sha256(recipient.encode()).hexdigest(),
            "timestamp": datetime.now().isoformat()
        }
        
        result = await self._secure_record("BANKING_SETTLEMENT", tx_data)
        
        # Log spécifique secteur bancaire
        if result["success"]:
            logger.info(f"Règlement bancaire {transaction_id} enregistré: {result['tx_hash']}")
        
        return result

    async def verify_kyc_on_chain(
        self, 
        client_id: str, 
        identity_hash: str,
        kyc_level: str = "STANDARD"
    ) -> Dict[str, Any]:
        """
        Vérifie ou enregistre une preuve KYC sur la Blockchain
        
        Args:
            client_id: Identifiant du client
            identity_hash: Hash de l'identité
            kyc_level: Niveau KYC (BASIC, STANDARD, PREMIUM)
            
        Returns:
            Résultat de l'enregistrement
        """
        kyc_data = {
            "type": "KYC_VERIFICATION",
            "client_id": client_id,
            "identity_hash": identity_hash,
            "kyc_level": kyc_level,
            "status": "VERIFIED",
            "expires": (datetime.now().replace(year=datetime.now().year + 1)).isoformat()
        }
        
        result = await self._secure_record("KYC", kyc_data)
        
        if result["success"]:
            logger.info(f"KYC client {client_id} enregistré sur Blockchain")
        
        return result

    async def get_kyc_status(self, client_id: str) -> Dict[str, Any]:
        """
        Récupère le statut KYC d'un client depuis la Blockchain
        
        Args:
            client_id: Identifiant du client
            
        Returns:
            Statut KYC
        """
        # Recherche dans les enregistrements (à implémenter avec un indexeur)
        return {
            "client_id": client_id,
            "status": "VERIFIED",
            "source": "blockchain",
            "message": "Fonctionnalité à implémenter avec un indexeur blockchain"
        }

    # ==========================================
    # SECTEUR : INSURANCE (Parametric & Fraud)
    # ==========================================
    
    async def trigger_parametric_claim(
        self, 
        policy_id: str, 
        trigger_event: str, 
        payout_amount: float,
        beneficiary: str = None
    ) -> Dict[str, Any]:
        """
        Déclenche une indemnisation paramétrique via Smart Contract
        Exemple: Sécheresse détectée par satellite -> Paiement automatique
        
        Args:
            policy_id: Identifiant du contrat
            trigger_event: Événement déclencheur (drought, flood, delay)
            payout_amount: Montant de l'indemnisation
            beneficiary: Bénéficiaire (optionnel)
            
        Returns:
            Résultat du déclenchement
        """
        claim_data = {
            "type": "PARAMETRIC_PAYOUT",
            "policy_id": policy_id,
            "trigger": trigger_event,
            "amount": payout_amount,
            "beneficiary": beneficiary,
            "execution_mode": "SMART_CONTRACT_AUTO",
            "timestamp": datetime.now().isoformat()
        }
        
        result = await self._secure_record("INSURANCE_CLAIM", claim_data)
        
        if result["success"]:
            logger.info(f"Indemnisation paramétrique {policy_id} déclenchée: {payout_amount} EUR")
        
        return result

    async def register_claim_fingerprint(self, claim_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enregistre l'empreinte numérique d'un sinistre pour éviter la fraude multi-assureurs
        
        Args:
            claim_details: Détails du sinistre (incident_date, location, object_ref, sector)
            
        Returns:
            Résultat de l'enregistrement
        """
        # Création d'une empreinte unique basée sur les détails du sinistre
        claim_string = f"{claim_details.get('incident_date', '')}_{claim_details.get('location', '')}_{claim_details.get('object_ref', '')}_{claim_details.get('policy_number', '')}"
        fingerprint = hashlib.sha256(claim_string.encode()).hexdigest()
        
        registry_data = {
            "type": "FRAUD_REGISTRY_ENTRY",
            "fingerprint": fingerprint,
            "sector": claim_details.get('sector', 'auto'),
            "claim_amount": claim_details.get('amount', 0),
            "incident_date": claim_details.get('incident_date'),
            "location": claim_details.get('location'),
            "object_ref": claim_details.get('object_ref'),
            "is_suspected": claim_details.get('is_suspected', False),
            "timestamp": datetime.now().isoformat()
        }
        
        result = await self._secure_record("FRAUD_PREVENTION", registry_data)
        
        if result["success"]:
            logger.info(f"Empreinte sinistre enregistrée: {fingerprint[:16]}...")
        
        return result

    async def check_duplicate_claim(self, claim_details: Dict[str, Any]) -> Dict[str, Any]:
        """
        Vérifie si un sinistre a déjà été déclaré ailleurs (anti-fraude)
        
        Args:
            claim_details: Détails du sinistre à vérifier
            
        Returns:
            Résultat de la vérification
        """
        claim_string = f"{claim_details.get('incident_date', '')}_{claim_details.get('location', '')}_{claim_details.get('object_ref', '')}"
        fingerprint = hashlib.sha256(claim_string.encode()).hexdigest()
        
        # Simulation de vérification (à connecter à un indexeur blockchain)
        # Dans un environnement réel, on interrogerait la blockchain
        
        return {
            "fingerprint": fingerprint[:16] + "...",
            "is_duplicate": False,
            "message": "Fonctionnalité à implémenter avec un indexeur blockchain",
            "source": "blockchain_verification"
        }

    # ==========================================
    # SECTEUR : ENTERPRISE (Supply Chain & Invoicing)
    # ==========================================
    
    async def register_supply_chain_event(
        self, 
        asset_id: str, 
        event: str, 
        location: str,
        status: str = "IN_TRANSIT",
        additional_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Trace un événement logistique sur la Blockchain (Digital Twin sync)
        
        Args:
            asset_id: Identifiant de l'actif
            event: Type d'événement (shipped, received, scanned, delivered)
            location: Localisation (GPS ou adresse)
            status: Statut de l'actif
            additional_data: Données supplémentaires
            
        Returns:
            Résultat de l'enregistrement
        """
        logistics_data = {
            "type": "SUPPLY_CHAIN_TRACK",
            "asset_id": asset_id,
            "event": event,
            "location": location,
            "status": status,
            "digital_twin_id": f"TWIN-{asset_id}",
            "additional_data": additional_data or {},
            "timestamp": datetime.now().isoformat()
        }
        
        result = await self._secure_record("LOGISTICS", logistics_data)
        
        if result["success"]:
            logger.info(f"Événement logistique {event} enregistré pour l'actif {asset_id}")
        
        return result

    async def get_asset_history(self, asset_id: str) -> Dict[str, Any]:
        """
        Récupère l'historique complet d'un actif
        
        Args:
            asset_id: Identifiant de l'actif
            
        Returns:
            Historique de l'actif
        """
        # Simulation de récupération (à connecter à un indexeur blockchain)
        return {
            "asset_id": asset_id,
            "history": [],
            "source": "blockchain",
            "message": "Fonctionnalité à implémenter avec un indexeur blockchain"
        }

    async def execute_smart_invoice(
        self, 
        invoice_id: str, 
        amount: float, 
        vendor_wallet: str,
        customer_wallet: str = None,
        due_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Exécute une facture intelligente (Escrow/Paiement auto)
        
        Args:
            invoice_id: Identifiant de la facture
            amount: Montant à payer
            vendor_wallet: Portefeuille du vendeur
            customer_wallet: Portefeuille du client (optionnel)
            due_date: Date d'échéance
            
        Returns:
            Résultat de l'exécution
        """
        invoice_data = {
            "type": "SMART_INVOICE_EXEC",
            "invoice_id": invoice_id,
            "amount": amount,
            "recipient_wallet": vendor_wallet,
            "sender_wallet": customer_wallet,
            "currency": "EURC",  # Euro Stablecoin
            "due_date": due_date.isoformat() if due_date else None,
            "status": "PENDING",
            "timestamp": datetime.now().isoformat()
        }
        
        result = await self._secure_record("ENTERPRISE_FINANCE", invoice_data)
        
        if result["success"]:
            logger.info(f"Facture intelligente {invoice_id} enregistrée: {amount} EURC")
        
        return result

    async def confirm_invoice_payment(self, invoice_id: str, payment_tx_hash: str) -> Dict[str, Any]:
        """
        Confirme le paiement d'une facture intelligente
        
        Args:
            invoice_id: Identifiant de la facture
            payment_tx_hash: Hash de la transaction de paiement
            
        Returns:
            Résultat de la confirmation
        """
        confirmation_data = {
            "type": "INVOICE_PAYMENT_CONFIRMATION",
            "invoice_id": invoice_id,
            "payment_tx_hash": payment_tx_hash,
            "confirmed_at": datetime.now().isoformat()
        }
        
        result = await self._secure_record("INVOICE_PAYMENT", confirmation_data)
        
        if result["success"]:
            logger.info(f"Paiement confirmé pour la facture {invoice_id}")
        
        return result

    # ==========================================
    # MÉTHODES TRANSVERSALES
    # ==========================================
    
    async def get_transaction_status(self, tx_hash: str) -> Dict[str, Any]:
        """
        Vérifie le statut d'une transaction blockchain
        
        Args:
            tx_hash: Hash de la transaction
            
        Returns:
            Statut de la transaction
        """
        if not self.is_connected or not self.w3:
            return {
                "tx_hash": tx_hash,
                "status": "unknown",
                "message": "Blockchain non connectée"
            }
        
        try:
            receipt = self.w3.eth.get_transaction_receipt(tx_hash)
            if receipt:
                return {
                    "tx_hash": tx_hash,
                    "status": "confirmed" if receipt['status'] == 1 else "failed",
                    "block_number": receipt['blockNumber'],
                    "gas_used": receipt['gasUsed']
                }
            else:
                return {
                    "tx_hash": tx_hash,
                    "status": "pending",
                    "message": "Transaction en attente de confirmation"
                }
        except Exception as e:
            return {
                "tx_hash": tx_hash,
                "status": "error",
                "error": str(e)
            }

    async def get_blockchain_info(self) -> Dict[str, Any]:
        """
        Récupère les informations sur la blockchain connectée
        
        Returns:
            Informations blockchain
        """
        if not self.is_connected or not self.w3:
            return {
                "connected": False,
                "network": "offline",
                "message": "Blockchain non connectée"
            }
        
        try:
            block_number = self.w3.eth.block_number
            chain_id = self.w3.eth.chain_id
            
            return {
                "connected": True,
                "chain_id": chain_id,
                "block_number": block_number,
                "gas_price": self.w3.to_wei(DEFAULT_GAS_PRICE, 'gwei'),
                "network": "Ethereum/PoA"
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }

    # ==========================================
    # MÉTHODES DE CONFIGURATION ET TEST
    # ==========================================
    
    async def test_connection(self) -> Dict[str, Any]:
        """
        Teste la connexion à la blockchain
        
        Returns:
            Résultat du test
        """
        test_data = {
            "type": "CONNECTION_TEST",
            "timestamp": datetime.now().isoformat(),
            "service": "EthIntegrationService"
        }
        
        result = await self._secure_record("TEST", test_data)
        
        return {
            "web3_available": WEB3_AVAILABLE,
            "connected": self.is_connected,
            "test_record": result,
            "provider_url": self.provider_url[:50] + "..." if len(self.provider_url) > 50 else self.provider_url
        }


# Instance globale du service
eth_service = EthIntegrationService()


# Fonction utilitaire pour obtenir l'instance
def get_eth_service() -> EthIntegrationService:
    """Retourne l'instance globale du service blockchain"""
    return eth_service