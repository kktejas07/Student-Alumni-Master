"""
Shared fixtures for API smoke tests.

These tests verify the server does not return 500 errors on critical
endpoints. They do NOT require authentication tokens — they only check
that the endpoint exists and handles unauthenticated requests gracefully
(returning 401/403/422 instead of crashing).

Usage:
    BASE_URL=http://localhost:8000 pytest tests/api_smoke/ -v
"""
import os

import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")


@pytest.fixture
def base_url():
    """Base URL for the running backend server."""
    return BASE_URL
