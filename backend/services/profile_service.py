import logging
logger = logging.getLogger(__name__)

def compute_profile_completion(u: dict) -> dict:
    """Return per-item checklist + overall percentage using rebalanced weights.
    
    Single source of truth for profile completion calculation.
    All callers must use this instead of reimplementing.
    """
    if u.get("role") == "college":
        items = [
            {"key": "photo", "label": "College Logo", "done": bool(u.get("college_logo_data") or u.get("photo_data")), "weight": 20},
            {"key": "banner", "label": "College Banner", "done": bool(u.get("banner_data")), "weight": 20},
            {"key": "bio", "label": "Tagline / Bio", "done": bool((u.get("bio") or u.get("headline") or "").strip()), "weight": 20},
            {"key": "location", "label": "City & State", "done": bool((u.get("city") or "").strip()) and bool((u.get("state") or "").strip()), "weight": 20},
            {"key": "socials", "label": "Social Links", "done": bool(u.get("linkedin_url")), "weight": 20},
        ]
    else:
        inst_done = bool((u.get("institution") or (u.get("school_info") or {}).get("institution_name") or "").strip())
        academic_done = bool((u.get("branch") or (u.get("school_info") or {}).get("branch_or_stream") or u.get("stream") or "").strip()) and bool((u.get("class_or_year") or u.get("year_of_study") or u.get("year") or (u.get("school_info") or {}).get("class_or_year") or "").strip()) and bool((u.get("board_or_university") or (u.get("school_info") or {}).get("board_or_university") or "").strip())
        account_done = bool((u.get("email") or u.get("full_name") or "").strip())
        items = [
            {"key": "account", "label": "Account registered", "done": account_done, "weight": 15},
            {"key": "education", "label": "College / Institution", "done": inst_done, "weight": 5},
            {"key": "academic", "label": "Academic Details (Stream, Year, Board)", "done": academic_done, "weight": 10},
            {"key": "skills", "label": "Skills listed", "done": len(u.get("skills") or []) > 0, "weight": 20},
            {"key": "resume", "label": "Resume uploaded", "done": len(u.get("resume_documents") or []) > 0 or bool(u.get("resume_url")) or bool(u.get("resume_data")), "weight": 15},
            {"key": "projects", "label": "Projects added", "done": len(u.get("projects") or []) > 0, "weight": 15},
            {"key": "socials", "label": "LinkedIn/GitHub linked", "done": bool(u.get("linkedin_url")) or bool(u.get("github_url")), "weight": 10},
            {"key": "bio", "label": "Bio / headline", "done": bool((u.get("bio") or u.get("headline") or "").strip()), "weight": 5},
            {"key": "photo", "label": "Profile photo", "done": bool(u.get("face_image_base64") or u.get("photo_data")), "weight": 5},
        ]
    pct = sum(i["weight"] for i in items if i["done"])
    return {"percentage": pct, "items": items}
