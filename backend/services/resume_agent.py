"""
backend/services/resume_agent.py

ATS Resume Optimizer & Builder AI Agent.
Analyzes student candidate profile against job postings, computes ATS compatibility scores,
extracts missing technical keywords, and generates ATS-optimized bullet points.
"""

import re
import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger("resume_agent")

COMMON_TECH_KEYWORDS = {
    "python", "javascript", "typescript", "react", "node", "fastapi", "docker", "aws",
    "gcp", "mongodb", "sql", "git", "rest api", "graphql", "machine learning", "dsa",
    "algorithms", "system design", "ci/cd", "kubernetes", "tailwind", "express"
}

class ATSResumeAgent:
    """Automated AI Agent for ATS resume scoring and keyword optimization."""

    @staticmethod
    def analyze_resume(profile: Dict[str, Any], job_description: str) -> Dict[str, Any]:
        logger.debug(f"[ResumeAgent DEBUG] Analyzing resume for target job snippet len={len(job_description)}")
        
        user_skills = [s.lower().strip() for s in (profile.get("skills") or [])]
        jd_lower = job_description.lower()

        # Extract keywords present in JD
        matched_keywords = []
        missing_keywords = []

        for kw in COMMON_TECH_KEYWORDS:
            if kw in jd_lower:
                if any(kw in us for us in user_skills):
                    matched_keywords.append(kw.capitalize())
                else:
                    missing_keywords.append(kw.capitalize())

        # Compute compatibility score
        total_jd_kw = len(matched_keywords) + len(missing_keywords)
        match_score = int((len(matched_keywords) / max(1, total_jd_kw)) * 100) if total_jd_kw > 0 else 75
        match_score = max(35, min(98, match_score))

        # Generate ATS optimized summary
        name = profile.get("full_name") or "Candidate"
        primary_skills = ", ".join(user_skills[:4]) if user_skills else "Software Engineering"
        summary = f"Results-driven engineering candidate skilled in {primary_skills}. Experienced in developing scalable web applications, optimizing backend workflows, and collaborating in agile engineering teams."

        # Generated actionable bullet points
        action_bullets = [
            f"Engineered full-stack features using {matched_keywords[0] if matched_keywords else 'modern web frameworks'}, boosting system throughput by 25%.",
            f"Designed and integrated RESTful APIs with MongoDB database pipelines, reducing query latency by 40%.",
            f"Implemented automated testing & CI/CD deployment pipelines, ensuring zero-downtime releases.",
        ]

        # Strategic recommendations
        recommendations = []
        if missing_keywords:
            recommendations.append(f"Incorporate missing target keywords: {', '.join(missing_keywords[:4])}.")
        recommendations.append("Quantify achievements using metrics (e.g. '% efficiency gain', 'response latency reduction').")
        recommendations.append("Ensure clear section headings (Experience, Technical Skills, Education) for standard ATS parsers.")

        return {
            "candidate_name": name,
            "ats_compatibility_score": match_score,
            "matched_keywords": matched_keywords,
            "missing_keywords": missing_keywords,
            "optimized_summary": summary,
            "ats_bullet_points": action_bullets,
            "recommendations": recommendations,
        }
