import os
from slowapi import Limiter
from core.middleware import get_real_ip

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\" and add it to backend/.env")
JWT_ALGORITHM = "HS256"


def frontend_base_url(default: str = "https://studentalumni.ai") -> str:
    """Base URL of the frontend, trailing slash stripped.

    Centralizes the reads that were copy-pasted across routers:
      ``frontend_base_url()``            — falls back to the prod domain
      ``frontend_base_url(default="")``  — falls back to empty (caller supplies its own)
    """
    return (os.environ.get("FRONTEND_URL") or default).strip().rstrip("/")


limiter = Limiter(key_func=get_real_ip, default_limits=["200/minute"])
