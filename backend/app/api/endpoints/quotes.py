# app/api/endpoints/quotes.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import random
import logging
from app.websocket_manager import manager

logger = logging.getLogger(__name__)

# Préfixe corrigé pour correspondre aux attentes du bot et de l'API
router = APIRouter(prefix="/quotes", tags=["quotes"])

class QuoteItem(BaseModel):
    description: str
    quantity: int = 1
    unit_price: float = 0

class QuoteRequest(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    description: Optional[str] = None
    items: List[QuoteItem] = []
    tva: float = 20

class QuoteItemResponse(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float

class QuoteResponse(BaseModel):
    quote_number: str
    client_name: str
    client_email: Optional[str] = None
    description: Optional[str] = None
    items: List[QuoteItemResponse] = []
    subtotal: float
    tax_rate: float
    tax_amount: float
    total_amount: float
    status: str
    created_at: str

# Stockage temporaire
quotes_db = []
counter = 1

@router.post("/create", response_model=QuoteResponse)
@router.post("/generate", response_model=QuoteResponse)
async def generate_quote(request: QuoteRequest):
    global counter
    
    items_response = []
    subtotal = 0
    
    for item in request.items:
        total = item.quantity * item.unit_price
        subtotal += total
        items_response.append({
            "description": item.description,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total": total
        })
    
    tax_amount = subtotal * (request.tva / 100)
    total_amount = subtotal + tax_amount
    
    quote_number = f"DEV-{datetime.now().year}-{str(counter).zfill(4)}"
    
    quote = {
        "id": counter,
        "quote_number": quote_number,
        "client_name": request.client_name,
        "client_email": request.client_email,
        "description": request.description,
        "items": items_response,
        "subtotal": round(subtotal, 2),
        "tax_rate": request.tva,
        "tax_amount": round(tax_amount, 2),
        "total_amount": round(total_amount, 2),
        "status": "draft",
        "created_at": datetime.now().isoformat()
    }
    
    quotes_db.append(quote)
    counter += 1
    
    # Notification WebSocket
    try:
        await manager.send_notification(
            title="Nouveau Devis",
            message=f"Devis généré pour {request.client_name}: {round(total_amount, 2)} €",
            sector="enterprise",
            type="info",
            data=quote
        )
    except Exception as e:
        logger.error(f"Erreur notification devis: {e}")
    
    return {
        "quote_number": quote_number,
        "client_name": request.client_name,
        "client_email": request.client_email,
        "description": request.description,
        "items": items_response,
        "subtotal": round(subtotal, 2),
        "tax_rate": request.tva,
        "tax_amount": round(tax_amount, 2),
        "total_amount": round(total_amount, 2),
        "status": "draft",
        "created_at": datetime.now().isoformat()
    }

@router.get("/recent")
async def get_recent_quotes():
    return quotes_db[-20:][::-1]

@router.get("/")
async def get_all_quotes():
    return quotes_db[::-1]