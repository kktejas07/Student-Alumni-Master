"""
Generate /app/memory/dashboard_test_accounts.md — representative test
accounts for each role × tier combination so the user can log in and
visually validate dashboards.

Picks 5 per role × tier (60 total) with high-value attributes:
  - For students: variety of colleges + varying skill counts
  - For mentors: variety of companies + experience ranges
  - For colleges: from each NIRF tier band

Run: cd /app/backend && python3 generate_test_account_list.py
Output: /app/memory/dashboard_test_accounts.md (markdown table)
"""
from __future__ import annotations

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
_db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]

OUT = Path("/app/memory/dashboard_test_accounts.md")


async def get_per_tier(role: str, sample_size: int = 5):
    out = {"Bronze": [], "Silver": [], "Gold": [], "Platinum": []}
    for tier in out:
        cur = _db.users.find(
            {"role": role, "tier": tier},
        ).sort("tier_score", -1 if tier in ("Gold", "Platinum") else 1).limit(sample_size)
        async for u in cur:
            out[tier].append(u)
    return out


async def main():
    students = await get_per_tier("student", 5)
    mentors = await get_per_tier("mentor", 5)
    # Colleges have tier in colleges_meta, not user docs — pick from there
    colleges = {"Bronze": [], "Silver": [], "Gold": [], "Platinum": []}
    for tier in colleges:
        cur = _db.colleges_meta.find({"tier": tier}).limit(5)
        meta_list = await cur.to_list(5)
        for m in meta_list:
            # find admin user for this college
            admin = await _db.users.find_one({
                "role": "college",
                "school_info.institution_name": m.get("name"),
            }, sort=[("created_at", -1)])
            if admin:
                colleges[tier].append({**admin, "_meta": m})
    # Admins
    admin_users = await _db.users.find({"role": "admin"}).limit(20).to_list(20)
    super_admins = [a for a in admin_users if a.get("is_super_admin")][:5]
    sub_admins = [a for a in admin_users if not a.get("is_super_admin")][:5]

    lines: list[str] = []
    lines.append("# Dashboard Test Accounts — Tier-Validation Reference\n")
    lines.append("**Universal password for ALL listed accounts: `TestPass@123`**\n")
    lines.append("> Use these accounts to validate that dashboards render correctly")
    lines.append("> for each tier (Bronze / Silver / Gold / Platinum) and role.")
    lines.append("> Higher-tier users should see premium opportunities, glowing badges,")
    lines.append("> richer suggestions; lower-tier users see growth-focused prompts.\n")
    lines.append("---\n")

    # ── STUDENTS ─────────────────────────────────────────────
    lines.append("## 🎓 STUDENT Portal — `/student-portal`\n")
    lines.append("| Tier | Email | Name | College | Branch | CGPA | Skills | Score |")
    lines.append("|------|-------|------|---------|--------|------|--------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in students[tier]:
            si = u.get("school_info") or {}
            lines.append(
                f"| **{tier}** | `{u['email']}` | {u.get('full_name','—')} | "
                f"{si.get('institution_name','—')} | "
                f"{(si.get('branch_or_stream','—') or '')[:25]} | "
                f"{si.get('cgpa','—')} | "
                f"{len(u.get('skills') or [])} skills | "
                f"**{u.get('tier_score','—')}/100** |"
            )
    lines.append("")

    # ── MENTORS ──────────────────────────────────────────────
    lines.append("## 👨‍🏫 MENTOR Portal — `/mentor-portal`\n")
    lines.append("| Tier | Email | Name | Title | Company | Yrs Exp | Sessions | Rate ₹/hr | Score |")
    lines.append("|------|-------|------|-------|---------|---------|----------|-----------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in mentors[tier]:
            mi = u.get("mentor_info") or {}
            lines.append(
                f"| **{tier}** | `{u['email']}` | {u.get('full_name','—')} | "
                f"{(mi.get('job_title','—') or '')[:25]} | "
                f"{(mi.get('organization','—') or '')[:20]} | "
                f"{mi.get('years_of_experience','—')} | "
                f"{u.get('sessions_completed','—')} | "
                f"₹{u.get('expected_rate_inr','—')} | "
                f"**{u.get('tier_score','—')}/100** |"
            )
    lines.append("")

    # ── COLLEGES ─────────────────────────────────────────────
    lines.append("## 🏫 COLLEGE Portal — `/college-portal`\n")
    lines.append("| Tier | Email | College | NAAC | NIRF | Type | Placement % | Score |")
    lines.append("|------|-------|---------|------|------|------|-------------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in colleges[tier]:
            m = u.get("_meta") or {}
            lines.append(
                f"| **{tier}** | `{u['email']}` | {m.get('name','—')} | "
                f"{m.get('naac','—')} | "
                f"#{m.get('nirf_rank','—')} | "
                f"{m.get('type','—')} | "
                f"{m.get('placement_pct','—')}% | "
                f"**{m.get('tier_score','—')}/100** |"
            )
    lines.append("")

    # ── ADMINS ───────────────────────────────────────────────
    lines.append("## 🛡️ SUPER ADMIN Portal — `/super-admin-portal`\n")
    lines.append("| Type | Email | Name |")
    lines.append("|------|-------|------|")
    for u in super_admins:
        lines.append(f"| **Super Admin** | `{u['email']}` | {u.get('full_name','—')} |")
    for u in sub_admins:
        lines.append(f"| Sub Admin | `{u['email']}` | {u.get('full_name','—')} |")
    lines.append("")

    # ── EXPECTED VALIDATION ───────────────────────────────────
    lines.append("## ✅ What to Validate on Each Dashboard\n")
    lines.append("### Student Portal")
    lines.append("- **Tier banner** with glowing SVG badge (Bronze 🛡 / Silver 🥇 / Gold ⭐ / Platinum 👑)")
    lines.append("- Tier score `XX/100` next to badge")
    lines.append("- 3 tier-personalized skill chips below banner")
    lines.append("- Internships view: `Silver` pill on each item, recommended pinned to top")
    lines.append("- **\"Generate Brief\"** button → calls Claude Sonnet 4.5, replaces banner copy with personalised 4-sentence brief\n")

    lines.append("### Mentor Portal")
    lines.append("- Tier banner: Bronze=`44`, Silver=`50-58`, Gold=`60-78`, Platinum=`80+`")
    lines.append("- **\"Generate AI Brief\"** button — pulls personalised mentoring suggestions from Claude\n")

    lines.append("### College Portal")
    lines.append("- Tier banner top-right: NAAC label + tier badge")
    lines.append("- Tier reflects NIRF rank (Top 15 Platinum, 16-50 Gold, 51-150 Silver, >150 Bronze)")
    lines.append("- **\"Generate AI Brief\"** button — placement insights via Claude\n")

    lines.append("### Super Admin Portal")
    lines.append("- 26 sub-views all wired to real PyMongo aggregations")
    lines.append("- User counts now ~1473 across roles\n")

    lines.append("---")
    lines.append(f"_Generated: `python3 /app/backend/generate_test_account_list.py`_")

    OUT.write_text("\n".join(lines))
    print(f"✅ Generated {OUT} ({len(lines)} lines)")


if __name__ == "__main__":
    asyncio.run(main())
