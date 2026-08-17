"""
backend/routers/pdf_routes.py

FastAPI Router for PDF Document Generation & Downloads.
Provides endpoints for downloading Event Pass Tickets and ATS Resumes as PDF files.
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Response, Depends
from pydantic import BaseModel

from services.pdf_generator import PDFGeneratorService
from core.rate_limiter import rate_limit_ai_requests

router = APIRouter(prefix="/api/pdf", tags=["pdf-downloads"])


class ResumePDFReq(BaseModel):
    candidate_name: Optional[str] = "Student Candidate"
    summary: str
    bullet_points: List[str]
    matched_keywords: Optional[List[str]] = []


@router.get("/event-pass/{confirmation_id}")
async def download_event_pass_pdf(
    confirmation_id: str,
    title: Optional[str] = "Global Event",
    category: Optional[str] = "Hackathon",
    date_str: Optional[str] = "Upcoming",
    mode: Optional[str] = "Online",
    city: Optional[str] = "Global",
    attendee_name: Optional[str] = "Portal Member"
):
    try:
        pdf_bytes = PDFGeneratorService.generate_event_pass(
            title=title,
            category=category,
            date_str=date_str,
            mode=mode,
            city=city,
            confirmation_id=confirmation_id,
            attendee_name=attendee_name
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=Event_Ticket_{confirmation_id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to generate event pass PDF: {str(e)}")


@router.post("/resume")
async def download_resume_pdf(req: ResumePDFReq):
    try:
        pdf_bytes = PDFGeneratorService.generate_resume_pdf(
            candidate_name=req.candidate_name or "Student Candidate",
            summary=req.summary,
            bullet_points=req.bullet_points,
            matched_keywords=req.matched_keywords or []
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=ATS_Optimized_Resume.pdf"}
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to generate resume PDF: {str(e)}")
