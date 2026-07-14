from fastapi import APIRouter
from app.services.email_service import email_service

router = APIRouter(
    prefix="/email",
    tags=["Email"]
)

@router.get("/test")
def test_email():

    success, message = email_service.send_email(
        to_email="ton_email@gmail.com",
        subject="Test Nexum ERP",
        body="Email de test depuis FastAPI"
    )

    return {
        "success": success,
        "message": message
    }