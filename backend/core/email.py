import os
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from core.db import db


def _plain_text(html: str) -> str:
    """Strip HTML to a plain-text fallback for Postal's text_body field."""
    text = re.sub(r"<style.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def get_postal_config() -> Optional[dict]:
    """Fetch Postal (postalserver.io) email configuration from environment.

    Postal is a self-hosted mail server exposing an HTTP JSON API. Credentials
    are supplied via environment variables so they never live in the database:
      POSTAL_API_URL         e.g. https://mail.example.com
      POSTAL_SERVER_API_KEY  server API key (Settings → API Keys)
      POSTAL_FROM_EMAIL      verified sender, e.g. Student Alumni <noreply@domain>
    """
    api_url = (os.environ.get("POSTAL_API_URL") or "").strip().rstrip("/")
    server_api_key = (os.environ.get("POSTAL_SERVER_API_KEY") or "").strip()
    if not api_url or not server_api_key:
        return None
    return {
        "api_url": api_url,
        "server_api_key": server_api_key,
        "from_email": (os.environ.get("POSTAL_FROM_EMAIL") or "").strip()
                      or "Student Alumni <noreply@studentalumni.ai>",
    }


async def get_gmail_config():
    """Fetch Gmail integration config from installed_tools."""
    # System-level or any connected gmail integration
    config = await db.installed_tools.find_one({
        "tool_id": "gmail",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    return config


async def get_sendgrid_config():
    """Fetch SendGrid integration config from installed_tools."""
    config = await db.installed_tools.find_one({
        "tool_id": "sendgrid",
        "status": {"$in": ["connected", "mock_connected"]}
    })
    return config


def _sendgrid_default_from():
    return "Student Alumni <noreply@studentalumni.ai>"


async def send_email(to_email: str, subject: str, body_html: str):
    """Send an email.

    Provider priority (all providers are optional):
      1. Postal (env-configured) — the platform's primary mail server
      2. SendGrid (marketplace API key)
      3. Gmail SMTP (marketplace credentials)

    Returns True on success, False if no provider is configured or sending fails.
    A failed delivery is never silently swallowed — it is logged at WARN/ERROR
    and recorded in the `email_failures` collection for admin visibility.
    """
    postal = get_postal_config()
    if postal:
        ok = await _send_via_postal(postal, to_email, subject, body_html)
        if ok:
            return True

    sendgrid = await get_sendgrid_config()
    if sendgrid:
        ok = await _send_via_sendgrid(sendgrid, to_email, subject, body_html)
        if ok:
            return True

    gmail = await get_gmail_config()
    if gmail:
        ok = await _send_via_gmail(gmail, to_email, subject, body_html)
        if ok:
            return True

    print(f"[WARN] No email provider configured. Cannot send email to {to_email}.")
    await _record_failure(to_email, subject, "No email provider configured")
    return False


async def _record_failure(to_email: str, subject: str, reason: str):
    """Persist a failed delivery so silent drops are visible to admins."""
    try:
        from datetime import datetime, timezone
        await db.email_failures.insert_one({
            "email": to_email,
            "subject": subject[:200],
            "reason": reason[:500],
            "created_at": datetime.now(timezone.utc),
        })
    except Exception as e:
        print(f"[WARN] Could not persist email failure: {e}")


async def _send_via_postal(config: dict, to_email: str, subject: str, body_html: str) -> bool:
    """Send via a Postal (postalserver.io) HTTP JSON API.

    Docs: https://docs.postalserver.io/developer/api
    """
    try:
        import httpx
        from email.utils import parseaddr

        from_email = config.get("from_email") or "Student Alumni <noreply@studentalumni.ai>"
        api_url = (config.get("api_url") or "").rstrip("/")
        endpoint = f"{api_url}/api/v1/send/message"

        # Postal requires a clean RFC 5322 display name for the From header.
        display_name, addr = parseaddr(from_email)
        if not addr:
            addr = from_email.strip()
            display_name = "Student Alumni"
        from_header = f"{display_name} <{addr}>" if display_name else addr

        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.post(
                endpoint,
                headers={
                    "X-Server-API-Key": config.get("server_api_key"),
                    "Content-Type": "application/json",
                },
                json={
                    "to": to_email,
                    "from": from_header,
                    "subject": subject,
                    "html_body": body_html,
                    "text_body": _plain_text(body_html),
                    "tag": "student-alumni",
                },
            )
            if r.status_code in (200, 201):
                print(f"[INFO] Postal: sent email to {to_email}")
                return True
            print(f"[ERROR] Postal send failed to {to_email}: HTTP {r.status_code} {r.text[:300]}")
            await _record_failure(to_email, subject, f"Postal HTTP {r.status_code} {r.text[:200]}")
            return False
    except Exception as e:
        print(f"[ERROR] Postal send exception to {to_email}: {e}")
        await _record_failure(to_email, subject, f"Postal exception: {e}")
        return False


async def _send_via_sendgrid(config: dict, to_email: str, subject: str, body_html: str) -> bool:
    try:
        import httpx
        creds = config.get("credentials", {})
        api_key = (creds.get("api_key") or "").strip()
        from_email = (creds.get("from_email") or "").strip() or _sendgrid_default_from()
        if not api_key:
            return False
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": from_email},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": body_html}],
                },
            )
            if r.status_code in (200, 201, 202):
                print(f"[INFO] SendGrid: sent email to {to_email}")
                return True
            print(f"[ERROR] SendGrid send failed to {to_email}: HTTP {r.status_code} {r.text[:300]}")
            return False
    except Exception as e:
        print(f"[ERROR] SendGrid send exception to {to_email}: {e}")
        await _record_failure(to_email, subject, f"SendGrid exception: {e}")
        return False


async def _send_via_gmail(config: dict, to_email: str, subject: str, body_html: str) -> bool:
    """Send via Gmail SMTP. Supports SMTP app-password creds stored either as
    (client_id/client_secret) [legacy] or (smtp_user/app_password) [preferred]."""
    creds = config.get("credentials", {})
    sender_email = creds.get("smtp_user") or creds.get("client_id")
    app_password = creds.get("app_password") or creds.get("client_secret")

    if not sender_email or not app_password:
        print(f"[WARN] Gmail credentials missing. Cannot send email to {to_email}.")
        await _record_failure(to_email, subject, "Gmail credentials missing")
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
        print(f"[INFO] Gmail: successfully sent email to {to_email}")
        return True
    except Exception as e:
        print(f"[ERROR] Gmail send failed to {to_email}: {e}")
        await _record_failure(to_email, subject, f"Gmail exception: {e}")
        return False


def render_html_email(content_html: str) -> str:
    """Wrap a content fragment in a clean, professional email shell."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="padding:0 0 16px 0;text-align:center;">
              <span style="font-size:20px;font-weight:700;color:#7C3AED;letter-spacing:0.5px;">STUDENT ALUMNI</span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px;color:#111827;font-size:15px;line-height:1.6;">
                    {content_html}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 0 0 0;text-align:center;color:#9ca3af;font-size:12px;line-height:1.6;">
              Student Alumni Cell<br/>
              You are receiving this because of your registration on the Student Alumni platform.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
