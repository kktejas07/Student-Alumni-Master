from typing import Dict, Any, List, Optional

def calculate_match_score(opp: Dict[str, Any], user: Dict[str, Any]) -> Optional[int]:
    """
    Calculates a 0-100 match score for a job or internship opportunity against a
    user profile, or None when the user has no confirmed skills yet.

    Weights (approximate):
    - Skill Match (up to 60): canonical skill-id overlap (Jaccard) when the job
      carries skill_ids (written nightly by the jobs aggregator); falls back
      to text matching on user.skills until the job is enriched.
    - Career Goal (20%): User career goal vs Opp title
    - Branch (10%): User branch vs Opp domain/tags/description
    - Interests (10%): User interests vs Opp tags/description

    A score of None means "profile has no confirmed skills" — the UI should
    show a prompt to confirm skills rather than a number.
    """
    if not opp or not user:
        return 0

    score = 0.0

    # Normalise opportunity signals
    # Handle both jobs_feed format (tags, title) and users.py internships format (skills, match_signals, domain)
    opp_skills = [s.lower() for s in (opp.get("tags") or opp.get("skills") or [])]
    opp_signals = [s.lower() for s in (opp.get("match_signals") or [])]

    opp_title = (opp.get("title") or "").lower()
    opp_desc = (opp.get("description") or "").lower()
    opp_domain = (opp.get("domain") or "").lower()

    # Combine all signals into a searchable text block for easy fallback matching
    opp_text_blob = f"{' '.join(opp_skills)} {' '.join(opp_signals)} {opp_title} {opp_desc} {opp_domain}"

    # 1. Skill Match (up to 60 points)
    user_profile = user.get("skill_profile") or []
    user_skill_ids = {str(p.get("id")).lower() for p in user_profile if p.get("id")}
    if not user_skill_ids:
        # No confirmed skills -> no meaningful score; UI shows a confirm-skills prompt.
        return None

    opp_skill_ids = {str(i).lower() for i in (opp.get("skill_ids") or [])}
    if opp_skill_ids:
        # Jaccard-weighted overlap over canonical ids, capped at 60 points.
        inter = len(user_skill_ids & opp_skill_ids)
        union = len(user_skill_ids | opp_skill_ids)
        jaccard = (inter / union) if union else 0.0
        skill_score = min(60.0, 60.0 * jaccard)
    else:
        # Job not yet enriched by the nightly skill-id job: legacy text match.
        user_skills = [s.lower() for s in (user.get("skills") or [])]
        if user_skills:
            skill_matches = sum(1 for s in user_skills if s in opp_text_blob)
            skill_score = min(60.0, (skill_matches / max(1, min(3, len(user_skills)))) * 60)
        else:
            skill_score = 0.0
    score += skill_score

    # 2. Career Goal (up to 20 points)
    student_info = user.get("student_info") or {}
    career_goal = (student_info.get("career_goal") or "").lower()
    career_path = (user.get("career_path") or "").lower()

    goal_to_match = career_goal if career_goal else career_path
    if goal_to_match:
        # Check if the goal keywords appear in the job title (strong signal) or description (weaker signal)
        goal_keywords = [w for w in goal_to_match.split() if len(w) > 3]
        if any(w in opp_title for w in goal_keywords):
            score += 20
        elif any(w in opp_text_blob for w in goal_keywords):
            score += 10
        elif career_path in opp.get("career_paths", []):
            score += 15

    # 3. Branch / Domain (up to 10 points)
    school_info = user.get("school_info") or {}
    branch = (school_info.get("branch_or_stream") or "").lower()
    if branch:
        branch_keywords = [w for w in branch.replace("&", " ").replace(",", " ").split() if len(w) > 2]
        if opp_domain and any(w in opp_domain for w in branch_keywords):
            score += 10
        elif any(w in opp_text_blob for w in branch_keywords):
            score += 5
        elif "cse" in branch or "computer" in branch:
            if "software" in opp_text_blob or "engineer" in opp_title or "developer" in opp_title:
                score += 10

    # 4. Interests (up to 10 points)
    user_interests = [i.lower() for i in (user.get("interests") or [])]
    if user_interests:
        interest_matches = sum(1 for i in user_interests if i in opp_text_blob)
        interest_score = min(10, (interest_matches / max(1, len(user_interests))) * 10)
        score += interest_score

    return min(100, int(score))
