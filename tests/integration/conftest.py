"""
Shared fixtures for integration tests.

These tests verify authentication flows and protected endpoint behavior.
They require a running backend server with a known test account.

Usage:
    BASE_URL=http://localhost:8000 pytest tests/integration/ -v

Environment variables:
    BASE_URL        - Backend server URL (default: http://localhost:8000)
    TEST_EMAIL      - Test account email (default: admin@studentalumni.ai)
    TEST_PASSWORD   - Test account password (default: admin123)
"""
import os

import pytest

BASE_URL = os.environ.get("BASE_URL", "http://localhost:8000")
TEST_EMAIL = os.environ.get("TEST_EMAIL", "admin@studentalumni.ai")
TEST_PASSWORD = os.environ.get("TEST_PASSWORD", "admin123")


@pytest.fixture
def base_url():
    """Base URL for the running backend server."""
    return BASE_URL


@pytest.fixture
def test_credentials():
    """Test account credentials."""
    return {"email": TEST_EMAIL, "password": TEST_PASSWORD}
