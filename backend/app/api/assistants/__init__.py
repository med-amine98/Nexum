# app/api/assistants/__init__.py
from .predict_assistant import router as predict_router
from .risk_assistant import router as risk_router
from .growth_assistant import router as growth_router
from .copilot_assistant import router as copilot_router
from .elena_assistant import router as elena_router
from .james_assistant import router as james_router
from .sophie_assistant import router as sophie_router
from . import james_assistant, predict_assistant

james_router = james_assistant.router
predict_router = predict_assistant.router

__all__ = [
    "predict_router",
    "risk_router",
    "growth_router",
    "copilot_router",
    "elena_router",
    "james_router",
    "sophie_router",
]