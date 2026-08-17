"""
backend/services/pdf_generator.py

Enterprise PDF Generation Engine for Student Alumni Platform.
Generates PDF files for Event Passes, Resumes, Verified Certificates, and Course Syllabi.
"""

import logging
from typing import Dict, Any, List
from fpdf import FPDF

logger = logging.getLogger("pdf_generator")


class PDFGeneratorService:
    """PDF Generator Service using fpdf2."""

    @staticmethod
    def generate_event_pass(
        title: str,
        category: str,
        date_str: str,
        mode: str,
        city: str,
        confirmation_id: str,
        attendee_name: str
    ) -> bytes:
        logger.debug(f"[PDFGenerator DEBUG] Generating Event Pass for '{title}' conf_id='{confirmation_id}'")

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # Header Colors & Brand Banner
        pdf.set_fill_color(15, 23, 42) # Deep navy background
        pdf.rect(0, 0, 210, 45, 'F')

        pdf.set_font("Helvetica", "B", 20)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(15, 12)
        pdf.cell(0, 10, "STUDENT ALUMNI PLATFORM")

        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(167, 139, 250) # Light violet
        pdf.set_xy(15, 24)
        pdf.cell(0, 6, "OFFICIAL EVENT REGISTRATION TICKET PASS")

        # Main Ticket Frame
        pdf.set_y(55)
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(226, 232, 240)
        pdf.rect(15, 55, 180, 140, 'DF')

        # Confirmation ID Badge Box
        pdf.set_fill_color(16, 185, 129) # Emerald Green badge
        pdf.rect(25, 68, 160, 14, 'F')
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(255, 255, 255)
        pdf.set_xy(30, 72)
        pdf.cell(150, 6, f"TICKET CONFIRMATION CODE: {confirmation_id}", align='C')

        # Event Details
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(15, 23, 42)
        pdf.set_xy(25, 90)
        pdf.multi_cell(160, 8, title)

        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(109, 40, 217)
        pdf.set_xy(25, 115)
        pdf.cell(80, 6, f"Category: {category.upper()}")
        pdf.cell(80, 6, f"Mode: {mode.upper()}")

        pdf.set_font("Helvetica", "", 10.5)
        pdf.set_text_color(71, 85, 105)
        pdf.set_xy(25, 126)
        pdf.cell(80, 6, f"Date: {date_str}")
        pdf.cell(80, 6, f"City / Venue: {city}")

        pdf.set_xy(25, 136)
        pdf.cell(160, 6, f"Registered Attendee: {attendee_name}")

        # Verification Footer Box
        pdf.set_draw_color(203, 213, 225)
        pdf.line(25, 155, 185, 155)

        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(100, 116, 139)
        pdf.set_xy(25, 162)
        pdf.multi_cell(160, 5, "Present this digital ticket at entry or scan the confirmation code upon check-in. Valid for authorized student portal members.")

        return bytes(pdf.output())

    @staticmethod
    def generate_resume_pdf(
        candidate_name: str,
        summary: str,
        bullet_points: List[str],
        matched_keywords: List[str]
    ) -> bytes:
        logger.debug(f"[PDFGenerator DEBUG] Generating ATS Resume PDF for candidate='{candidate_name}'")

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # Header Name
        pdf.set_font("Helvetica", "B", 22)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 10, candidate_name.upper(), align='L')
        pdf.ln(10)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(0, 6, "ATS-Optimized Engineering Resume | Student Alumni Platform", align='L')
        pdf.ln(8)
        pdf.line(10, 30, 200, 30)

        # Professional Summary Section
        pdf.set_y(36)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(124, 58, 237) # Violet Accent
        pdf.cell(0, 8, "PROFESSIONAL SUMMARY")
        pdf.ln(8)

        pdf.set_font("Helvetica", "", 10.5)
        pdf.set_text_color(51, 65, 85)
        pdf.multi_cell(0, 6, summary)
        pdf.ln(4)

        # Core Technical Competencies
        if matched_keywords:
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(124, 58, 237)
            pdf.cell(0, 8, "TECHNICAL SKILLS & KEYWORDS")
            pdf.ln(8)

            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(30, 41, 59)
            pdf.multi_cell(0, 6, " - " + " - ".join(matched_keywords))
            pdf.ln(4)

        # Bullet Points Section
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(124, 58, 237)
        pdf.cell(0, 8, "KEY HIGHLIGHTS & EXPERIENCE")
        pdf.ln(8)

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(30, 41, 59)
        for bullet in bullet_points:
            pdf.cell(6, 6, "-")
            pdf.multi_cell(0, 6, bullet)
            pdf.ln(1)

        return bytes(pdf.output())
