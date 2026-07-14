# app/api/assistants/assistant_router.py

"""Aggregate router that includes all assistant sub‑routers.
Provides a single entry point under the `/assistants` prefix.
Each assistant already defines its own prefix, so they are mounted
directly without additional prefixes.
"""

from fastapi import APIRouter

# Import individual assistant routers
from .predict_assistant import router as predict_router
from .risk_assistant import router as risk_router
from .growth_assistant import router as growth_router
from .copilot_assistant import router as copilot_router
from .elena_assistant import router as elena_router
from .james_assistant import router as james_router

assistant_router = APIRouter(prefix="/assistants", tags=["assistants"])

# Mount each assistant router (their own prefixes are kept)
assistant_router.include_router(predict_router)
assistant_router.include_router(risk_router)
assistant_router.include_router(growth_router)
assistant_router.include_router(copilot_router)
assistant_router.include_router(elena_router)
assistant_router.include_router(james_router)
