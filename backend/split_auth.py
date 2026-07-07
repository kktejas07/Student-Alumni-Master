import sys

with open("server.py", "r") as f:
    lines = f.readlines()

def get_block(start_line, end_line):
    # lines are 1-indexed in our view, so subtract 1
    return "".join(lines[start_line-1 : end_line])

# We need to construct routers/auth.py
auth_code = """import asyncio
import base64
import io
import random
import re
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Any

import jwt
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
from server import serialize_user, JWT_SECRET, JWT_ALGORITHM, _FERNET

router = APIRouter(tags=["auth"])
limiter = Limiter(key_func=get_remote_address)

# ----- Auth payloads -----
"""

# Auth Models
auth_code += get_block(275, 359)
auth_code += get_block(361, 396)
auth_code += get_block(668, 670)
auth_code += get_block(2319, 2321)

auth_code += "\n# ----- Auth Endpoints -----\n"

# Auth Endpoints
# register, forgot-password, reset-password, login
auth_code += get_block(610, 666).replace("@api_router", "@router")
auth_code += get_block(672, 694).replace("@api_router", "@router")
auth_code += get_block(696, 727).replace("@api_router", "@router")
auth_code += get_block(729, 750).replace("@api_router", "@router")
auth_code += get_block(752, 781).replace("@api_router", "@router")
auth_code += get_block(783, 858).replace("@api_router", "@router")

# refresh
auth_code += get_block(1515, 1533).replace("@api_router", "@router")

# 2FA Helpers
auth_code += get_block(1536, 1568)

# 2FA Endpoints
auth_code += get_block(1941, 2092).replace("@api_router", "@router")

# OAuth Endpoints
auth_code += get_block(2182, 2200).replace("@api_router", "@router")
auth_code += get_block(2323, 2491).replace("@api_router", "@router")

with open("routers/auth.py", "w") as f:
    f.write(auth_code)

print("Created routers/auth.py")
