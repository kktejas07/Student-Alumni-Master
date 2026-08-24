"""
backend/tests/test_pdf_generator.py

Unit test suite for PDFGeneratorService.
Verifies PDF generation for Event Passes and ATS Resumes.
"""

import sys
import unittest
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from services.pdf_generator import PDFGeneratorService


class TestPDFGenerator(unittest.TestCase):
    """Test suite for PDFGeneratorService."""

    def test_generate_event_pass_pdf(self):
        pdf_bytes = PDFGeneratorService.generate_event_pass(
            title="National AI Hackathon 2026",
            category="Hackathon",
            date_str="Oct 24-26, 2026",
            mode="Online",
            city="Global",
            confirmation_id="REG-SA-123456",
            attendee_name="Rahul Verma"
        )
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 500)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))

    def test_generate_resume_pdf(self):
        pdf_bytes = PDFGeneratorService.generate_resume_pdf(
            candidate_name="Tejas Sharma",
            summary="Experienced Python engineer specializing in FastAPI and scalable web architecture.",
            bullet_points=[
                "Built high-throughput backend APIs handling 50k+ daily requests.",
                "Integrated Qdrant RAG engine for semantic search."
            ],
            matched_keywords=["Python", "FastAPI", "Docker", "RAG"]
        )
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertGreater(len(pdf_bytes), 500)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))


if __name__ == "__main__":
    unittest.main()
