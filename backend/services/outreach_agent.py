"""
backend/services/outreach_agent.py

Alumni Outreach & Networking AI Agent.
Generates personalized, high-converting LinkedIn connect notes, cold emails, and coffee chat requests.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger("outreach_agent")

class AlumniOutreachAgent:
    """Automated AI Agent for alumni networking and outreach generation."""

    @staticmethod
    def generate_outreach(student_profile: Dict[str, Any], alumni_profile: Dict[str, Any], goal: str = "coffee_chat") -> Dict[str, Any]:
        logger.debug(f"[OutreachAgent DEBUG] Generating outreach for student='{student_profile.get('full_name')}' -> alumni='{alumni_profile.get('full_name')}'")

        student_name = student_profile.get("full_name") or "Student"
        institution = (student_profile.get("school_info") or {}).get("institution_name") or "our alma mater"
        alumni_name = alumni_profile.get("full_name") or "Alumni"
        alumni_company = alumni_profile.get("current_company") or alumni_profile.get("company") or "the industry"
        alumni_role = alumni_profile.get("current_role") or alumni_profile.get("role") or "Engineering Professional"

        # 1. Short LinkedIn Connection Note (Max 300 chars)
        linkedin_note = f"Hi {alumni_name}, I'm a student at {institution} aspiring to break into {alumni_role} roles. I admire your journey at {alumni_company} and would love to connect to follow your work!"
        if len(linkedin_note) > 300:
            linkedin_note = linkedin_note[:297] + "..."

        # 2. Detailed Cold Email
        email_subject = f"{institution} Student — 15-min Coffee Chat Request ({alumni_company})"
        email_body = f"""Hi {alumni_name},

I hope this note finds you well!

My name is {student_name}, and I am currently studying at {institution}. I came across your profile and was deeply inspired by your career path to becoming a {alumni_role} at {alumni_company}.

As someone preparing to launch a career in this space, I would be extremely grateful for 10-15 minutes of your guidance. I’d love to hear about your experience at {alumni_company} and any advice you might have for students entering the industry.

Would you be open to a brief virtual coffee chat next week? I am happy to work around your schedule.

Thank you so much for your time and guidance!

Best regards,
{student_name}
{institution}
"""

        # 3. Key conversation starters
        conversation_starters = [
            f"What was the transition like moving from {institution} to {alumni_company}?",
            f"Which key technical skills or projects made the biggest impact in your hiring process?",
            f"What is one piece of advice you wish you knew when you were in your final year of university?",
        ]

        return {
            "alumni_name": alumni_name,
            "company": alumni_company,
            "linkedin_connection_note": linkedin_note,
            "email_subject": email_subject,
            "email_body": email_body,
            "conversation_starters": conversation_starters,
        }
