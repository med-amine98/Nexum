"""
Grover Service — dual indexing to Grover API and/or Elasticsearch directly.
Used both by pipeline_manager and any endpoint needing to persist fraud verdicts.
"""
import os
import logging
import requests

logger = logging.getLogger(__name__)

GROVER_URL        = os.getenv("GROVER_URL",         "http://grover:8000")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL",  "http://elasticsearch:9200")
ES_INDEX          = os.getenv("ES_FRAUD_INDEX",     "fraud-verdicts")


def index_data(data: dict):
    """Index a fraud verdict. Tries Grover first, falls back to Elasticsearch."""
    _try_grover(data)
    _try_elasticsearch(data)


def _try_grover(data: dict):
    try:
        resp = requests.post(f"{GROVER_URL}/index", json=data, timeout=3)
        if resp.status_code < 400:
            logger.debug(f"✅ Grover indexed {data.get('transaction_id','?')}")
            return True
    except Exception as e:
        logger.debug(f"Grover unavailable: {e}")
    return False


def _try_elasticsearch(data: dict):
    try:
        resp = requests.post(
            f"{ELASTICSEARCH_URL}/{ES_INDEX}/_doc",
            json=data,
            headers={"Content-Type": "application/json"},
            timeout=3,
        )
        if resp.status_code < 400:
            logger.debug(f"✅ Elasticsearch indexed {data.get('transaction_id','?')}")
            return True
    except Exception as e:
        logger.debug(f"Elasticsearch unavailable: {e}")
    return False


def search_fraud(query: str, size: int = 10) -> list:
    """Full-text search across fraud verdicts via Elasticsearch."""
    try:
        body = {
            "query": {"multi_match": {"query": query, "fields": ["explanation", "transaction_id", "path"]}},
            "size": size,
        }
        resp = requests.post(
            f"{ELASTICSEARCH_URL}/{ES_INDEX}/_search",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=5,
        )
        if resp.status_code == 200:
            hits = resp.json().get("hits", {}).get("hits", [])
            return [h["_source"] for h in hits]
    except Exception as e:
        logger.warning(f"ES search error: {e}")
    return []