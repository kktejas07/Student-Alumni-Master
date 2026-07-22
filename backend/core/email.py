import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from core.db import db

EMAIL_SETTINGS_KEY = "email_settings"

async def get_email_settings():
    doc = await db.site_config.find_one({"_key": EMAIL_SETTINGS_KEY})
    if not doc:
        return None
    return doc.get("settings", {})

async def send_email(to_email: str, subject: str, body_html: str):
    settings = await get_email_settings()
    provider = (settings or {}).get("provider", "")

    if provider == "postal":
        return await send_email_postal(to_email, subject, body_html, settings)
    elif provider == "smtp":
        return await send_email_smtp(to_email, subject, body_html, settings)
    else:
        return await send_email_gmail(to_email, subject, body_html)

async def send_email_postal(to_email: str, subject: str, body_html: str, settings: dict):
    server = (settings.get("postal_server") or "").rstrip("/")
    api_key = settings.get("postal_api_key", "")
    from_email = settings.get("from_email", "")
    from_name = settings.get("from_name", "")

    if not server or not api_key or not from_email:
        print(f"[WARN] Postal not fully configured. Cannot send email to {to_email}.")
        return False

    payload = {
        "to": [to_email],
        "from": from_email,
        "sender": from_email,
        "subject": subject,
        "html_body": body_html,
    }
    if from_name:
        payload["from_name"] = from_name

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{server}/api/v1/send/message",
                json=payload,
                headers={"X-Server-API-Key": api_key, "Content-Type": "application/json"},
            )
            if resp.is_success:
                print(f"[INFO] Postal: email sent to {to_email}")
                return True
            else:
                print(f"[ERROR] Postal: failed ({resp.status_code}) to {to_email}: {resp.text}")
                return False
    except Exception as e:
        print(f"[ERROR] Postal: exception sending to {to_email}: {e}")
        return False

async def send_email_smtp(to_email: str, subject: str, body_html: str, settings: dict):
    host = settings.get("smtp_host", "")
    port = settings.get("smtp_port", 587)
    user = settings.get("smtp_user", "")
    password = settings.get("smtp_password", "")
    from_email = settings.get("from_email", "")

    if not host or not user or not password or not from_email:
        print(f"[WARN] SMTP not fully configured. Cannot send email to {to_email}.")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(body_html, "html"))

    try:
        server = smtplib.SMTP(host, port)
        server.ehlo()
        if port == 587:
            server.starttls()
            server.ehlo()
        server.login(user, password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.close()
        print(f"[INFO] SMTP: email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] SMTP: failed to send to {to_email}: {e}")
        return False

async def get_gmail_config():
    config = await db.installed_tools.find_one({
        "tool_id": "gmail",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    return config

async def send_email_gmail(to_email: str, subject: str, body_html: str):
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
    msg.attach(MIMEText(body_html, "html"))
    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.ehlo()
        server.starttls()
        server.login(sender_email, app_password)
        server.sendmail(sender_email, to_email, msg.as_string())
        server.close()
        print(f"[INFO] Gmail: email sent to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Gmail: failed to send to {to_email}: {e}")
        return False
