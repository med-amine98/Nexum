import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# 🎯 Hard‑coded Gmail SMTP credentials (as per user request)
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "aminehechmi4@gmail.com"  # replace with actual Gmail address
SMTP_PASSWORD = "ioqujrqxinjftxwg"  # replace with Gmail App Password


def send_mail(to_address: str, subject: str, html_body: str, language: str = "en"):
    """Send an email via Gmail SMTP.

    Parameters
    ----------
    to_address: str
        Recipient email address.
    subject: str
        Email subject line.
    html_body: str
        HTML content of the email.
    language: str, optional
        "en" or "fr" – currently not used but kept for future localization.
    """
    msg = MIMEMultipart()
    msg["From"] = SMTP_USER
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"📧 Email sent to {to_address} (subject: {subject})")
    except Exception as e:
        print(f"❌ Failed to send email to {to_address}: {e}")
