import os
import aiosmtplib
from email.message import EmailMessage
import logging

logger = logging.getLogger(__name__)

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 465))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
MAIL_FROM = os.environ.get("MAIL_FROM", SMTP_USER)
SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", str(SMTP_PORT == 465)).lower() == "true"
SMTP_START_TLS = os.environ.get("SMTP_START_TLS", str(SMTP_PORT == 587)).lower() == "true"

async def send_otp_email(to_email: str, otp: str):
    if not SMTP_HOST:
        logger.warning(f"SMTP not configured. Mocking OTP send to {to_email}")
        return True

    message = EmailMessage()
    message["From"] = MAIL_FROM
    message["To"] = to_email
    message["Subject"] = "Your Password Reset Verification Code"
    
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; padding: 20px; text-align: center;">
        <h2 style="color: #5F259F;">Password Reset Verification</h2>
        <p>You requested a password reset. Your 6-digit verification code is:</p>
        <div style="margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; display: inline-block;">
            <h1 style="color: #7C3AED; letter-spacing: 5px; margin: 0;">{otp}</h1>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
      </body>
    </html>
    """
    message.set_content(f"Your password reset code is: {otp}\nIt expires in 15 minutes.", subtype="plain")
    message.add_alternative(html_content, subtype="html")

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            username=SMTP_USER,
            password=SMTP_PASS,
            use_tls=SMTP_USE_TLS,
            start_tls=SMTP_START_TLS
        )
        logger.info(f"OTP sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
