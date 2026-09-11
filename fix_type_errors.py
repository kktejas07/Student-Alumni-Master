import re
from pathlib import Path

# 1. Fix backend/core/roadmap_evaluator.py
p1 = Path("backend/core/roadmap_evaluator.py")
c1 = p1.read_text("utf-8")
c1 = re.sub(r'async def evaluate_roadmap_progress\(user_id: str\) -> dict:', 'async def evaluate_roadmap_progress(user_id: str) -> dict | None:', c1)
c1 = re.sub(r'\{"user_id": str\(user_id\)\}', '{"user_id": user_id}', c1)
c1 = re.sub(r'skill_scores = await calculate_skill_scores\(str\(user_id\)\)', 'skill_scores = await calculate_skill_scores(user_id)', c1)
p1.write_text(c1, "utf-8")

# 2. Fix backend/core/security.py
p2 = Path("backend/core/security.py")
c2 = p2.read_text("utf-8")
c2 = re.sub(r'img\.save\(buf, format="PNG"\)', 'img.save(buf)', c2)
c2 = re.sub(r'"is_manual_entry": bool\(is_manual_entry\)', '"is_manual_entry": is_manual_entry', c2)
c2 = re.sub(r'def serialize_user\(user: dict\) -> dict:', 'def serialize_user(user: dict | None) -> dict | None:', c2)
p2.write_text(c2, "utf-8")

# 3. Fix backend/routers/career_ai.py
p3 = Path("backend/routers/career_ai.py")
c3 = p3.read_text("utf-8")
c3 = re.sub(r'body: Dict\[str, Any\] = None,', 'body: Dict[str, Any] | None = None,', c3)
old_milestones = """    for m in data.get("milestones", []):
        m["completed"] = False
        m["completed_at"] = None
    existing_types = {m.get("milestone_type") for m in data.get("milestones", [])}
    for std_m in _ALL_STANDARD_MILESTONES:
        if std_m["milestone_type"] not in existing_types:
            data.setdefault("milestones", []).append(dict(std_m))"""
new_milestones = """    milestones: list[dict[str, Any]] = data.get("milestones", [])
    if not isinstance(milestones, list):
        milestones = []
    
    for m in milestones:
        if isinstance(m, dict):
            m["completed"] = False
            m["completed_at"] = None
    existing_types = {m.get("milestone_type") for m in milestones if isinstance(m, dict)}
    for std_m in _ALL_STANDARD_MILESTONES:
        if std_m["milestone_type"] not in existing_types:
            milestones.append(dict(std_m))
    data["milestones"] = milestones"""
c3 = c3.replace(old_milestones, new_milestones)
p3.write_text(c3, "utf-8")

# 4. Fix backend/routers/users.py
p4 = Path("backend/routers/users.py")
c4 = p4.read_text("utf-8")
c4 = re.sub(r'lambda b: -tier_rank\.get\(b\.get\("tier"\), 0\)', 'lambda b: -tier_rank.get(b.get("tier") or "", 0)', c4)
p4.write_text(c4, "utf-8")

# 5. Fix backend/portals.py
p5 = Path("backend/portals.py")
c5 = p5.read_text("utf-8")
c5 = c5.replace("from typing import Any, Dict, List, Optional", "from typing import Any, Callable, Dict, List, Optional")
c5 = c5.replace("user_tier = tier_payload.get(\"tier\", \"Bronze\")", "user_tier = str(tier_payload.get(\"tier\", \"Bronze\"))")
c5 = c5.replace("user = None\n    u_email", "db_user = None\n    u_email")
c5 = c5.replace("if not user:\n        user = await _db.users.find_one({\"role\": \"student\"})", "if not db_user:\n        db_user = await _db.users.find_one({\"role\": \"student\"})")
c5 = c5.replace("if user:\n", "if db_user:\n")
c5 = re.sub(r'alumni_query = \{', 'alumni_query: dict[str, Any] = {', c5)
c5 = re.sub(r'student_query = \{', 'student_query: dict[str, Any] = {', c5)
c5 = re.sub(r'mentor_query = \{', 'mentor_query: dict[str, Any] = {', c5)
c5 = c5.replace("STEP_REGISTRY: Dict[str, callable] =", "STEP_REGISTRY: Dict[str, Callable] =")
c5 = c5.replace("datetime.utcnow()", "datetime.now(timezone.utc)")
c5 = c5.replace("int(limit)", "limit")
c5 = c5.replace("int(per_page)", "per_page")

# also replace user = await in student_network to db_user = await
c5 = re.sub(r'user = await _db\.users\.find_one\(\{"email": u_email\}\)', 'db_user = await _db.users.find_one({"email": u_email})', c5)

# there's a second mentor_network function
c5 = re.sub(r'user = None\n    u_email = email', 'db_user = None\n    u_email = email', c5)

p5.write_text(c5, "utf-8")
print("Done")
