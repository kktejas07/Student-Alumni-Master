import os
from slowapi import Limiter
from core.middleware import get_real_ip

JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET is not set. Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\" and add it to backend/.env")
JWT_ALGORITHM = "HS256"

limiter = Limiter(key_func=get_real_ip, default_limits=["200/minute"])
