from datetime import datetime, timezone

from core.db import db as _db
from features.agent_k.core.provider import generate_text

async def draft_application(args: dict, user: dict) -> dict:
    role = args.get("role") or "the role"
    company = args.get("company") or "the company"
    skills = ", ".join((user.get("skills") or [])[:5]) or "various technical skills"
    goal = (user.get("student_info") or {}).get("career_goal") or "starting a strong career"
    name = user.get("full_name") or "the applicant"
    text = await generate_text(
        f"Write a concise, professional cover-letter draft (about 120 words) "
        f"for {name} applying to {role} at {company}. Skills to highlight: {skills}. "
        f"Career goal: {goal}. Tone: confident but humble. Do not invent companies "
        f"or projects. Sign off with 'Best regards,' and the name.",
        system="You are an expert career-coach drafting cover letters.",
    )
    sid = str(user.get("_id"))
    saved = await _db.agent_drafts.insert_one({
        "user_id": sid, "kind": "cover_letter", "role": role, "company": company,
        "body": text, "created_at": datetime.now(timezone.utc),
    })
    return {"draft_id": str(saved.inserted_id), "body": text, "word_count": len(text.split())}

async def tailor_cv_for_job(args: dict, user: dict) -> dict:
    role = args.get("role") or "the role"
    company = args.get("company") or "the company"
    skills = ", ".join((user.get("skills") or [])[:8]) or "—"
    text = await generate_text(
        f"Write a 4-bullet CV summary tailored for {role} at {company}. "
        f"Skills to emphasise: {skills}. Use strong action verbs. Each bullet ~14-20 words.",
        system="You are an expert resume writer.",
    )
    return {"summary": text}

async def draft_sop(args: dict, user: dict) -> dict:
    programme = args.get("programme") or "the programme"
    university = args.get("university") or "the university"
    skills = ", ".join((user.get("skills") or [])[:5]) or "—"
    goal = (user.get("student_info") or {}).get("career_goal") or "advancing my career"
    text = await generate_text(
        f"Draft a Statement of Purpose (about 200 words) for applying to {programme} at "
        f"{university}. Background skills: {skills}. Long-term goal: {goal}. "
        f"Style: scholarly, specific, motivated. Avoid clichés.",
        system="You are an admissions essay coach.",
    )
    sid = str(user.get("_id"))
    saved = await _db.agent_drafts.insert_one({
        "user_id": sid, "kind": "sop", "programme": programme, "university": university,
        "body": text, "created_at": datetime.now(timezone.utc),
    })
    return {"draft_id": str(saved.inserted_id), "body": text, "word_count": len(text.split())}

async def draft_message(args: dict, user: dict) -> dict:
    recipient = args.get("recipient_name") or "the recipient"
    purpose = args.get("purpose") or "to introduce myself"
    name = user.get("full_name") or "Student"
    text = await generate_text(
        f"Draft a polite ~80-word LinkedIn-style intro message from {name} "
        f"to {recipient}. Purpose: {purpose}. Tone: warm, confident, low-pressure. "
        f"Do NOT include a subject line. End with 'Looking forward to connecting.'",
        system="You are a professional networking coach.",
    )
    return {"message": text}
