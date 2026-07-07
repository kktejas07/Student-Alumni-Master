import re

def refactor():
    with open("server.py", "r") as f:
        lines = f.readlines()

    auth_models = []
    auth_endpoints = []
    new_server_lines = []

    # State machine
    in_auth_models = False
    in_auth_endpoints = False
    in_two_fa_models = False
    in_two_fa_endpoints = False
    in_refresh = False
    in_oauth = False

    i = 0
    while i < len(lines):
        line = lines[i]

        # 1. Auth Models (RegisterRequest -> ResetPasswordRequest)
        if "class RegisterRequest" in line:
            in_auth_models = True
        if in_auth_models and "class OnboardingRequest" in line:
            in_auth_models = False
            
        if in_auth_models:
            auth_models.append(line)
            i += 1
            continue

        # 2. TwoFA Models (TwoFAChallengeResponse -> TwoFADisableRequest)
        if "class TwoFAChallengeResponse" in line:
            in_two_fa_models = True
        if in_two_fa_models and "# ----- AI payloads -----" in line:
            in_two_fa_models = False

        if in_two_fa_models:
            auth_models.append(line)
            i += 1
            continue
            
        # CheckEmailRequest model
        if "class CheckEmailRequest" in line:
            auth_models.append(line)
            auth_models.append(lines[i+1])
            auth_models.append(lines[i+2])
            i += 3
            continue
            
        # OAuthCallback model
        if "class OAuthCallback" in line:
            auth_models.append(line)
            auth_models.append(lines[i+1])
            auth_models.append(lines[i+2])
            auth_models.append(lines[i+3])
            i += 4
            continue

        # 3. Auth Endpoints (register -> login)
        if line.startswith("@api_router.post(\"/auth/register\")") or line.startswith("@api_router.post(\"/auth/register\", response_model=AuthResponse)"):
            in_auth_endpoints = True
        if in_auth_endpoints and line.startswith("@api_router.get(\"/auth/me\""):
            in_auth_endpoints = False

        if in_auth_endpoints:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue
            
        # 4. Refresh token
        if line.startswith("@api_router.post(\"/auth/refresh\")"):
            in_refresh = True
        if in_refresh and line.startswith("# ----------------------------------------------------------------------------"):
            in_refresh = False
            
        if in_refresh:
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # 5. 2FA Helpers & Endpoints
        if line.startswith("# ----------------------------------------------------------------------------") and "2FA" in lines[i+1]:
            in_two_fa_endpoints = True
        if in_two_fa_endpoints and line.startswith("# ----------------------------------------------------------------------------") and "2FA" not in lines[i+1]:
            # Wait, the end of 2FA block is OAuth block or something else.
            # In server.py, after 2FA regenerate backup, there is OAuth config.
            pass
            
        if line.startswith("TOTP_ISSUER ="):
            in_two_fa_endpoints = True
        if in_two_fa_endpoints and line.startswith("@api_router.get(\"/auth/oauth-config\")"):
            in_two_fa_endpoints = False
            
        if in_two_fa_endpoints:
            # But wait, there's a big block for 2FA.
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue
            
        # 6. OAuth Config & Endpoints
        if line.startswith("@api_router.get(\"/auth/oauth-config\")"):
            in_oauth = True
        if in_oauth and line.startswith("@api_router.post(\"/users/onboarding\""):
            in_oauth = False
            
        if in_oauth:
            # Skip the helper functions that are NOT auth endpoints?
            # Wait, _get_oauth_creds, _verify_google_token are used. They should be moved.
            auth_endpoints.append(line.replace("@api_router.", "@router."))
            i += 1
            continue

        # If it doesn't match any, it stays in server.py
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
        
    # We will inject the router import at line 140 or so.
    # We will use multi_replace_file_content for server.py later, to be safe.
    # For now, just generate auth.py properly.

if __name__ == "__main__":
    refactor()
