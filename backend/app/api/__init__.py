# app/api/__init__.py
from fastapi import APIRouter
from fastapi.staticfiles import StaticFiles
import os

# Routeur principal
api_router = APIRouter()

# Import des routeurs un par un avec gestion d'erreur
try:
    from app.api.endpoints.orders import router as orders_router
    api_router.include_router(orders_router, prefix="/orders", tags=["Orders"])
    print("✅ Orders router loaded")
except Exception as e:
    print(f"⚠️ Orders router not loaded: {e}")

try:
    from app.api import scraping
    api_router.include_router(scraping.router, prefix="/scraping", tags=["Scraping"])
    print("✅ Scraping router loaded")
except Exception as e:
    print(f"⚠️ Scraping router not loaded: {e}")

try:
    from app.api import ai_generator
    api_router.include_router(ai_generator.router, prefix="/ai-generator", tags=["AI Generator"])
    print("✅ AI Generator router loaded")
except Exception as e:
    print(f"⚠️ AI Generator router not loaded: {e}")

try:
    from app.api import sales
    api_router.include_router(sales.router, prefix="/sales", tags=["Sales"])
    print("✅ Sales router loaded")
except Exception as e:
    print(f"⚠️ Sales router not loaded: {e}")

# Configuration du dossier static
static_path = os.path.join(os.path.dirname(__file__), "..", "static", "assistants3d")
os.makedirs(static_path, exist_ok=True)

# Routeur static
static_router = APIRouter()
static_router.mount("/assistants-3d", StaticFiles(directory=static_path, html=True), name="assistants3d")

__all__ = ["api_router", "static_router"]