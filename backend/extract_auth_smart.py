import re

def refactor():
    with open("server.py", "r") as f:
        lines = f.readlines()

    auth_models = []
    auth_endpoints = []
    new_server_lines = []

    in_auth_models = False
    in_twofa_models = False
    in_check_email = False
    in_oauth_cb = False
    in_auth_endpoints = False
    in_refresh = False
    in_twofa = False
    in_oauth = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # --- Models ---
        if "class RegisterRequest(BaseModel):" in line:
            in_auth_models = True
        if in_auth_models and "class OnboardingRequest(BaseModel):" in line:
            in_auth_models = False
        if in_auth_models:
            auth_models.append(line)
            i += 1
            continue

        if "class TwoFAChallengeResponse(BaseModel):" in line:
            in_twofa_models = True
        if in_twofa_models and "# ----- AI payloads -----" in line:
            in_twofa_models = False
        if in_twofa_models:
            auth_models.append(line)
            i += 1
            continue

        if "class CheckEmailRequest(BaseModel):" in line:
            in_check_email = True
        if in_check_email and "@api_router.post(\"/auth/check-email\")" in line:
            in_check_email = False
        if in_check_email:
            auth_models.append(line)
            i += 1
            continue

        if "class OAuthCallback(BaseModel):" in line:
            in_oauth_cb = True
        if in_oauth_cb and "async def _upsert_oauth_user(" in line:
            in_oauth_cb = False
        if in_oauth_cb:
            auth_models.append(line)
            i += 1
            continue

        # --- Endpoints ---
        if "@api_router.post(\"/auth/register\"" in line:
            in_auth_endpoints = True
        if in_auth_endpoints and "@api_router.get(\"/auth/me\"" in line:
            in_auth_endpoints = False
        if in_auth_endpoints:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        if "@api_router.post(\"/auth/refresh\")" in line:
            in_refresh = True
        if in_refresh and "def _generate_backup_codes(" in line:
            # We want to stop right before the 2FA section, which is marked by TOTP_ISSUER or _generate_backup_codes
            # Let's stop at TOTP_ISSUER or # ----------------------------------------------------------------------------
            pass
        if line.startswith("# ----------------------------------------------------------------------------") and "2FA" in lines[i+1] if i+1 < len(lines) else False:
            in_refresh = False
        if in_refresh:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        if line.startswith("# ----------------------------------------------------------------------------") and "2FA" in lines[i+1] if i+1 < len(lines) else False:
            in_twofa = True
        if in_twofa and "@api_router.get(\"/auth/oauth-config\")" in line:
            in_twofa = False
        if in_twofa:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        if "@api_router.get(\"/auth/oauth-config\")" in line:
            in_oauth = True
        if in_oauth and "@api_router.post(\"/users/onboarding\"" in line:
            in_oauth = False
        if in_oauth:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        new_server_lines.append(line)
        i += 1

    auth_py_content = """import asyncio
import base64
import io
import os
import random
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any

import jwt
import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, field_validator
from slowapi import Limiter
from slowapi.util import get_remote_address
from bson import ObjectId

from core.db import db
from core.security import (
    hash_password, verify_password, create_access_token, create_refresh_token,
    encrypt_value, decrypt_value, _audit_log, _audit_log_many
)
from core.models import UserRole, AuthResponse, UserResponse
from server import serialize_user, get_current_user, JWT_SECRET, JWT_ALGORITHM

router = APIRouter(tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# ----- Auth payloads -----
""" + "".join(auth_models) + "\n# ----- Auth Endpoints -----\n" + "".join(auth_endpoints)

    with open("routers/auth.py", "w") as f:
        f.write(auth_py_content)
        
    for i, line in enumerate(new_server_lines):
        if "api_router = APIRouter(" in line:
            new_server_lines.insert(i+1, "from routers.auth import router as auth_router\napi_router.include_router(auth_router)\n")
            break

    with open("server.py", "w") as f:
        f.writelines(new_server_lines)

if __name__ == "__main__":
    refactor()
