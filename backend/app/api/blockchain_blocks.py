from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any
from app.database import get_db

router = APIRouter()

@router.get("/blocks")
async def get_blockchain_blocks(limit: int = 10, db = Depends(get_db)):
    return {"blocks": [], "total": 0, "limit": limit}
