from typing import Dict, Any, List

def calculate_match_score(opp: Dict[str, Any], user: Dict[str, Any]) -> int:
    """
    Calculates a 0-100 match score for a job or internship opportunity against a user profile.
    
    Weights (approximate):
    - Skill Match (60%): User skills vs Opp tags/skills
    - Career Goal (20%): User career goal vs Opp title
    - Branch (10%): User branch vs Opp domain/tags/description
    - Interests (10%): User interests vs Opp tags/description
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
    user_skills = [s.lower() for s in (user.get("skills") or [])]
    if user_skills:
        skill_matches = sum(1 for s in user_skills if s in opp_text_blob)
        # Cap at 60 points, max out if they match 3+ skills
        skill_score = min(60, (skill_matches / max(1, min(3, len(user_skills)))) * 60)
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

    # Baseline adjustment for users with empty profiles so they don't get 0 scores
    if score == 0 and not user_skills and not goal_to_match and not branch and not user_interests:
        return 50

    return min(100, int(score))
