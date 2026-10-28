"""
ECHO Showcase — FastAPI router & CMS engine.

Public routes  (no auth required for published showcases):
  GET  /api/echo/showcases              list published showcases
  GET  /api/echo/showcases/{slug}       single full showcase

Admin routes   (super-admin JWT required):
  POST   /api/echo/admin/showcases
  PUT    /api/echo/admin/showcases/{id}
  DELETE /api/echo/admin/showcases/{id}
  PATCH  /api/echo/admin/showcases/{id}/publish
  PATCH  /api/echo/admin/showcases/{id}/draft
  PATCH  /api/echo/admin/showcases/{id}/archive
  GET    /api/echo/admin/showcases      (all statuses)
  POST   /api/echo/admin/upload         (media & document upload)
  GET    /api/echo/admin/media          (media library listing)
  DELETE /api/echo/admin/media/{filename}  (delete media file)
"""

from __future__ import annotations
import os
import re
import string
import base64
import hashlib
import json
import secrets
import mimetypes
from pathlib import Path
from datetime import datetime, timezone, date as _date
from typing import Any, Dict, List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, File, UploadFile, Query, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

logger = logging.getLogger("studentalumni.echo_showcase")
from pydantic import BaseModel, Field, field_validator

from core.security import (
    generate_qr_code,
    generate_unique_id,
    hash_password,
    encrypt_value,
)
from core.email import send_email, render_html_email, generate_pdf_from_html
from core.whatsapp import send_wa_message, send_wa_documents
from core.deps import bearer_token, decode_payload, decode_payload_silent, ensure_admin
from core.config import frontend_base_url

router = APIRouter(prefix="/api/echo", tags=["echo-showcase"])




# ── Step 5b: domain segments (features/echo_events) ─────────────────────
# The original 8126-line body was cut verbatim into the 16 segments under
# features/echo_events/. They are exec'd into THIS module's namespace below, in
# source order, rather than imported as submodules: the echo test suite patches
# module attributes (send_email, _store_invoice_and_email,
# _mirror_to_event_registration, _razorpay_config), so internal calls must resolve
# through these globals for the patches to intercept. Exec preserves the original
# single-module semantics: 'latest def wins', source-order route registration on
# this same `router`, and the Path(__file__) static-file lookups.
import pathlib as _echo_seg_pathlib

_ECHO_EVENT_SEGMENTS = (

    "unstop_api",

    "data",

    "core_helpers",

    "invoice_helpers",

    "provisioning",

    "schemas_seed",

    "handbook_public_api",

    "register_api",

    "payments_api",

    "invoices_api",

    "admin_registrations_api",

    "ticket_api",

    "admin_api",

    "coupons_api",

    "volunteers_api",

    "interns_api",

)
_echo_seg_dir = _echo_seg_pathlib.Path(__file__).with_name("echo_events")
for _echo_seg_name in _ECHO_EVENT_SEGMENTS:
    _echo_seg_path = _echo_seg_dir / f"{_echo_seg_name}.py"
    exec(compile(_echo_seg_path.read_text(encoding="utf-8"), str(_echo_seg_path), "exec"), globals())
del _echo_seg_dir, _echo_seg_name, _echo_seg_path, _ECHO_EVENT_SEGMENTS, _echo_seg_pathlib
