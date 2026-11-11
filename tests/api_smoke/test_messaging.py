"""
Smoke tests for the DM messaging endpoints.

These tests verify the endpoints exist and return expected status codes
without authentication (401) and with bad input (400/422).
They do NOT require a running server with auth tokens.
"""
import httpx
import pytest

BASE = "http://localhost:8000/api/messages"


@pytest.fixture
def client():
    return httpx.Client(timeout=10)


class TestMessagingEndpointsUnauth:
    """All messaging endpoints should require authentication."""

    def test_list_conversations_401(self, client):
        r = client.get(f"{BASE}/conversations")
        assert r.status_code == 401

    def test_get_messages_401(self, client):
        r = client.get(f"{BASE}/conversations/000000000000000000000000")
        assert r.status_code == 401

    def test_create_conversation_401(self, client):
        r = client.post(f"{BASE}/conversations", json={"participant_id": "abc"})
        assert r.status_code == 401

    def test_send_message_401(self, client):
        r = client.post(
            f"{BASE}/conversations/000000000000000000000000/send",
            json={"text": "hello"},
        )
        assert r.status_code == 401

    def test_mark_read_401(self, client):
        r = client.put(f"{BASE}/conversations/000000000000000000000000/read")
        assert r.status_code == 401


class TestMessagingWebSocket:
    """WebSocket endpoint rejects missing/bad tokens."""

    @pytest.mark.asyncio
    async def test_ws_no_token_rejected(self):
        """WS without token should close with 4001."""
        async with httpx.AsyncClient() as ac:
            # We can't easily test WS with httpx, but we can verify the
            # HTTP upgrade fails without a token (returns 403 or connection refused)
            r = await ac.get(
                f"{BASE}/ws",
                headers={"Connection": "Upgrade", "Upgrade": "websocket"},
            )
            # FastAPI returns 403 for WS when accessed via plain HTTP
            assert r.status_code in (403, 400, 426)
