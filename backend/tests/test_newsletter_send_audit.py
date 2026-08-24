"""
Automated audit for newsletter bulk send.

Reproduces the "Send Immediately / Send to all users" path without hitting
real email/WhatsApp providers.
"""
from __future__ import annotations

import asyncio
import inspect
import sys
import types
import unittest
from datetime import datetime, timezone, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def _ensure_module(name: str):
    if name not in sys.modules:
        sys.modules[name] = types.ModuleType(name)
    return sys.modules[name]


# Lightweight stubs so newsletter.py can import without full app stack.
_ensure_module("core")
_ensure_module("core.email")
_ensure_module("core.deps")
_ensure_module("core.whatsapp")
_ensure_module("core.security")
_ensure_module("notifications")
_ensure_module("db")

sys.modules["core.deps"].require_role = lambda *a, **k: (lambda f: f)
sys.modules["core.email"].send_email = AsyncMock(return_value=True)
sys.modules["core.email"].render_html_email = lambda html: f"<html>{html}</html>"
sys.modules["core.whatsapp"].send_wa_message = AsyncMock(return_value={"status": "sent"})
sys.modules["core.whatsapp"].send_wa_image = AsyncMock(return_value={"status": "sent"})
sys.modules["core.security"].decrypt_value = lambda v: v
sys.modules["core.security"].encrypt_value = lambda v: v
sys.modules["notifications"].send_push = AsyncMock(return_value=True)
sys.modules["notifications"]._log_inbox = AsyncMock()
sys.modules["notifications"].list_user_tokens = AsyncMock(return_value=[])

import newsletter as nl  # noqa: E402


class FakeCampaigns:
    def __init__(self):
        self.docs = {}
        self.updates = []

    async def insert_one(self, doc):
        self.docs[doc["campaign_id"]] = dict(doc)
        return MagicMock(inserted_id="x")

    async def update_one(self, filt, update):
        self.updates.append((filt, update))
        cid = filt.get("campaign_id")
        if cid in self.docs and "$set" in update:
            self.docs[cid].update(update["$set"])
        return MagicMock()


class FakeDB:
    def __init__(self, subscribers):
        self._subscribers = subscribers
        self.email_campaigns = FakeCampaigns()
        self.echo_showcases = MagicMock()
        self.echo_showcases.find = MagicMock(
            return_value=MagicMock(to_list=AsyncMock(return_value=[]))
        )


class NewsletterSendAudit(unittest.IsolatedAsyncioTestCase):
    async def test_immediate_send_does_not_crash_and_starts_background(self):
        """Regression: Send Immediately used to NameError on undefined dt_send."""
        db = FakeDB([
            {"_id": "u1", "email": "a@example.com", "phone": "+911111111111"},
            {"_id": "u2", "email": "b@example.com", "phone": ""},
        ])
        payload = nl.SendNewsletterSchema(
            subject="Build by Sunset",
            body="<p>80+ Projects Built</p>",
            cta_text="View Event Highlights & Projects",
            cta_url="https://studentalumni.ai/echo/vnrvjit",
            include_upcoming=True,
            send_email=True,
            send_push=False,
            send_in_app=True,
            send_whatsapp=True,
            send_at=None,
        )
        req = MagicMock()

        with patch.object(nl, "_get_db", return_value=db), \
             patch.object(nl, "_all_subscribers", AsyncMock(return_value=db._subscribers)), \
             patch("asyncio.create_task") as create_task:
            result = await nl.send_newsletter(payload, req, user={"email": "admin@test.com"})

        self.assertTrue(result["ok"])
        self.assertEqual(result["recipients"], 2)
        self.assertIn("background", result["message"].lower())
        self.assertEqual(len(db.email_campaigns.docs), 1)
        camp = next(iter(db.email_campaigns.docs.values()))
        self.assertEqual(camp["status"], "sending")
        self.assertEqual(camp["channels"]["email"], True)
        self.assertEqual(camp["channels"]["whatsapp"], True)
        self.assertEqual(camp["channels"]["in_app"], True)
        create_task.assert_called_once()

    async def test_scheduled_send_stores_future_campaign(self):
        db = FakeDB([{"_id": "u1", "email": "a@example.com"}])
        send_at = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
        payload = nl.SendNewsletterSchema(
            subject="Later",
            body="hi",
            send_email=True,
            send_push=False,
            send_in_app=False,
            send_whatsapp=False,
            send_at=send_at,
        )
        req = MagicMock()
        with patch.object(nl, "_get_db", return_value=db), \
             patch.object(nl, "_all_subscribers", AsyncMock(return_value=db._subscribers)), \
             patch("asyncio.create_task") as create_task:
            result = await nl.send_newsletter(payload, req, user={"email": "admin@test.com"})
        self.assertTrue(result["ok"])
        self.assertIn("scheduled", result["message"].lower())
        camp = next(iter(db.email_campaigns.docs.values()))
        self.assertEqual(camp["status"], "scheduled")
        create_task.assert_not_called()

    async def test_execute_campaign_sends_each_channel_once(self):
        """Regression: duplicate post-try loop used to double-send / crash."""
        subscribers = [
            {"_id": "u1", "email": "a@example.com", "phone": "+911111111111"},
            {"_id": "u2", "email": "b@example.com", "phone": "+922222222222"},
        ]
        db = FakeDB(subscribers)
        campaign = {
            "campaign_id": "camp1",
            "subject": "Build by Sunset",
            "hero_image": "",
            "intro": "Highlights",
            "body": "<p>Body</p>",
            "cta_text": "View",
            "cta_url": "https://studentalumni.ai/echo/vnrvjit",
            "include_upcoming": False,
            "channels": {"email": True, "push": False, "in_app": True, "whatsapp": True},
        }
        db.email_campaigns.docs["camp1"] = dict(campaign)

        email_mock = AsyncMock(return_value=True)
        wa_msg = AsyncMock(return_value={"status": "sent"})
        wa_img = AsyncMock(return_value={"status": "sent"})
        inbox = AsyncMock()

        with patch.object(nl, "_all_subscribers", AsyncMock(return_value=subscribers)), \
             patch.object(nl, "send_email", email_mock), \
             patch.object(nl, "_log_inbox", inbox):
            sys.modules["core.whatsapp"].send_wa_message = wa_msg
            sys.modules["core.whatsapp"].send_wa_image = wa_img
            await nl.execute_campaign(db, campaign)

        self.assertEqual(email_mock.await_count, 2, "email should send once per subscriber")
        self.assertEqual(inbox.await_count, 2, "in-app should send once per subscriber")
        self.assertEqual(wa_msg.await_count, 2, "whatsapp should send once per subscriber with phone")
        self.assertEqual(wa_img.await_count, 0)

        final = db.email_campaigns.docs["camp1"]
        self.assertEqual(final["status"], "completed")
        self.assertEqual(final["email_ok"], 2)
        self.assertEqual(final["in_app_ok"], 2)
        self.assertEqual(final["whatsapp_ok"], 2)

    async def test_all_subscribers_includes_decrypted_phone(self):
        """Regression: phone was omitted from projection, so WhatsApp always no_phone."""
        class FakeCursor:
            def __init__(self, rows):
                self.rows = rows

            def limit(self, _n):
                return self

            def __aiter__(self):
                async def gen():
                    for r in self.rows:
                        yield r
                return gen()

        class Users:
            def find(self, query, projection):
                self.projection = projection
                return FakeCursor([
                    {"_id": "u1", "email": "A@Example.com", "phone": "enc:999"},
                    {"_id": "u2", "email": "not-an-email", "phone": "111"},
                ])

        db = MagicMock()
        db.users = Users()

        with patch.dict(sys.modules, {"core.security": sys.modules["core.security"]}):
            sys.modules["core.security"].decrypt_value = lambda v: (
                "decrypted-999" if v == "enc:999" else v
            )
            rows = await nl._all_subscribers(db)

        self.assertIn("phone", db.users.projection)
        self.assertEqual(rows, [
            {"_id": "u1", "email": "a@example.com", "phone": "decrypted-999"},
        ])

    def test_execute_campaign_source_has_single_send_loop(self):
        src = inspect.getsource(nl.execute_campaign)
        self.assertEqual(src.count('status": "completed"'), 1)
        self.assertEqual(src.count("for sub in subscribers:"), 1)

    def test_send_newsletter_source_schedules_only_when_send_at(self):
        src = inspect.getsource(nl.send_newsletter)
        # scheduled return must be inside the send_at branch
        self.assertIn('if payload.send_at:', src)
        self.assertIn('status": "sending"', src)
        self.assertIn("Campaign sending started in the background", src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
