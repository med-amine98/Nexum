# backend/app/core/web_search.py
import requests
import logging

logger = logging.getLogger(__name__)

def search_web(query: str) -> str | None:
    """Recherche une réponse sur le web via DuckDuckGo."""
    try:
        url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1"
        headers = {"User-Agent": "Mozilla/5.0"}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            abstract = data.get("AbstractText", "")
            if abstract:
                return abstract
            topics = data.get("RelatedTopics", [])
            if topics:
                return topics[0].get("Text", "")
        return None
    except Exception as e:
        logger.error(f"Erreur recherche web : {e}")
        return None