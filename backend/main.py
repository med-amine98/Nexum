from app.neo4j_endpoints import router as neo4j_router
app.include_router(neo4j_router)

# Import Explainable AI routes
from app.explainable_ai_service import register_explainable_ai_routes
register_explainable_ai_routes(app)
