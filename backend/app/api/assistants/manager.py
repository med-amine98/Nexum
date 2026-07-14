# Dans app/assistants/manager.py

def get_context(self, agent_name: str, query: str, company_id: str) -> str:
    """
    Récupère le contexte pertinent pour l'agent depuis Qdrant.
    Retourne un texte concaténé des documents trouvés.
    """
    agent = self.get_agent(agent_name)
    if agent and hasattr(agent, "retrieve_context"):
        try:
            docs = agent.retrieve_context(query, company_id=company_id, limit=3)
            return "\n".join([doc.get("text", "") for doc in docs])
        except Exception:
            return ""
    return ""