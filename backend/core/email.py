import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.db import db

async def get_gmail_config():
    """Fetch Gmail integration config from installed_tools."""
    # System-level or any connected gmail integration
    config = await db.installed_tools.find_one({
        "tool_id": "gmail",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    return config

async def send_email(to_email: str, subject: str, body_html: str):
    """Send an email using SMTP."""
    config = await get_gmail_config()
    
    if not config:
        print(f"[WARN] Gmail not configured. Cannot send email to {to_email}.")
        return False
        
    creds = config.get("credentials", {})
    sender_email = creds.get("client_id")
    app_password = creds.get("client_secret")
    
    if not sender_email or not app_password:
        print(f"[WARN] Gmail credentials missing. Cannot send email to {to_email}.")
        return False
        
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender_email
    msg["To"] = to_email
    
    part = MIMEText(body_html, "html")
    msg.attach(part)
    
    try:
        # Use SMTP_SSL for port 465 or starttls for port 587
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.ehlo()
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.close()
        print(f"[INFO] Successfully sent email to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to send email to {to_email}: {e}")
        return False
