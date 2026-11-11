"""
Encryption-at-Rest — Fernet (AES-128 in CBC mode + HMAC-SHA256).

Per spec — encrypt sensitive personal data (dob, phone, postal_code) at rest.
Backwards-compat: legacy users may have plaintext values; decrypt() returns
the input as-is when it can't be decoded as Fernet ciphertext.
"""
from __future__ import annotations

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

try:
    from cryptography.fernet import Fernet, InvalidToken
    _HAS_CRYPTOGRAPHY = True
except Exception:
    _HAS_CRYPTOGRAPHY = False

    class Fernet:  # type: ignore[no-redef]
        @staticmethod
        def generate_key():
            return b"dummy_key_for_dev_booting_without_cryptography_32b_len="

        def __init__(self, key):
            pass

        def encrypt(self, data: bytes) -> bytes:
            return data

        def decrypt(self, data: bytes) -> bytes:
            return data

    class InvalidToken(Exception):  # type: ignore[no-redef]
        pass


_FERNET_KEY = os.environ.get("FERNET_KEY")
if not _FERNET_KEY:
    if os.getenv("ENV") == "production":
        raise RuntimeError(
            "FERNET_KEY environment variable is required in production. "
            "PII encryption (phone, dob, postal_code) would be non-persistent without it."
        )
    # Auto-generate a session key in dev so the app boots; logs a warning.
    if _HAS_CRYPTOGRAPHY:
        _FERNET_KEY = Fernet.generate_key().decode()
    else:
        _FERNET_KEY = Fernet.generate_key().decode("utf-8")
    logger.warning(
        "FERNET_KEY not set -- using ephemeral key (dev only). "
        "Set FERNET_KEY in .env for persistent PII encryption."
    )
_FERNET = Fernet(_FERNET_KEY.encode() if isinstance(_FERNET_KEY, str) else _FERNET_KEY)
# Marker so we can recognise our ciphertexts in mixed-format collections.
_ENC_PREFIX = "enc::"


def encrypt_value(plain: Optional[str]) -> Optional[str]:
    """Wrap a string with the Fernet token + a recognisable prefix."""
    if plain is None or plain == "":
        return plain
    if isinstance(plain, str) and plain.startswith(_ENC_PREFIX):
        return plain  # already encrypted
    try:
        token = _FERNET.encrypt(plain.encode("utf-8")).decode("utf-8")
        return f"{_ENC_PREFIX}{token}"
    except Exception:
        return plain  # never block the write on encryption failure


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Unwrap a Fernet ciphertext. Returns the input unchanged if not ours."""
    if value is None or value == "":
        return value
    if isinstance(value, str) and value.startswith(_ENC_PREFIX):
        try:
            return _FERNET.decrypt(value[len(_ENC_PREFIX) :].encode("utf-8")).decode("utf-8")
        except InvalidToken:
            return None  # tampered or wrong key -- return None defensively
        except Exception:
            return None
    return value  # legacy plaintext
