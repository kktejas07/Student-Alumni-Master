import re

def refactor():
    with open("server.py", "r") as f:
        lines = f.readlines()

    def get_block(start, end):
        return lines[start-1 : end]
        
    auth_models = []
    auth_endpoints = []
    
    # --- Models ---
    auth_models += get_block(274, 340) # Register to ResetPassword
    auth_models += get_block(361, 396) # 2FA models
    auth_models += get_block(668, 670) # CheckEmail
    auth_models += get_block(2109, 2119) # OAuthCallback
    
    # --- Endpoints (and helpers) ---
    auth_endpoints += get_block(610, 859) # register to login
    auth_endpoints += get_block(1515, 1534) # refresh
    auth_endpoints += get_block(1536, 1569) # 2FA helpers
    auth_endpoints += get_block(1941, 2090) # 2FA endpoints
    auth_endpoints += get_block(2121, 2200) # OAuth helpers & config
    auth_endpoints += get_block(2319, 2489) # OAuth endpoints
    
    # Prepare auth.py content
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
""" + "".join(auth_models) + "\n# ----- Auth Endpoints -----\n" + "".join(auth_endpoints).replace("@api_router", "@router")

    with open("routers/auth.py", "w") as f:
        f.write(auth_py_content)
        
    # --- Now we must remove these from server.py ---
    # We will replace these blocks with empty strings to keep line numbers intact (to avoid breaking other things!)
    # Actually, keeping line numbers intact is the smartest move so my next steps (users.py etc) don't get shifted!
    def clear_block(start, end):
        for i in range(start-1, end):
            lines[i] = "\n"
            
    clear_block(274, 340)
    clear_block(361, 396)
    clear_block(668, 670)
    clear_block(2109, 2119)
    clear_block(610, 859)
    clear_block(1515, 1534)
    clear_block(1536, 1569)
    clear_block(1941, 2090)
    clear_block(2121, 2200)
    clear_block(2319, 2489)
    
    # Inject the router import.
    # Where does api_router get defined? Let's insert the import and include_router near it.
    for i, line in enumerate(lines):
        if "api_router = APIRouter()" in line:
            lines.insert(i+1, "from routers.auth import router as auth_router\napi_router.include_router(auth_router)\n")
            break

    with open("server.py", "w") as f:
        f.writelines(lines)
        
if __name__ == "__main__":
    refactor()
