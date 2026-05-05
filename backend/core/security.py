"""
core.security — JWT, bcrypt, encryption, audit log helpers.

Single source of truth for authentication primitives shared by server.py
and routers/*. None of these functions take `db` directly — audit helpers
import the global `db` from core.db at call time so this module stays
import-cycle-free.
"""
import os
import io
import base64
import random
import string
from datetime import datetime, timezone, timedelta
from typing import Optional

import bcrypt
import jwt
import qrcode
from cryptography.fernet import Fernet, InvalidToken

from .db import db

# ─── JWT configuration ─────────────────────────────────────────────────
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30


# ─── Fernet encryption-at-rest ─────────────────────────────────────────
_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    _FERNET_KEY = Fernet.generate_key().decode()
    print(f"⚠️  FERNET_KEY not set — using ephemeral key (dev only): {_FERNET_KEY[:12]}…")
_FERNET = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)
_ENC_PREFIX = "enc::"


def encrypt_value(plain: Optional[str]) -> Optional[str]:
    """Wrap a string with a Fernet token + recognisable prefix."""
    if plain is None or plain == "":
        return plain
    if isinstance(plain, str) and plain.startswith(_ENC_PREFIX):
        return plain
    try:
        token = _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"
    except Exception:
        return plain


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Unwrap a Fernet ciphertext (returns input unchanged if not ours)."""
    if value is None or value == "":
        return value
    if isinstance(value, str) and value.startswith(_ENC_PREFIX):
        try:
            return _FERNET.decrypt(value[len(_ENC_PREFIX):].encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None
        except Exception:
            return None
    return value  # legacy plaintext


# ─── Password helpers ──────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ─── JWT token helpers ─────────────────────────────────────────────────
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ─── Unique ID + QR helpers ────────────────────────────────────────────
def generate_unique_id(role: str) -> str:
    """Format: SA-{YEAR}-{ROLE_CODE}-{6 random}. Used as QR payload."""
    role_codes = {"student": "STU", "alumni": "ALM", "mentor": "MNT", "college": "CLG", "admin": "ADM"}
    code = role_codes.get(role, "USR")
    rand = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SA-{datetime.now().year}-{code}-{rand}"


def generate_qr_code(data: str) -> str:
    """Generate a base64 PNG QR code (brand-purple foreground)."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2,
                       error_correction=qrcode.constants.ERROR_CORRECT_M)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#5F259F", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ─── Audit log helpers ─────────────────────────────────────────────────
async def _audit_log(user_id: str, field: str, old_value, new_value, *,
                     source: str = "onboarding",
                     validation_status: str = "passed",
                     is_manual_entry: bool = False) -> None:
    """Best-effort single audit log insert. Never raises."""
    try:
        await db.audit_logs.insert_one({
            "user_id": user_id,
            "field_name": field,
            "old_value": old_value if old_value is not None else None,
            "new_value": new_value if new_value is not None else None,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": bool(is_manual_entry),
            "ts": datetime.now(timezone.utc),
        })
    except Exception:
        pass


async def _audit_log_many(user_id: str, source: str, entries: list,
                          validation_status: str = "passed") -> None:
    """Bulk insert audit entries. `entries` is a list of (field, old, new) tuples."""
    if not entries:
        return
    try:
        docs = [{
            "user_id": user_id,
            "field_name": f,
            "old_value": o,
            "new_value": n,
            "source": source,
            "validation_status": validation_status,
            "is_manual_entry": False,
            "ts": datetime.now(timezone.utc),
        } for (f, o, n) in entries if n is not None and n != ""]
        if docs:
            await db.audit_logs.insert_many(docs, ordered=False)
    except Exception:
        pass


__all__ = [
    'JWT_SECRET', 'JWT_ALGORITHM', 'ACCESS_TOKEN_EXPIRE_MINUTES', 'REFRESH_TOKEN_EXPIRE_DAYS',
    'encrypt_value', 'decrypt_value',
    'hash_password', 'verify_password',
    'create_access_token', 'create_refresh_token',
    'generate_unique_id', 'generate_qr_code',
    '_audit_log', '_audit_log_many',
]
