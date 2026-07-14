"""
Grover Orchestrator — routes each transaction through the optimal detection path:
  - GNN (Graph Neural Network via graph-transformer service)
  - Semantic search (Grover / Elasticsearch)
  - Quantum ensemble (both, when ambiguity is high)

This module is imported by pipeline_manager and the standalone orchestrator service.
"""
import os
import logging

logger = logging.getLogger(__name__)

GNN_THRESHOLD   = float(os.getenv("GNN_THRESHOLD",   "0.7"))
SEARCH_FALLBACK = float(os.getenv("SEARCH_THRESHOLD", "1000"))


def route(data: dict) -> str:
    """
    Grover routing logic:
      - amount > 10 000  →  GNN  (heavy graph analysis)
      - amount > 1 000   →  Deep (GNN + semantic combined)
      - else             →  Search (Grover / ES semantic only)
    """
    amount = float(data.get("amount", 0))
    if amount > 10_000:
        path = "GNN"
    elif amount > 1_000:
        path = "Deep"
    else:
        path = "Search"
    logger.debug(f"Grover routed tx amount={amount} → {path}")
    return path