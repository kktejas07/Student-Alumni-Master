"""
backend/tests/test_event_agent_pipeline.py

Unit tests for AI Event Scraper Agent (GlobalEventAgent) and
Event Registration APIs.
"""

import sys
import os
import unittest
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.event_agent import GlobalEventAgent, slugify, run_global_event_agent


class TestEventAgentPipeline(unittest.TestCase):
    """Unit test suite for AI Event Scraper Agent."""

    def setUp(self):
        self.agent = GlobalEventAgent(limit_per_category=5)
        self.mock_item = {
            "id": 98765,
            "title": "Global AI & Quantum Hackathon 2026",
            "organisation": {"name": "Tech Corp"},
            "seo_url": "competitions/global-ai-hackathon",
            "banner_mobile": {"image_url": "https://example.com/banner.jpg"},
            "regnRequirements": {
                "start_regn_dt": "2026-09-01T00:00:00+05:30",
                "end_regn_dt": "2026-09-15T23:59:59+05:30",
            },
            "status": "LIVE",
            "register_count": 450,
        }

    def test_slugify(self):
        """Test slugify helper function."""
        raw = "Global AI & Quantum Hackathon 2026! @#$"
        slug = slugify(raw)
        self.assertTrue(slug.startswith("global-ai"))
        self.assertNotIn("&", slug)
        self.assertNotIn("@", slug)

    def test_transform_item_hackathon(self):
        """Test transformation of a raw hackathon payload."""
        doc = self.agent.transform_item(self.mock_item, "hackathons")

        self.assertEqual(doc["category"], "Hackathons & Coding")
        self.assertEqual(doc["type"], "hackathon")
        self.assertEqual(doc["event_status_badge"], "Live")
        self.assertEqual(doc["organizer_name"], "Tech Corp")
        self.assertEqual(doc["venue"], "Online / Virtual")
        self.assertEqual(doc["mode"], "online")
        self.assertEqual(doc["fee"], 0.0)
        self.assertIn("Hackathon", doc["tags"])
        self.assertTrue(doc["slug"].startswith("unstop-hackathons-global-ai"))

    def test_transform_item_workshop(self):
        """Test transformation of a raw workshop payload."""
        doc = self.agent.transform_item(self.mock_item, "workshops")

        self.assertEqual(doc["category"], "Workshops & Webinars")
        self.assertEqual(doc["type"], "workshop")
        self.assertIn("Workshop", doc["tags"])

    def test_transform_item_dates(self):
        """Test date range extraction."""
        doc = self.agent.transform_item(self.mock_item, "quizzes")
        self.assertIn("2026-09-01", doc["date"])
        self.assertIn("2026-09-15", doc["date"])

    def test_transform_item_missing_fields_fallback(self):
        """Test fallback behavior when optional payload fields are missing."""
        sparse_item = {"title": "Sparse Quiz"}
        doc = self.agent.transform_item(sparse_item, "quizzes")

        self.assertEqual(doc["title"], "Sparse Quiz")
        self.assertEqual(doc["organizer_name"], "Global Partner")
        self.assertEqual(doc["date"], "Open")
        self.assertTrue(doc["banner_url"].startswith("http"))


class TestEventRegistrationAsync(unittest.TestCase):
    """Async unit tests for database sync and registration flows."""

    def test_runner_returns_integer(self):
        """Test run_global_event_agent returns an integer count."""
        async def run_test():
            # Mock DB object
            class MockCollection:
                async def update_one(self, filter_doc, update_doc, upsert=False):
                    return True

            class MockDB:
                def __init__(self):
                    self.echo_showcases = MockCollection()
                    self.events_v2 = MockCollection()

            mock_db = MockDB()
            count = await run_global_event_agent(mock_db)
            self.assertIsInstance(count, int)
            self.assertGreaterEqual(count, 0)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
