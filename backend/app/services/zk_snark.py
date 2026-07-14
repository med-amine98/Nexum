import hashlib
import json
from datetime import datetime
import uuid

def generate_zk_proof(transaction_data: dict) -> dict:
    """
    Simulates the generation of a Zero-Knowledge Proof (ZK-SNARK).
    In a real-world scenario, this would use a library like snarkjs or py_ecc 
    to create a cryptographically verifiable proof without revealing sensitive data.
    """
    # 1. Normalize data
    # Remove sensitive information to create the public signal
    public_signal = {
        "amount": transaction_data.get("amount", 0),
        "risk_score": transaction_data.get("risk_score", 0.0),
        "verdict": transaction_data.get("verdict", "UNKNOWN"),
        "timestamp": transaction_data.get("timestamp", datetime.now().isoformat())
    }
    
    # 2. Hash the original evidence to ensure immutability
    data_str = json.dumps(transaction_data, sort_keys=True)
    evidence_hash = hashlib.sha256(data_str.encode()).hexdigest()
    
    # 3. Generate a simulated ZK-SNARK proof
    # A real proof would be a complex mathematical construct (e.g., elliptic curve points)
    salt = uuid.uuid4().hex
    proof_seed = f"{evidence_hash}_{salt}"
    simulated_proof = f"0xZK_SNARK_PROOF_{hashlib.md5(proof_seed.encode()).hexdigest()}"
    
    return {
        "evidence_hash": evidence_hash,
        "public_signal": public_signal,
        "proof": simulated_proof,
        "is_valid": True,
        "generated_at": datetime.now().isoformat()
    }
