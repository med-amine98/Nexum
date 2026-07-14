from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.auth import User

from app.models.notification import Notification
from pydantic import BaseModel

router = APIRouter()

class NotificationCreate(BaseModel):
    title: str
    message: str
    type: str = "info"
    user_id: int | None = None
    company_id: int | None = None

@router.get("/")
async def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifications = (
        db.query(Notification)
        .filter(Notification.company_id == current_user.company_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )
    if not notifications:
        return [
            {
                "id": 0,
                "title": "Bienvenue sur Nexum ERP Intelligence",
                "message": "Votre environnement sécurisé est prêt. Toutes vos données sont isolées.",
                "type": "info",
                "read": False,
                "created_at": datetime.now().isoformat(),
            }
        ]
    return notifications

@router.post("/", response_model=NotificationCreate)
async def create_notification(
    payload: NotificationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = Notification(
        title=payload.title,
        message=payload.message,
        type=payload.type,
        user_id=payload.user_id or current_user.id,
        company_id=payload.company_id or current_user.company_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
