"""
Seed data for new portal collections:
  - colleges_meta (NAAC, MoU, status)
  - workflows (automation builder)
  - ai_insights (Claude-style prioritized briefings, audience-tagged)
  - wallet_transactions (per-student ledger)
  - sample_payments (additional ledger entries for demo)

Run with: python -m seed_portals
"""
from __future__ import annotations
import os
import asyncio
from datetime import datetime, timedelta
from pathlib import Path

from bson import ObjectId
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')

_mongo = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _mongo[os.environ['DB_NAME']]


COLLEGES_META = [
    {"name": "St. Xavier's College, Mumbai",  "city": "Mumbai",      "naac": "A+",  "mou": "Premium",  "status": "active",  "annual_fee": "₹4.2L/yr"},
    {"name": "IIT Kanpur",                      "city": "Kanpur",      "naac": "A++", "mou": "Premium",  "status": "active",  "annual_fee": "₹6.8L/yr"},
    {"name": "BITS Pilani",                     "city": "Pilani",      "naac": "A++", "mou": "Premium",  "status": "active",  "annual_fee": "₹5.1L/yr"},
    {"name": "NIT Trichy",                      "city": "Trichy",      "naac": "A",   "mou": "Standard", "status": "active",  "annual_fee": "₹2.4L/yr"},
    {"name": "Anna University",                  "city": "Chennai",     "naac": "A",   "mou": "Standard", "status": "active",  "annual_fee": "₹3.9L/yr"},
    {"name": "JNU New Delhi",                    "city": "New Delhi",   "naac": "A+",  "mou": "Premium",  "status": "active",  "annual_fee": "₹4.5L/yr"},
    {"name": "Christ University",                "city": "Bengaluru",   "naac": "A",   "mou": "Premium",  "status": "active",  "annual_fee": "₹4.8L/yr"},
    # Pending approvals
    {"name": "Manipal Institute of Tech",        "city": "Manipal",     "naac": "A",   "mou": "Standard", "status": "pending", "annual_fee": "₹6.8L/yr",  "mou_kind": "Onboarding", "priority": "high"},
    {"name": "Loyola College Chennai",           "city": "Chennai",     "naac": "A",   "mou": "Standard", "status": "pending", "annual_fee": "₹2.4L/yr",  "mou_kind": "Onboarding", "priority": "med"},
    {"name": "Symbiosis Pune",                   "city": "Pune",        "naac": "A+",  "mou": "Premium",  "status": "pending", "annual_fee": "₹5.2L/yr",  "mou_kind": "Onboarding", "priority": "high"},
    {"name": "KIIT Bhubaneswar",                 "city": "Bhubaneswar", "naac": "A+",  "mou": "Premium",  "status": "pending", "annual_fee": "₹4.8L/yr",  "mou_kind": "Renewal",    "priority": "med"},
]


WORKFLOWS = [
    {"name": "Auto-approve mentor (Top-tier company)",  "trigger": "New mentor signup",   "steps": ["Verify email", "LinkedIn check", "Auto-approve if rank<200"], "runs": 182,  "success": 178,  "on": True,  "color": "#22C55E"},
    {"name": "At-risk student counselling alert",       "trigger": "Attendance < 70%",    "steps": ["Daily scan", "Notify counsellor", "Schedule call"],            "runs":  96,  "success":  88, "on": True,  "color": "#EF4444"},
    {"name": "Mentor payout cron (1st of month)",       "trigger": "Cron 1st @ 9am",      "steps": ["Compute payouts", "Stripe transfer", "Email receipt"],         "runs":  42,  "success":  42, "on": True,  "color": "#F97316"},
    {"name": "Welcome series (new students)",           "trigger": "Onboarding done",     "steps": ["Day 0 welcome", "Day 3 mentor pitch", "Day 7 hackathon"],     "runs": 1240, "success": 1218, "on": True,  "color": "#A78BFA"},
    {"name": "Refund auto-trigger (no-show > 3hrs)",    "trigger": "Session no-show",     "steps": ["Detect no-show", "Auto-refund", "Notify both parties"],       "runs":  18,  "success":  18, "on": False, "color": "#3B82F6"},
    {"name": "Alumni donor lapse re-engagement",        "trigger": "90-day inactive",     "steps": ["Find big donors", "Personalize copy", "Send via SendGrid"],   "runs":   6,  "success":   5, "on": True,  "color": "#EC4899"},
]


AI_INSIGHTS_SUPER = [
    {"audience": "super_admin", "kind": "risk",        "icon": "AlertTriangle", "color": "#EF4444", "title": "Mentor supply gap forecast for May",                 "body": "At current 18% MoM growth, 22 colleges will exceed their mentor-to-student SLA by May 31. Recommend onboarding 40+ Platinum mentors in Bengaluru, Hyderabad, Pune."},
    {"audience": "super_admin", "kind": "opportunity", "icon": "TrendingUp",    "color": "#22C55E", "title": "Premium MoU upgrade opportunity — ₹2.1Cr",            "body": "14 Standard MoU colleges show 3x higher session volume than peers. Conversion model predicts 73% upgrade probability. Trigger automated upgrade pitch."},
    {"audience": "super_admin", "kind": "insight",     "icon": "Lightbulb",     "color": "#FBBF24", "title": "Peak booking window: Sundays 6-9pm",                  "body": "42% of weekly mentor bookings happen Sunday evenings. Push notification timed to 5:30pm shows 3.2x higher conversion than current 9am send."},
    {"audience": "super_admin", "kind": "opportunity", "icon": "TrendingUp",    "color": "#A78BFA", "title": "Alumni donor segment leaking — re-engage",            "body": "18 high-net-worth alumni (₹50K+ donations) haven't opened the platform in 90+ days. Personalized milestone email predicted to recover 12 (~₹6L pipeline)."},
    {"audience": "super_admin", "kind": "risk",        "icon": "AlertTriangle", "color": "#F59E0B", "title": "Refund spike on Hackathon vertical",                  "body": "Refunds up 38% MoM. Root cause likely partner organizer reliability — 4 of 7 refunds traced to one vendor. Recommend immediate review."},
    {"audience": "super_admin", "kind": "insight",     "icon": "Zap",           "color": "#22D3EE", "title": "AI-mock-interview adoption uplift drives retention",   "body": "Students who use AI mock-interview within first 14 days show 2.4x higher 30-day retention. Recommend featuring it in onboarding."},
]


AI_INSIGHTS_COLLEGE = [
    {"audience": "college", "kind": "risk",        "icon": "AlertTriangle", "color": "#EF4444", "title": "4 students in CSE Y3 dropped below 60% attendance", "body": "Aryan K., Mihir P., Tara D., Sahil V. Counselling sessions can be triggered automatically. Risk of dropout: medium."},
    {"audience": "college", "kind": "opportunity", "icon": "TrendingUp",    "color": "#22C55E", "title": "Google campus drive can absorb 18 more applicants", "body": "You currently have 32 shortlisted from 85 applied. AI suggests opening Round 2 to ECE Y4 students with CGPA ≥ 7.5 — 12 candidates qualify."},
    {"audience": "college", "kind": "insight",     "icon": "Lightbulb",     "color": "#FBBF24", "title": "Top 3 in-demand skills missing in your batch",      "body": "Cloud (AWS/GCP), System Design, ML Ops. Recommend running a 4-week intensive workshop — ROI on placement uplift estimated at 14%."},
    {"audience": "college", "kind": "opportunity", "icon": "TrendingUp",    "color": "#A78BFA", "title": "Alumni Aanya Mehta open to 5 mentor sessions/mo",   "body": "Atlassian PM, Batch 2019. Confirmed availability. Recommend matching to 3 students prepping for PM internships."},
    {"audience": "college", "kind": "risk",        "icon": "AlertTriangle", "color": "#F59E0B", "title": "Mechanical placement rate trailing other depts",   "body": "88% vs 94% college avg. AI suggests targeted recruiter outreach: Mahindra, Tata Motors, John Deere are actively hiring."},
    {"audience": "college", "kind": "insight",     "icon": "Lightbulb",     "color": "#22D3EE", "title": "Tech Fest RSVP at 240 — expected to hit capacity", "body": "Recommend opening overflow tier (₹100 ticket) or upgrading venue. Last year similar fest ended with 80 wait-list."},
]


WALLET_TRANSACTIONS_DEMO = [
    {"seq": 7012, "tx_id": "TX-7012", "desc": "Mentor session — Dr. Suresh Rao",     "amount": -999,  "kind": "debit",  "source": "session", "days_ago": 0},
    {"seq": 6998, "tx_id": "TX-6998", "desc": "Refer & earn bonus (Sneha joined)",    "amount":  200, "kind": "credit", "source": "refer",   "days_ago": 3},
    {"seq": 6964, "tx_id": "TX-6964", "desc": "Wallet top-up via UPI",                 "amount": 1500, "kind": "credit", "source": "topup",   "days_ago": 6},
    {"seq": 6912, "tx_id": "TX-6912", "desc": "Event ticket: System Design class",    "amount": -499, "kind": "debit",  "source": "event",   "days_ago": 13},
    {"seq": 6877, "tx_id": "TX-6877", "desc": "Refer & earn bonus (Aman joined)",     "amount":  200, "kind": "credit", "source": "refer",   "days_ago": 19},
    {"seq": 6850, "tx_id": "TX-6850", "desc": "Wallet top-up via UPI",                 "amount": 2000, "kind": "credit", "source": "topup",   "days_ago": 28},
]


async def main():
    print("→ Seeding portal collections...")

    # 1) colleges_meta
    await _db.colleges_meta.delete_many({})
    await _db.colleges_meta.insert_many(COLLEGES_META)
    print(f"  colleges_meta: {len(COLLEGES_META)} documents")

    # 2) workflows
    await _db.workflows.delete_many({})
    await _db.workflows.insert_many(WORKFLOWS)
    print(f"  workflows: {len(WORKFLOWS)} documents")

    # 3) ai_insights
    await _db.ai_insights.delete_many({})
    now = datetime.utcnow()
    docs = [{**d, "created_at": now, "dismissed": False} for d in AI_INSIGHTS_SUPER + AI_INSIGHTS_COLLEGE]
    await _db.ai_insights.insert_many(docs)
    print(f"  ai_insights: {len(docs)} documents")

    # 4) wallet_transactions for ALL students (so any logged-in student sees data)
    await _db.wallet_transactions.delete_many({})
    students_cur = _db.users.find({"role": "student"})
    inserted = 0
    async for s in students_cur:
        sid = str(s["_id"])
        for t in WALLET_TRANSACTIONS_DEMO:
            await _db.wallet_transactions.insert_one({
                "tx_id": t["tx_id"],
                "seq":   t["seq"],
                "student_id": sid,
                "desc":   t["desc"],
                "amount": t["amount"],
                "kind":   t["kind"],
                "source": t["source"],
                "date":   now - timedelta(days=t["days_ago"]),
            })
            inserted += 1
    print(f"  wallet_transactions: {inserted} documents (across all students)")

    print("✓ Seeding complete.")


if __name__ == "__main__":
    asyncio.run(main())
