from fastapi import APIRouter, HTTPException
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fraud-detection", tags=["Fraud Detection"])

GRAPH_URL = "http://localhost:8002"
GROVER_URL = "http://localhost:8001"

@router.post("/analyze")
async def analyze_fraud(data: dict):
    """
    Forward transaction analysis to GNN Graph Service.
    If unavailable, return mock prediction.
    """
    tx_id = data.get("transaction_id", "UNKNOWN")
    amount = float(data.get("amount", 0))
    risk_hint = data.get("metadata", {}).get("risk_hint", 0.1)
    
    # 1. Try to call the actual GNN service
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.post(
                f"{GRAPH_URL}/analyze", 
                json={
                    "transaction_id": tx_id,
                    "analysis_type": "topological",
                    "depth": 3
                }
            )
            if resp.status_code == 200:
                result = resp.json()
                return {
                    "is_fraudulent": result.get("verdict") == "FRAUD",
                    "confidence": result.get("fraud_score", 0.5),
                    "path": "deep"
                }
    except Exception as e:
        logger.warning(f"GNN API unavailable, using fallback: {e}")

    # 2. Fallback if GNN is down
    is_fraud = risk_hint > 0.5 or amount > 50000
    confidence = risk_hint if risk_hint > 0.5 else 0.1
    if amount > 50000:
        confidence = max(confidence, 0.85)

    return {
        "is_fraudulent": is_fraud,
        "confidence": confidence,
        "path": "fast_simulated"
    }
