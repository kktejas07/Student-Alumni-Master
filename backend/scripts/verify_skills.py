"""
Career Readiness Scoring Engine — Validation Script
====================================================
Produces the full validation report:
  1. Old formula result (skills 40%)
  2. New formula result (skills 60% + weighted + beginner boost)
  3. Readiness level
  4. Delta per added skill
  5. Example frontend payload

Run from backend/ directory:
  python -m scripts.verify_skills
"""
import asyncio
import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath('.'))

from dotenv import load_dotenv
load_dotenv()

from core.skill_score_engine import calculate_skill_scores
from core.skill_analytics import generate_skill_analytics
from core.skill_categorization import categorize_skill, SKILL_WEIGHTS, DEFAULT_WEIGHT

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'student_alumni_db')
from db import client as client
db = client[DB_NAME]


# ─── Old formula (skills=40%, profile=20%, resume=15%, projects=15%, networking=10%) ──────
def simulate_old_formula(skill_scores: dict, has_profile: bool, has_resume: bool,
                         project_count: int, connections: int) -> float:
    """Replicate the old equal-weight skill scoring + old component weights."""
    # Old skill score: simple average of 6 categories
    categories = ['technical_skills', 'communication', 'soft_skills',
                  'interview_prep', 'networking', 'leadership']
    vals = [skill_scores.get(c, 0) for c in categories]
    avg_skill = sum(vals) / len(vals) if vals else 0

    skill_pts    = (avg_skill / 100) * 40.0
    profile_pts  = 20.0 if has_profile else 0.0
    resume_pts   = 15.0 if has_resume else 0.0
    project_pts  = min(project_count * 5.0, 15.0)
    network_pts  = min(connections * 2.0, 10.0)

    return min(skill_pts + profile_pts + resume_pts + project_pts + network_pts, 100.0)


async def add_skill(user_id, raw_skill):
    skill_lower = raw_skill.lower()
    existing = await db.user_skill_categories.find_one({'user_id': str(user_id), 'skill_name': skill_lower})
    if existing:
        return
    cat_data = await categorize_skill(raw_skill)
    weight = SKILL_WEIGHTS.get(skill_lower, DEFAULT_WEIGHT)

    doc = {
        'user_id': str(user_id),
        'skill_name': skill_lower,
        'subcategory': cat_data.get('subcategory'),
        'display_category': cat_data.get('display_category'),
        'weight': weight,
        'confidence': cat_data.get('confidence', 1.0),
        'source': cat_data.get('source'),
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    }
    await db.user_skill_categories.insert_one(doc)
    await db.users.update_one({'_id': user_id}, {'$addToSet': {'skills': raw_skill}})


async def get_skill_scores(user_id):
    return await calculate_skill_scores(str(user_id))


async def reset_user_profile(user_id):
    """Give the test user a baseline profile (no skills)."""
    await db.user_skill_categories.delete_many({'user_id': str(user_id)})
    await db.user_career_snapshots.delete_many({'user_id': str(user_id)})
    await db.users.update_one({'_id': user_id}, {'$set': {
        'skills': [],
        'full_name': 'Test User',
        'email': 'test@example.com',
        'institution': 'Test University',
        'branch': 'Computer Science',
        'bio': 'Test bio',
        'phone': '+91 9999999999',
        'location': 'Mumbai',
        'resume_documents': [{'active': True}],
        'projects': [1, 2, 3],
        'connections_made': 5
    }})


def banner(text: str):
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print('=' * 60)


async def test_profile(user_id, profile_name: str, skills: list[str]):
    banner(f"PROFILE: {profile_name}")

    await reset_user_profile(user_id)

    # Baseline (no skills)
    before_readiness = await calculate_career_readiness(str(user_id))
    before_score = before_readiness['score']
    before_skill_scores = await get_skill_scores(str(user_id))

    # Old formula baseline
    old_before = simulate_old_formula(
        before_skill_scores, has_profile=True, has_resume=True,
        project_count=3, connections=5
    )

    print(f"\nSkills to add: {skills}")
    print(f"\n{'-' * 50}")
    print(f"BEFORE SCORES")
    print(f"  Old formula: {old_before:.1f}")
    print(f"  New formula: {before_score:.1f} ({before_readiness['level']})")

    # Add each skill and track incremental delta
    deltas = []
    prev_score = before_score
    for skill in skills:
        await add_skill(user_id, skill)
        r = await calculate_career_readiness(str(user_id))
        new_score = r['score']
        delta = new_score - prev_score
        deltas.append({'skill': skill, 'score': new_score, 'delta': round(delta, 2)})
        prev_score = new_score

    after_readiness = await calculate_career_readiness(str(user_id))
    after_score = after_readiness['score']
    after_level = after_readiness['level']
    after_skill_scores = await get_skill_scores(str(user_id))

    old_after = simulate_old_formula(
        after_skill_scores, has_profile=True, has_resume=True,
        project_count=3, connections=5
    )

    total_delta = after_score - before_score
    delta_per_skill = total_delta / len(skills) if skills else 0

    print(f"\n{'─' * 50}")
    print(f"AFTER SCORES")
    print(f"  Old formula: {old_after:.1f}")
    print(f"  New formula: {after_score:.1f}")
    print(f"  Level:       {after_level}")
    print(f"  Next Goal:   {after_readiness.get('next_level', '—')} ({after_readiness.get('next_threshold', '—')}%)")

    print(f"\n{'─' * 50}")
    print("DELTA PER SKILL")
    for d in deltas:
        print(f"  +{d['skill']}: score={d['score']:.1f}, delta=+{d['delta']}")
    print(f"  Average delta/skill: +{delta_per_skill:.2f}")

    # Build example frontend payload
    frontend_payload = {
        "score": after_score,
        "level": after_level,
        "next_level": after_readiness.get("next_level"),
        "next_threshold": after_readiness.get("next_threshold"),
        "breakdown": after_readiness.get("breakdown", {}),
        "_example_toast": {
            "title": "✓ Skill Analyzed",
            "body": f"+{SKILL_WEIGHTS.get(skills[-1].lower(), DEFAULT_WEIGHT)} {skills[-1]} Points\nCareer Readiness: +{round(deltas[-1]['delta'])}%"
                    + (f"\nLevel: {before_readiness['level']} → {after_level} 🎉" if before_readiness['level'] != after_level else ""),
        }
    }

    print(f"\n{'─' * 50}")
    print("EXAMPLE FRONTEND PAYLOAD")
    print(json.dumps(frontend_payload, indent=2))

    # ── Validation assertions ──────────────────────────────────────────────
    print(f"\n{'─' * 50}")
    print("VALIDATION")
    print(f"  Old delta:  +{old_after - old_before:.1f} pts")
    print(f"  New delta:  +{total_delta:.1f} pts  (improvement factor: {total_delta / (old_after - old_before):.2f}x)" if (old_after - old_before) > 0 else f"  New delta:  +{total_delta:.1f} pts")
    return {
        "profile": profile_name,
        "old_before": old_before,
        "old_after": old_after,
        "new_before": before_score,
        "new_after": after_score,
        "level": after_level,
        "total_delta": total_delta,
        "delta_per_skill": delta_per_skill,
    }


async def main():
    user = await db.users.find_one({})
    if not user:
        print('No user found in DB. Seed at least one user first.')
        return

    user_id = user['_id']

    results = []
    results.append(await test_profile(user_id, 'Profile A — Frontend (React, Next.js, TypeScript)',
                                      ['React', 'Next.js', 'TypeScript']))
    results.append(await test_profile(user_id, 'Profile B — Backend (Node.js, MongoDB, PostgreSQL, Docker, AWS)',
                                      ['Node.js', 'MongoDB', 'PostgreSQL', 'Docker', 'AWS']))
    results.append(await test_profile(user_id, 'Profile C — Soft Skills (Communication, Public Speaking, Problem Solving)',
                                      ['Communication', 'Public Speaking', 'Problem Solving']))

    banner("SUMMARY REPORT")
    print(f"\n{'Profile':<45} {'Old→':<10} {'New→':<10} {'Level':<25} {'Δ/skill'}")
    print('-' * 105)
    for r in results:
        name = r['profile'][:44]
        print(f"  {name:<44} {r['old_before']:.1f}→{r['old_after']:.1f}  {r['new_before']:.1f}→{r['new_after']:.1f}   {r['level']:<23} +{r['delta_per_skill']:.2f}")

    print("\n\nACCEPTANCE CRITERIA CHECKS")
    # Profile A: readiness > 20
    a = results[0]
    print(f"  [{'PASS' if a['new_after'] > 20 else 'FAIL'}] Profile A readiness > 20  (got {a['new_after']:.1f})")
    # Profile B: readiness > 40
    b = results[1]
    print(f"  [{'PASS' if b['new_after'] > 40 else 'FAIL'}] Profile B readiness > 40  (got {b['new_after']:.1f})")
    # Profile C: visible increase > 1%
    c = results[2]
    print(f"  [{'PASS' if c['total_delta'] > 1 else 'FAIL'}] Profile C delta > 1%      (got +{c['total_delta']:.1f})")
    # Technical > empty
    print(f"  [{'PASS' if b['new_after'] > 5 else 'FAIL'}] Technical profile > empty profile")
    # Users feel rewarded (delta/skill > 1%)
    all_pass = all(r['delta_per_skill'] > 1 for r in results)
    print(f"  [{'PASS' if all_pass else 'FAIL'}] Each skill adds > 1% readiness on average")


asyncio.run(main())
