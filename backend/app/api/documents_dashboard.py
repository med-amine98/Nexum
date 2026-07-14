from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.database import get_db

router = APIRouter()

@router.get("/dashboard")
async def get_documents_dashboard(db = Depends(get_db)):
    return {
        "total_documents": 0,
        "by_status": {"pending": 0, "processing": 0, "completed": 0, "failed": 0},
        "by_type": {"invoice": 0, "receipt": 0, "contract": 0, "identity": 0},
        "recent_documents": []
    }
