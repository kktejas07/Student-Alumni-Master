from enum import Enum
from typing import List, Dict, Any
from datetime import datetime, timezone

class MilestoneType(str, Enum):
    RESUME = "RESUME"
    PROJECT = "PROJECT"
    PROFILE = "PROFILE"
    NETWORKING = "NETWORKING"
    SKILLS = "SKILLS"
    MOCK_INTERVIEW = "MOCK_INTERVIEW"
    PORTFOLIO = "PORTFOLIO"
    CERTIFICATION = "CERTIFICATION"
    JOB_APPLICATION = "JOB_APPLICATION"
    LINKEDIN = "LINKEDIN"

async def evaluate_roadmap_milestones(user: Dict[str, Any], milestones: List[Dict[str, Any]], db) -> List[Dict[str, Any]]:
    """
    Evaluates each milestone against the user's data and platform activity to automatically mark it complete.
    """
    user_id_str = str(user.get("_id", ""))
    
    for m in milestones:
        if m.get("completed"):
            continue

        m_type = m.get("milestone_type")
        is_done = False
        
        if m_type == MilestoneType.RESUME.value:
            is_done = bool(user.get("resume_url") or user.get("resume_data"))
            
        elif m_type == MilestoneType.PROJECT.value:
            is_done = len(user.get("projects") or []) > 0
            
        elif m_type == MilestoneType.PROFILE.value:
            is_done = len(user.get("bio") or "") > 10
            
        elif m_type == MilestoneType.NETWORKING.value:
            if db is not None and user_id_str:
                count = await db.connections.count_documents({"$or": [{"from_user": user_id_str}, {"to_user": user_id_str}]})
                is_done = count > 0
                
        elif m_type == MilestoneType.SKILLS.value:
            is_done = len(user.get("skills") or []) >= 3
            
        elif m_type == MilestoneType.MOCK_INTERVIEW.value:
            if db is not None and user_id_str:
                count = await db.bookings.count_documents({"student_id": user_id_str})
                is_done = count > 0
                
        elif m_type == MilestoneType.PORTFOLIO.value:
            is_done = bool(user.get("portfolio_url")) or (len(user.get("projects") or []) > 0)
            
        elif m_type == MilestoneType.CERTIFICATION.value:
            is_done = len(user.get("certifications") or []) > 0
            
        elif m_type == MilestoneType.JOB_APPLICATION.value:
            if db is not None and user_id_str:
                count = await db.saved_jobs.count_documents({"user_id": user_id_str, "status": "applied"})
                is_done = count > 0
                
        elif m_type == MilestoneType.LINKEDIN.value:
            is_done = bool(user.get("linkedin_url"))
            
        if is_done:
            m["completed"] = True
            m["completed_at"] = datetime.now(timezone.utc).isoformat()
            
    return milestones
