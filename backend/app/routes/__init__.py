# app/routes/__init__.py
from .auth import router as auth_router
from .companies import router as companies_router
from .call_analytics import router as call_analytics_router
from .insights import router as insights_router

__all__ = [
    'auth_router',
    'companies_router',
    'call_analytics_router',
    'insights_router'
]