"""
backend/tests/test_platform_rag_and_agents.py

Comprehensive unit test suite for:
1. Platform-Wide RAG Engine (indexing, RBAC filtering, semantic search)
2. ATS Resume Optimizer Agent
3. Alumni Outreach Agent
4. Mentor Syllabus Agent
"""

import sys
import os
import unittest
import asyncio
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.platform_rag import PlatformRAGEngine, index_all_platform_data
from services.resume_agent import ATSResumeAgent
from services.outreach_agent import AlumniOutreachAgent
from services.syllabus_agent import MentorSyllabusAgent


class TestPlatformRAG(unittest.TestCase):
    """Test suite for Platform RAG Engine."""

    def test_indexing_structure(self):
        sample_entities = [
            {
                "text": "Job Title: AI Engineer at Google | Tech Stack: Python, PyTorch, FastAPI",
                "metadata": {
                    "entity_type": "job",
                    "entity_id": "job-101",
                    "title": "AI Engineer",
                    "allowed_roles": ["student", "alumni"]
                }
            },
            {
                "text": "Event: National AI Hackathon 2026 | Mode: Online | Prize: 5 Lakhs",
                "metadata": {
                    "entity_type": "event",
                    "entity_id": "ev-202",
                    "title": "National AI Hackathon",
                    "allowed_roles": ["student", "alumni", "mentor", "college"]
                }
            }
        ]
        indexed_count = PlatformRAGEngine.index_entities(sample_entities)
        self.assertIsInstance(indexed_count, int)

    def test_semantic_search_empty_query(self):
        res = PlatformRAGEngine.search("")
        self.assertEqual(res, [])

    def test_rbac_filtering(self):
        res = PlatformRAGEngine.search(
            query="AI Engineer",
            entity_type="job",
            user_role="student",
            top_k=5
        )
        self.assertIsInstance(res, list)


class TestATSResumeAgent(unittest.TestCase):
    """Test suite for ATS Resume Optimizer Agent."""

    def test_resume_analysis(self):
        profile = {
            "full_name": "Tejas Sharma",
            "skills": ["Python", "FastAPI", "React", "Docker", "Git"]
        }
        jd = "We are seeking a Python Engineer with experience in FastAPI, Docker, and Kubernetes for building cloud services."
        
        analysis = ATSResumeAgent.analyze_resume(profile, jd)
        self.assertIn("ats_compatibility_score", analysis)
        self.assertGreaterEqual(analysis["ats_compatibility_score"], 35)
        self.assertIn("matched_keywords", analysis)
        self.assertIn("missing_keywords", analysis)
        self.assertIn("optimized_summary", analysis)
        self.assertGreater(len(analysis["ats_bullet_points"]), 0)


class TestAlumniOutreachAgent(unittest.TestCase):
    """Test suite for Alumni Outreach Agent."""

    def test_outreach_generation(self):
        student = {
            "full_name": "Rahul Verma",
            "school_info": {"institution_name": "IIT Hyderabad"}
        }
        alumni = {
            "full_name": "Priya Patel",
            "current_company": "Microsoft",
            "current_role": "Senior Software Engineer"
        }
        
        outreach = AlumniOutreachAgent.generate_outreach(student, alumni, goal="coffee_chat")
        self.assertEqual(outreach["alumni_name"], "Priya Patel")
        self.assertIn("Microsoft", outreach["company"])
        self.assertLessEqual(len(outreach["linkedin_connection_note"]), 300)
        self.assertIn("Coffee Chat Request", outreach["email_subject"])
        self.assertGreater(len(outreach["conversation_starters"]), 0)


class TestMentorSyllabusAgent(unittest.TestCase):
    """Test suite for Mentor Syllabus Generator Agent."""

    def test_syllabus_generation(self):
        syllabus = MentorSyllabusAgent.generate_syllabus(
            topic="Full Stack AI Development",
            target_level="Intermediate",
            weeks=4
        )
        self.assertIn("Full Stack Ai Development", syllabus["course_title"])
        self.assertEqual(syllabus["duration_weeks"], 4)
        self.assertEqual(len(syllabus["modules"]), 4)
        self.assertIn("hands_on_projects", syllabus["grading_rubric"])


class TestAsyncPlatformRAGSync(unittest.TestCase):
    """Test suite for async background platform RAG sync."""

    def test_async_platform_rag_indexer(self):
        async def run_test():
            class MockCursor:
                def __init__(self, items):
                    self.items = items
                    self.idx = 0
                def limit(self, n):
                    return self
                def __aiter__(self):
                    return self
                async def __anext__(self):
                    if self.idx < len(self.items):
                        item = self.items[self.idx]
                        self.idx += 1
                        return item
                    raise StopAsyncIteration

            class MockCollection:
                def __init__(self, items):
                    self.items = items
                def find(self, filter_doc):
                    return MockCursor(self.items)

            class MockDB:
                def __init__(self):
                    self.echo_showcases = MockCollection([
                        {"_id": "1", "title": "Test AI Event", "category": "Hackathon", "description": "Test", "mode": "Online"}
                    ])
                    self.jobs_cache = MockCollection([
                        {"_id": "2", "title": "Backend Dev", "company": "Acme", "description": "FastAPI"}
                    ])
                    self.courses = MockCollection([
                        {"_id": "3", "title": "Python Bootcamp", "summary": "Learn Python"}
                    ])
                    self.users = MockCollection([
                        {"_id": "4", "role": "mentor", "full_name": "Dr. Smith", "skills": ["AI", "ML"]},
                        {"_id": "5", "role": "alumni", "full_name": "Jane Doe", "company": "Google"}
                    ])
                    self.deals = MockCollection([
                        {"_id": "6", "title": "GitHub Student Pack", "partner": "GitHub"}
                    ])
                    self.rentals = MockCollection([
                        {"_id": "7", "title": "Studio Flat", "location": "Bangalore"}
                    ])

            mock_db = MockDB()
            count = await index_all_platform_data(mock_db)
            self.assertIsInstance(count, int)

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
