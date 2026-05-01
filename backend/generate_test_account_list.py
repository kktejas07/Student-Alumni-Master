"""
Generates /app/memory/dashboard_test_accounts.md — exhaustive reference
combining tier-based AND persona-based test accounts so the user can
log in and validate every dashboard state.

Run: cd /app/backend && python3 generate_test_account_list.py
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


async def per_tier(role: str, n: int = 5):
    out = {"Bronze": [], "Silver": [], "Gold": [], "Platinum": []}
    for tier in out:
        cur = _db.users.find({"role": role, "tier": tier}).sort("tier_score", -1).limit(n)
        async for u in cur:
            out[tier].append(u)
    return out


async def personas(role: str):
    cur = _db.users.find({"role": role, "_persona": {"$exists": True}}).sort("_persona_key", 1)
    return await cur.to_list(100)


async def main():
    students = await per_tier("student", 5)
    mentors = await per_tier("mentor", 5)
    students_p = await personas("student")
    mentors_p = await personas("mentor")
    admins_p = await personas("admin")
    colleges_p = await personas("college")

    # Tier-based colleges
    tier_colleges = {"Bronze": [], "Silver": [], "Gold": [], "Platinum": []}
    for tier in tier_colleges:
        cur = _db.colleges_meta.find({"tier": tier}).limit(5)
        meta_list = await cur.to_list(5)
        for m in meta_list:
            admin = await _db.users.find_one({
                "role": "college",
                "school_info.institution_name": m.get("name"),
                "_persona": {"$exists": False},
            }, sort=[("created_at", -1)])
            if admin:
                tier_colleges[tier].append({**admin, "_meta": m})

    # Original test admins
    admin_users = await _db.users.find({"role": "admin", "_persona": {"$exists": False}}).limit(20).to_list(20)
    super_admins = [a for a in admin_users if a.get("is_super_admin")][:5]

    L: list[str] = []
    L.append("# 🎯 Dashboard Test Accounts — Validation Reference\n")
    L.append("**Universal password for ALL accounts: `TestPass@123`**\n")
    L.append("> Two flavours of test accounts:")
    L.append("> 1. **Tier-based** (`<name>@student.demo`) — validate Bronze/Silver/Gold/Platinum visuals")
    L.append("> 2. **Persona-based** (`<persona><n>@persona.demo`) — validate workflow scenarios\n")
    L.append("---\n")

    # ════════ PERSONA TABLES (workflow validation) ════════
    L.append("# 🎭 PERSONA TEST ACCOUNTS — Workflow Scenarios\n")
    L.append("Each persona has 3 dedicated accounts to test specific dashboard states.\n")

    # — Student personas
    L.append("## 🎓 Student Personas — `/student-portal`\n")
    L.append("| Persona | Email | Name | College | Skills | Bookings | Onboarded |")
    L.append("|---------|-------|------|---------|--------|----------|-----------|")
    bookings_count_cache: dict = {}
    for u in students_p:
        # Count bookings for this student
        bk = bookings_count_cache.get(str(u["_id"]))
        if bk is None:
            bk = await _db.bookings.count_documents({"student_id": str(u["_id"])})
            bookings_count_cache[str(u["_id"])] = bk
        si = u.get("school_info") or {}
        L.append(
            f"| **{u.get('_persona','—')}** | `{u['email']}` | "
            f"{u.get('full_name','—')} | "
            f"{(si.get('institution_name') or '—')[:25]} | "
            f"{len(u.get('skills') or [])} | "
            f"{bk} | "
            f"{'✅' if u.get('onboarding_completed') else '❌'} |"
        )
    L.append("")

    # — Mentor personas
    L.append("## 👨‍🏫 Mentor Personas — `/mentor-portal`\n")
    L.append("| Persona | Email | Name | Title @ Company | Status | Sessions | Rating | Rate |")
    L.append("|---------|-------|------|------------------|--------|----------|--------|------|")
    for u in mentors_p:
        mi = u.get("mentor_info") or {}
        L.append(
            f"| **{u.get('_persona','—')}** | `{u['email']}` | "
            f"{u.get('full_name','—')} | "
            f"{(mi.get('job_title','—') or '')[:18]} @ {(mi.get('organization','—') or '')[:14]} | "
            f"{u.get('mentor_status','—')} | "
            f"{u.get('sessions_completed', 0)} | "
            f"{u.get('rating', 0)} | "
            f"₹{u.get('expected_rate_inr','—')} |"
        )
    L.append("")

    # — Admin personas
    L.append("## 🛡️ Admin Personas — `/super-admin-portal`\n")
    L.append("| Persona | Email | Name | Scope | Super | Permissions |")
    L.append("|---------|-------|------|-------|-------|-------------|")
    for u in admins_p:
        perms = u.get("admin_permissions") or {}
        active_perms = [k.replace("manage_", "").replace("_", " ") for k, v in perms.items() if v]
        L.append(
            f"| **{u.get('_persona','—')}** | `{u['email']}` | "
            f"{u.get('full_name','—')} | "
            f"{u.get('admin_scope','—')} | "
            f"{'✅' if u.get('is_super_admin') else '—'} | "
            f"{', '.join(active_perms[:3])} |"
        )
    L.append("")

    # — College personas
    L.append("## 🏫 College Personas — `/college-portal`\n")
    L.append("| Persona | Email | College | NAAC | NIRF | Placement % | Onboarded |")
    L.append("|---------|-------|---------|------|------|-------------|-----------|")
    for u in colleges_p:
        overlay = u.get("_college_meta_overlay") or {}
        L.append(
            f"| **{u.get('_persona','—')}** | `{u['email']}` | "
            f"{(overlay.get('name') or u.get('school_info',{}).get('institution_name','—'))[:25]} | "
            f"{overlay.get('naac','—')} | "
            f"#{overlay.get('nirf_rank','—')} | "
            f"{overlay.get('placement_pct','—')}% | "
            f"{'✅' if u.get('onboarding_completed') else '❌'} |"
        )
    L.append("")

    L.append("---\n")

    # ════════ TIER TABLES (visual validation) ════════
    L.append("# 🏅 TIER TEST ACCOUNTS — Visual Validation (Bronze→Platinum)\n")

    # Students by tier
    L.append("## 🎓 STUDENT — Tier Visual\n")
    L.append("| Tier | Email | Name | College | CGPA | Skills | Score |")
    L.append("|------|-------|------|---------|------|--------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in students[tier]:
            si = u.get("school_info") or {}
            L.append(
                f"| **{tier}** | `{u['email']}` | {u.get('full_name','—')} | "
                f"{(si.get('institution_name','—') or '')[:22]} | "
                f"{si.get('cgpa','—')} | "
                f"{len(u.get('skills') or [])} | "
                f"**{u.get('tier_score','—')}** |"
            )
    L.append("")

    # Mentors by tier
    L.append("## 👨‍🏫 MENTOR — Tier Visual\n")
    L.append("| Tier | Email | Name | Company | Yrs | Sessions | Rating | Score |")
    L.append("|------|-------|------|---------|-----|----------|--------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in mentors[tier]:
            mi = u.get("mentor_info") or {}
            L.append(
                f"| **{tier}** | `{u['email']}` | {u.get('full_name','—')} | "
                f"{(mi.get('organization','—') or '')[:18]} | "
                f"{mi.get('years_of_experience','—')} | "
                f"{u.get('sessions_completed','—')} | "
                f"{u.get('rating','—')} | "
                f"**{u.get('tier_score','—')}** |"
            )
    L.append("")

    # Colleges by tier
    L.append("## 🏫 COLLEGE — Tier Visual\n")
    L.append("| Tier | Email | College | NAAC | NIRF | Placement % | Score |")
    L.append("|------|-------|---------|------|------|-------------|-------|")
    for tier in ["Platinum", "Gold", "Silver", "Bronze"]:
        for u in tier_colleges[tier]:
            m = u.get("_meta") or {}
            L.append(
                f"| **{tier}** | `{u['email']}` | {(m.get('name','—') or '')[:22]} | "
                f"{m.get('naac','—')} | "
                f"#{m.get('nirf_rank','—')} | "
                f"{m.get('placement_pct','—')}% | "
                f"**{m.get('tier_score','—')}** |"
            )
    L.append("")

    # Super admins
    L.append("## 🛡️ SUPER ADMIN\n")
    L.append("| Type | Email | Name |")
    L.append("|------|-------|------|")
    L.append("| **Super Admin** | `admin@careerpath.app` | Platform Admin (default) |")
    for u in super_admins:
        L.append(f"| Super Admin | `{u['email']}` | {u.get('full_name','—')} |")
    L.append("")

    L.append("---\n")

    # ════════ VALIDATION CHECKLIST ════════
    L.append("# ✅ Validation Checklist by Persona\n")

    L.append("## Student Dashboard")
    L.append("- 🌱 **Beginner** — empty skills, 0 projects, profile completion banner shown")
    L.append("- ⏳ **Incomplete** — should see onboarding prompt / redirect")
    L.append("- 📅 **Booked** — 'My Bookings' shows 3 confirmed sessions, calendar entries visible")
    L.append("- 🎟️ **Enrolled** — 'My Events' shows 3 RSVPs with countdown timers")
    L.append("- 🛠️ **Workshop** — 'Workshops' tab shows registered + completed with certificate URL\n")

    L.append("## Mentor Dashboard")
    L.append("- 🌱 **New** — 0 sessions stat, 'Get your first booking' empty state CTA")
    L.append("- ⏳ **Pending** — 'Awaiting Approval' banner, limited dashboard access")
    L.append("- 📅 **Active** — 2 sessions scheduled today (10am, 2pm), Join button live")
    L.append("- 💰 **High-earner** — 6 months of payouts, total earnings stat populated")
    L.append("- ⭐ **Top-rated** — 4.95★ rating, 'Top Mentor' badge, Platinum tier")
    L.append("- 📝 **Creator** — 'My Courses' tab shows 3 published courses\n")

    L.append("## Admin Dashboard")
    L.append("- 🛡️ **Super** — full sidebar, all 26 sub-views accessible")
    L.append("- 👤 **College-scoped** — only sees their college's students/data")
    L.append("- 📊 **Analytics** — read-only, no edit buttons, charts visible")
    L.append("- 💵 **Finance** — Payouts, Wallet, Subscriptions sub-views only")
    L.append("- 🔒 **Moderator** — Content Approval queue + Violations sub-views\n")

    L.append("## College Dashboard")
    L.append("- 🌱 **Onboarding** — empty state, 'Add your first student' CTA, low Bronze tier")
    L.append("- 📊 **High-placement** — 92% placement, Platinum tier, top recruiters list")
    L.append("- 🏗️ **Building** — 55% placement, Silver tier, mid-stage CTAs")
    L.append("- 🎯 **Active drives** — Upcoming Events shows multiple recruiter drives")
    L.append("- 🤝 **Alumni** — Alumni Network sub-view populated\n")

    L.append("---\n")
    L.append("## 🔁 Regenerate everything")
    L.append("```bash")
    L.append("cd /app/backend")
    L.append("python3 seed_realistic.py --reset            # 1360 tier-based users")
    L.append("python3 seed_personas.py --reset             # 63 persona-based users + supporting data")
    L.append("python3 generate_test_account_list.py        # rebuild this markdown file")
    L.append("python3 export_seed_data.py                  # export to JSON+CSV")
    L.append("```")
    L.append("")
    L.append("_Generated by `/app/backend/generate_test_account_list.py`_")

    OUT.write_text("\n".join(L))
    print(f"✅ Generated {OUT} ({len(L)} lines)")


if __name__ == "__main__":
    asyncio.run(main())
