import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, validator

router = APIRouter()

class EmailReport(BaseModel):
    subject: str
    body: str
    recipients: list[EmailStr]
    @validator('recipients')
    def non_empty(cls, v):
        if not v:
            raise ValueError('recipients list cannot be empty')
        return v

def _get_smtp_client():
    user = os.getenv('GMAIL_USER')
    app_password = os.getenv('GMAIL_APP_PASSWORD')
    if not user or not app_password:
        raise RuntimeError('Missing Gmail credentials in environment variables')
    client = smtplib.SMTP_SSL('smtp.gmail.com', 465)
    client.login(user, app_password)
    return client, user

def send_email_report(subject: str, body: str, recipients: list[str]):
    client, sender = _get_smtp_client()
    msg = MIMEMultipart()
    msg['From'] = os.getenv('EMAIL_FROM_NAME', sender)
    msg['To'] = ', '.join(recipients)
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))
    client.sendmail(sender, recipients, msg.as_string())
    client.quit()

@router.post('/email/report', summary='Send a report email')
async def send_report(report: EmailReport):
    try:
        send_email_report(report.subject, report.body, report.recipients)
        return {'status': 'sent', 'recipients': report.recipients}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
