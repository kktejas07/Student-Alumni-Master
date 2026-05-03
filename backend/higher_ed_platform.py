"""
higher_ed_platform.py — SA Higher Education aggregator.

Endpoints (all under /api):
  GET  /he/programmes?country=&degree=&max=
  GET  /he/scholarships?country=&degree=
  GET  /he/countries
  POST /he/compare                         body: {programme_ids: [...]}
  POST /he/apply                           body: {programme_id} → creates Application + routes
  GET  /he/applications                    list user's apps
  GET  /he/applications/{id}               full tracker payload
  POST /he/applications/{id}/update        update status/notes/deadlines
  POST /he/ai/sop                          {programme_id, answers?: [...] }
  POST /he/ai/cv                           {answers?: {...}}
  POST /he/ai/cover-letter                 {programme_id, answers?: [...]}
  POST /he/ai/lor-email                    {programme_id, prof_name, relationship, outcome}
  POST /he/ai/eligibility                  {programme_id}
  POST /he/ai/profile-parse                {bio_text}
  POST /he/ai/next-steps                   {application_id}
  GET  /he/documents                       list user's saved SOPs/CVs/letters
"""
from __future__ import annotations
import os, re, json, uuid, hashlib, logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from pathlib import Path
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / ".env")
_mongo = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _mongo[os.environ["DB_NAME"]]
logger = logging.getLogger("higher_ed")
router = APIRouter()

# ─── FX ──────────────────────────────────────────────────────────────────
FX_TO_INR = {"INR": 1.0, "USD": 83.5, "GBP": 105.0, "EUR": 90.0, "CAD": 61.0,
             "AUD": 55.0, "SGD": 62.0}

def to_inr(amount: float, currency: str) -> int:
    return int(round(float(amount) * FX_TO_INR.get(currency, 1.0)))


# ─── 12 Curated Programmes (matches screenshot) ──────────────────────────
def _seed_programmes() -> List[Dict[str, Any]]:
    base = [
        dict(id='iitb-mtech-aiml', degree='M.Tech', country='India', match=96,
             name='M.Tech in AI & Machine Learning', institution='IIT Bombay',
             duration='2 years', fee='₹2.5L/yr', currency='INR', fee_amount=250000,
             living_cost_inr=120000, mode='Full-time', intake='Jul 2026',
             intake_date='2026-07-15', deadline='2026-04-30', decision_days=45,
             apply_url='https://www.iitb.ac.in/en/admissions',
             min_cgpa=8.0, acceptance_rate=6, qs_rank=150, nirf_rank=3,
             post_grad_salary_inr=2500000, gre_required=False, ielts_required=False,
             fields=['ai','ml','cs','data-science'], openalex=850),
        dict(id='stanford-ms-cs', degree='MS', country='USA', match=88,
             name='MS Computer Science', institution='Stanford University',
             duration='2 years', fee='$56,000/yr', currency='USD', fee_amount=56000,
             living_cost_inr=1700000, mode='Full-time', intake='Sep 2026',
             intake_date='2026-09-01', deadline='2025-12-01', decision_days=90,
             apply_url='https://cs.stanford.edu/admissions',
             min_cgpa=8.5, acceptance_rate=5, qs_rank=6, nirf_rank=None,
             post_grad_salary_inr=10800000, gre_required=True, ielts_required=True,
             fields=['cs','ai','ml','systems'], openalex=1000),
        dict(id='iima-mba-tech', degree='MBA', country='India', match=82,
             name='MBA — Technology & Innovation', institution='IIM Ahmedabad',
             duration='2 years', fee='₹23L total', currency='INR', fee_amount=1150000,
             living_cost_inr=180000, mode='Full-time', intake='Jun 2026',
             intake_date='2026-06-15', deadline='2026-01-31', decision_days=60,
             apply_url='https://www.iima.ac.in/programmes',
             min_cgpa=7.5, acceptance_rate=2, qs_rank=None, nirf_rank=1,
             post_grad_salary_inr=3500000, gre_required=False, ielts_required=False,
             fields=['mba','strategy','tech'], openalex=600),
        dict(id='edinburgh-msc-ds', degree='MSc', country='UK', match=91,
             name='MSc Data Science', institution='University of Edinburgh',
             duration='1 year', fee='£28,000', currency='GBP', fee_amount=28000,
             living_cost_inr=1250000, mode='Full-time', intake='Sep 2026',
             intake_date='2026-09-15', deadline='2026-03-15', decision_days=60,
             apply_url='https://www.ed.ac.uk/studying/postgraduate',
             min_cgpa=7.5, acceptance_rate=25, qs_rank=22, nirf_rank=None,
             post_grad_salary_inr=4500000, gre_required=False, ielts_required=True,
             fields=['data-science','cs','ai'], openalex=920),
        dict(id='iisc-phd-cs', degree='PhD', country='India', match=85,
             name='PhD in Computer Science', institution='IISc Bengaluru',
             duration='4-5 years', fee='Fully Funded', currency='INR', fee_amount=0,
             living_cost_inr=80000, mode='Full-time', intake='Aug 2026',
             intake_date='2026-08-01', deadline='2026-02-15', decision_days=75,
             apply_url='https://www.iisc.ac.in/admissions/',
             min_cgpa=8.0, acceptance_rate=8, qs_rank=200, nirf_rank=2,
             post_grad_salary_inr=2000000, gre_required=False, ielts_required=False,
             fields=['cs','research','ai','systems'], openalex=950),
        dict(id='iimc-pgd-ds', degree='PG Diploma', country='India', match=77,
             name='PG Diploma in Data Science', institution='IIM Calcutta',
             duration='11 months', fee='₹3.5L total', currency='INR', fee_amount=350000,
             living_cost_inr=100000, mode='Online', intake='Apr 2026',
             intake_date='2026-04-15', deadline='2026-02-28', decision_days=30,
             apply_url='https://www.iimcal.ac.in/programs',
             min_cgpa=6.5, acceptance_rate=40, qs_rank=None, nirf_rank=4,
             post_grad_salary_inr=1500000, gre_required=False, ielts_required=False,
             fields=['data-science','analytics'], openalex=550),
        # 6 more
        dict(id='cmu-ms-mlt', degree='MS', country='USA', match=89,
             name='MS Machine Learning', institution='Carnegie Mellon University',
             duration='2 years', fee='$58,000/yr', currency='USD', fee_amount=58000,
             living_cost_inr=1700000, mode='Full-time', intake='Aug 2026',
             intake_date='2026-08-25', deadline='2025-12-15', decision_days=80,
             apply_url='https://www.ml.cmu.edu/academics/',
             min_cgpa=8.5, acceptance_rate=7, qs_rank=51, nirf_rank=None,
             post_grad_salary_inr=11000000, gre_required=True, ielts_required=True,
             fields=['ml','ai','cs'], openalex=980),
        dict(id='tum-msc-informatics', degree='MSc', country='Germany', match=86,
             name='MSc Informatics', institution='TU Munich',
             duration='2 years', fee='€300/sem', currency='EUR', fee_amount=600,
             living_cost_inr=900000, mode='Full-time', intake='Oct 2026',
             intake_date='2026-10-01', deadline='2026-05-31', decision_days=70,
             apply_url='https://www.tum.de/en/studies',
             min_cgpa=7.5, acceptance_rate=30, qs_rank=37, nirf_rank=None,
             post_grad_salary_inr=4500000, gre_required=False, ielts_required=True,
             fields=['cs','informatics','ai'], openalex=900),
        dict(id='nus-msc-cs', degree='MSc', country='Singapore', match=84,
             name='MSc Computer Science', institution='National Univ. of Singapore',
             duration='1.5 years', fee='S$40,000', currency='SGD', fee_amount=40000,
             living_cost_inr=900000, mode='Full-time', intake='Aug 2026',
             intake_date='2026-08-05', deadline='2026-03-15', decision_days=60,
             apply_url='https://www.nus.edu.sg/admissions',
             min_cgpa=8.0, acceptance_rate=20, qs_rank=8, nirf_rank=None,
             post_grad_salary_inr=5500000, gre_required=False, ielts_required=True,
             fields=['cs','ai','systems'], openalex=940),
        dict(id='waterloo-meng-soft', degree='MEng', country='Canada', match=80,
             name='MEng Software Engineering', institution='University of Waterloo',
             duration='1.3 years', fee='C$36,000', currency='CAD', fee_amount=36000,
             living_cost_inr=900000, mode='Full-time', intake='Sep 2026',
             intake_date='2026-09-08', deadline='2026-02-01', decision_days=50,
             apply_url='https://uwaterloo.ca/graduate-studies/',
             min_cgpa=7.0, acceptance_rate=35, qs_rank=112, nirf_rank=None,
             post_grad_salary_inr=4200000, gre_required=False, ielts_required=True,
             fields=['software','cs'], openalex=820),
        dict(id='unsw-mit', degree='MIT', country='Australia', match=78,
             name='Master of IT', institution='UNSW Sydney',
             duration='2 years', fee='A$48,000/yr', currency='AUD', fee_amount=48000,
             living_cost_inr=1100000, mode='Full-time', intake='Feb 2026',
             intake_date='2026-02-20', deadline='2025-11-30', decision_days=45,
             apply_url='https://www.unsw.edu.au/study/postgraduate',
             min_cgpa=6.5, acceptance_rate=50, qs_rank=19, nirf_rank=None,
             post_grad_salary_inr=4000000, gre_required=False, ielts_required=True,
             fields=['it','cs','ai'], openalex=850),
        dict(id='oxford-msc-cs', degree='MSc', country='UK', match=92,
             name='MSc Computer Science', institution='University of Oxford',
             duration='1 year', fee='£36,000', currency='GBP', fee_amount=36000,
             living_cost_inr=1500000, mode='Full-time', intake='Oct 2026',
             intake_date='2026-10-05', deadline='2026-01-19', decision_days=80,
             apply_url='https://www.ox.ac.uk/admissions/graduate',
             min_cgpa=8.5, acceptance_rate=15, qs_rank=3, nirf_rank=None,
             post_grad_salary_inr=6500000, gre_required=False, ielts_required=True,
             fields=['cs','ai','theory'], openalex=990),
    ]
    out = []
    for p in base:
        total_cost_inr = (
            (to_inr(p['fee_amount'], p['currency']) * (2 if 'years' in p['duration'] and '2' in p['duration'] else 1))
            + p['living_cost_inr'] * 2
        ) if p['fee_amount'] > 0 else p['living_cost_inr'] * 2
        p['total_cost_inr'] = total_cost_inr
        p['fee_inr'] = to_inr(p['fee_amount'], p['currency']) if p['fee_amount'] > 0 else 0
        p['source'] = 'curated'
        out.append(p)
    return out


def _seed_scholarships() -> List[Dict[str, Any]]:
    return [
        dict(id='inspire-india', name='INSPIRE Scholarship', funder='Govt of India',
             country='India', degree_levels=['UG','PG'], award_inr=80000,
             coverage='Tuition + stipend', deadline='2026-07-31',
             eligibility='Top 1% in Class XII; CGPA ≥ 8.5',
             url='https://www.inspire-dst.gov.in/', fields=['science','tech']),
        dict(id='daad-wise', name='DAAD WISE', funder='DAAD Germany',
             country='Germany', degree_levels=['UG','PG'], award_inr=550000,
             coverage='₹5.5L stipend + travel', deadline='2025-12-15',
             eligibility='B.E./B.Tech with CGPA ≥ 8.0',
             url='https://www.daad.in/', fields=['science','engineering']),
        dict(id='chevening-uk', name='Chevening Scholarship', funder='UK FCDO',
             country='UK', degree_levels=['PG'], award_inr=2500000,
             coverage='Full tuition + living + travel',
             deadline='2025-11-05',
             eligibility='2 yr work exp; bachelor’s upper-second',
             url='https://www.chevening.org/', fields=['any']),
        dict(id='fulbright-nehru', name='Fulbright-Nehru', funder='USIEF',
             country='USA', degree_levels=['PG','PhD'], award_inr=3500000,
             coverage='Tuition + stipend + travel + insurance',
             deadline='2025-07-15',
             eligibility='Bachelor with 55%+; 3+ yr exp',
             url='https://www.usief.org.in/', fields=['any']),
        dict(id='inlaks', name='Inlaks Scholarship', funder='Inlaks Foundation',
             country='Multiple', degree_levels=['PG'], award_inr=8000000,
             coverage='$100k for tuition+living',
             deadline='2026-03-15',
             eligibility='Below 30; from top Indian university',
             url='https://www.inlaksfoundation.org/', fields=['any']),
        dict(id='commonwealth', name='Commonwealth Scholarship', funder='UK Govt',
             country='UK', degree_levels=['PG','PhD'], award_inr=2800000,
             coverage='Tuition + stipend + return airfare',
             deadline='2025-10-20',
             eligibility='Indian citizen; bachelor with 60%+',
             url='https://cscuk.fcdo.gov.uk/', fields=['any']),
        dict(id='qe-commonwealth', name='QE Commonwealth Scholarship',
             funder='Association of Commonwealth Universities',
             country='UK', degree_levels=['PG'], award_inr=2200000,
             coverage='Tuition + travel grant',
             deadline='2026-01-31',
             eligibility='Strong leadership track record',
             url='https://www.acu.ac.uk/', fields=['any']),
        dict(id='erasmus-mundus', name='Erasmus Mundus Joint Masters',
             funder='European Union', country='Multiple', degree_levels=['PG'],
             award_inr=2500000, coverage='Full tuition + stipend',
             deadline='2026-01-15',
             eligibility='Bachelor’s; English proficiency',
             url='https://www.eacea.ec.europa.eu/', fields=['any']),
        dict(id='swiss-govt', name='Swiss Govt Excellence Scholarship',
             funder='Swiss Confederation', country='Switzerland', degree_levels=['PG','PhD'],
             award_inr=2000000, coverage='Stipend + tuition exemption',
             deadline='2025-12-15',
             eligibility='Master’s for PhD; under 35',
             url='https://www.sbfi.admin.ch/', fields=['any']),
        dict(id='kc-mahindra', name='KC Mahindra Scholarship',
             funder='KC Mahindra Education Trust', country='Multiple',
             degree_levels=['PG'], award_inr=800000,
             coverage='Up to ₹8L for studies abroad',
             deadline='2026-03-31',
             eligibility='Indian citizen; admission to top global univ',
             url='https://www.kcmet.org/', fields=['any']),
    ]


def _seed_countries() -> List[Dict[str, Any]]:
    return [
        dict(id='india',     flag='🇮🇳', name='India',       programmes=12, scholarships=4,
             avg_fee_inr=500000,  avg_living_inr=120000),
        dict(id='usa',       flag='🇺🇸', name='USA',         programmes=8,  scholarships=2,
             avg_fee_inr=4500000, avg_living_inr=1700000),
        dict(id='uk',        flag='🇬🇧', name='UK',          programmes=6,  scholarships=4,
             avg_fee_inr=2900000, avg_living_inr=1250000),
        dict(id='canada',    flag='🇨🇦', name='Canada',      programmes=4,  scholarships=1,
             avg_fee_inr=2200000, avg_living_inr=900000),
        dict(id='germany',   flag='🇩🇪', name='Germany',     programmes=5,  scholarships=2,
             avg_fee_inr=50000,   avg_living_inr=900000),
        dict(id='australia', flag='🇦🇺', name='Australia',   programmes=4,  scholarships=1,
             avg_fee_inr=2700000, avg_living_inr=1100000),
        dict(id='singapore', flag='🇸🇬', name='Singapore',   programmes=3,  scholarships=1,
             avg_fee_inr=2500000, avg_living_inr=900000),
        dict(id='netherlands', flag='🇳🇱', name='Netherlands', programmes=3, scholarships=1,
             avg_fee_inr=1800000, avg_living_inr=950000),
    ]


# ─── Tag Engine ──────────────────────────────────────────────────────────
def apply_tags(p: Dict[str, Any], all_progs: List[Dict[str, Any]], profile: Optional[Dict[str, Any]] = None) -> List[str]:
    tags: List[str] = []
    profile = profile or {}
    cgpa = float(profile.get('cgpa') or 8.0)
    budget = int(profile.get('budget_inr') or 5000000)

    if (p.get('qs_rank') and p['qs_rank'] <= 50) or (p.get('openalex') or 0) >= 970:
        tags.append('TOP_RANKED')
    if p.get('fee_amount') == 0 or 'fully funded' in (p.get('fee') or '').lower():
        tags.append('FULLY_FUNDED')
    try:
        if p.get('deadline'):
            days = (datetime.fromisoformat(p['deadline']).replace(tzinfo=timezone.utc)
                    - datetime.now(timezone.utc)).days
            if 0 <= days <= 30:
                tags.append('DEADLINE_SOON')
    except Exception:
        pass
    if p.get('match', 0) >= 90 and cgpa >= float(p.get('min_cgpa', 7.0)) + 1:
        tags.append('SAFE_BET')
    if p.get('match', 0) < 80 and (p.get('acceptance_rate') or 100) < 15:
        tags.append('STRETCH')
    if p.get('country') == 'India' and (p.get('nirf_rank') or 999) <= 10:
        tags.append('INDIA_TOP')
    if p.get('qs_rank') and p['qs_rank'] <= 50:
        tags.append('GLOBAL_TOP_50')
    salary = p.get('post_grad_salary_inr', 0)
    cost = p.get('total_cost_inr', 1)
    if cost > 0 and (salary / cost) >= 3:
        tags.append('HIGH_ROI')
    try:
        if p.get('intake_date'):
            days_to = (datetime.fromisoformat(p['intake_date']).replace(tzinfo=timezone.utc)
                       - datetime.now(timezone.utc)).days
            if 0 < days_to <= 60:
                tags.append('NEW_INTAKE')
    except Exception:
        pass
    return tags


def secondary_score(p: Dict[str, Any], profile: Dict[str, Any]) -> float:
    budget = int(profile.get('budget_inr') or 5000000)
    cost = p.get('total_cost_inr', 1)
    return (
        -0.30 * (cost / 10000000) +
        -0.10 * (p.get('decision_days', 60) / 100) +
        +0.20 * (p.get('post_grad_salary_inr', 0) / 10000000) +
        +0.15 * (1 if cost <= budget else 0.5) +
        +0.10 * (1 if cost <= budget else 0)
    )


# ─── Auth ────────────────────────────────────────────────────────────────
def _auth():
    from server import get_current_user
    return get_current_user


# ─── Endpoints ───────────────────────────────────────────────────────────
@router.get("/he/programmes")
async def he_programmes(country: str = Query("all"), degree: str = Query("all"),
                        max_n: int = Query(12), user: dict = Depends(_auth())):
    progs = _seed_programmes()
    if country != "all":
        progs = [p for p in progs if p['country'].lower() == country.lower()]
    if degree != "all":
        progs = [p for p in progs if p['degree'].lower() == degree.lower()]
    profile = (user.get('he_profile') or {})
    for p in progs:
        p['tags'] = apply_tags(p, progs, profile)
        p['secondary_score'] = secondary_score(p, profile)
    progs.sort(key=lambda x: (-x.get('match', 0), -x.get('secondary_score', 0)))
    return {"programmes": progs[:max_n], "total": len(progs),
            "fetched_at": datetime.now(timezone.utc).isoformat()}


@router.get("/he/scholarships")
async def he_scholarships(country: str = Query("all"), degree: str = Query("all"),
                          user: dict = Depends(_auth())):
    items = _seed_scholarships()
    if country != "all":
        items = [s for s in items if country.lower() in s['country'].lower() or s['country'] == 'Multiple']
    if degree != "all":
        items = [s for s in items if degree.upper() in s['degree_levels']]
    return {"scholarships": items, "total": len(items)}


@router.get("/he/countries")
async def he_countries(user: dict = Depends(_auth())):
    return {"countries": _seed_countries()}


@router.post("/he/compare")
async def he_compare(body: Dict[str, Any], user: dict = Depends(_auth())):
    ids = (body or {}).get("programme_ids") or []
    if not (2 <= len(ids) <= 4):
        raise HTTPException(400, "Provide 2 to 4 programme_ids")
    progs = _seed_programmes()
    selected = [p for p in progs if p['id'] in ids]
    if len(selected) < 2:
        raise HTTPException(404, "Programmes not found")
    profile = user.get('he_profile') or {}
    for p in selected:
        p['tags'] = apply_tags(p, progs, profile)
        p['secondary_score'] = secondary_score(p, profile)

    matches = [p['match'] for p in selected]
    tied = len(set(matches)) < len(matches)
    rows = [
        {"key": "match",            "label": "Match score",       "best": "max"},
        {"key": "country",          "label": "Country",           "best": None},
        {"key": "duration",         "label": "Duration",          "best": None},
        {"key": "fee",              "label": "Tuition (label)",   "best": None},
        {"key": "total_cost_inr",   "label": "Total cost (INR)",  "best": "min"},
        {"key": "decision_days",    "label": "Decision in (days)","best": "min"},
        {"key": "acceptance_rate",  "label": "Acceptance %",      "best": "max"},
        {"key": "qs_rank",          "label": "QS World rank",     "best": "min"},
        {"key": "min_cgpa",         "label": "Min CGPA",          "best": "min"},
        {"key": "gre_required",     "label": "GRE required",      "best": None},
        {"key": "ielts_required",   "label": "IELTS required",    "best": None},
        {"key": "post_grad_salary_inr", "label": "Post-grad salary (INR)", "best": "max"},
    ]
    return {"programmes": selected, "rows": rows, "tied": tied,
            "tie_breaker_note": ("These programmes share the same match. We've ranked by total cost, "
                                 "decision speed, and post-graduation salary." if tied else None)}


# ─── Apply / Tracker ──────────────────────────────────────────────────────
async def _create_application(user: dict, prog: Dict[str, Any]) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    submitted = now
    expected_decision = submitted + timedelta(days=int(prog.get('decision_days', 60)))
    cost = {
        "tuition_per_year_inr": prog.get('fee_inr', 0),
        "tuition_total_inr": prog.get('fee_inr', 0) * (2 if 'year' in prog.get('duration', '') else 1) if prog.get('fee_inr') else 0,
        "living_per_year_inr": prog.get('living_cost_inr', 0),
        "app_fee_inr": 2500,
        "total_y1_inr": prog.get('fee_inr', 0) + prog.get('living_cost_inr', 0) + 2500,
        "total_programme_inr": prog.get('total_cost_inr', 0),
    }
    deadlines = [
        {"id": "submission",   "label": "Final submission",          "due_date": submitted.isoformat(), "status": "done"},
        {"id": "test_scores",  "label": "Test scores upload",         "due_date": (submitted + timedelta(days=14)).isoformat(), "status": "pending"},
        {"id": "lors",         "label": "Letters of Recommendation",  "due_date": (submitted + timedelta(days=21)).isoformat(), "status": "pending", "progress": "0/3"},
        {"id": "interview",    "label": "Interview (TBD)",             "due_date": (submitted + timedelta(days=int(prog.get('decision_days', 60))/2)).isoformat(), "status": "todo"},
    ]
    timeline = [
        {"id": "applied",      "label": "Applied",        "date": submitted.isoformat(),                                         "status": "done"},
        {"id": "review",       "label": "Under Review",    "date": (submitted + timedelta(days=int(prog.get('decision_days',60))*0.3)).isoformat(), "status": "current"},
        {"id": "interview",    "label": "Interview",       "date": (submitted + timedelta(days=int(prog.get('decision_days',60))*0.6)).isoformat(), "status": "pending"},
        {"id": "decision",     "label": "Decision",        "date": expected_decision.isoformat(),                                 "status": "pending"},
        {"id": "enrollment",   "label": "Enrollment",      "date": (expected_decision + timedelta(days=30)).isoformat(),          "status": "pending"},
    ]
    app_doc = {
        "_id": ObjectId(),
        "app_id": "APP-" + uuid.uuid4().hex[:8].upper(),
        "user_id": str(user["_id"]),
        "programme_id": prog['id'],
        "programme_snapshot": prog,
        "status": "submitted",
        "submitted_at": submitted,
        "expected_decision_at": expected_decision,
        "actual_decision_at": None,
        "decision": None,
        "cost_breakdown": cost,
        "deadlines": deadlines,
        "timeline": timeline,
        "documents": {},
        "notes": "",
        "created_at": now, "updated_at": now,
    }
    await _db.he_applications.insert_one(app_doc)
    app_doc["_id"] = str(app_doc["_id"])
    app_doc["submitted_at"] = submitted.isoformat()
    app_doc["expected_decision_at"] = expected_decision.isoformat()
    app_doc["created_at"] = now.isoformat()
    app_doc["updated_at"] = now.isoformat()
    return app_doc


@router.post("/he/apply")
async def he_apply(body: Dict[str, Any], user: dict = Depends(_auth())):
    pid = (body or {}).get("programme_id")
    if not pid:
        raise HTTPException(400, "programme_id required")
    prog = next((p for p in _seed_programmes() if p['id'] == pid), None)
    if not prog:
        raise HTTPException(404, "Programme not found")
    # Check existing
    existing = await _db.he_applications.find_one({"user_id": str(user["_id"]), "programme_id": pid})
    if existing:
        existing['_id'] = str(existing['_id'])
        for k in ('submitted_at', 'expected_decision_at', 'created_at', 'updated_at'):
            v = existing.get(k)
            if isinstance(v, datetime):
                existing[k] = v.isoformat()
        return {"ok": True, "duplicate": True, "application": existing,
                "redirect": f"/applications/{existing['app_id']}",
                "apply_url": prog['apply_url']}
    app = await _create_application(user, prog)
    return {"ok": True, "duplicate": False, "application": app,
            "redirect": f"/applications/{app['app_id']}",
            "apply_url": prog['apply_url']}


def _serialize_app(d: Dict[str, Any]) -> Dict[str, Any]:
    d.pop("_id", None)
    for k in ('submitted_at', 'expected_decision_at', 'actual_decision_at', 'created_at', 'updated_at'):
        v = d.get(k)
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    if d.get('expected_decision_at'):
        try:
            ed = datetime.fromisoformat(d['expected_decision_at'].replace('Z', '+00:00'))
            if ed.tzinfo is None:
                ed = ed.replace(tzinfo=timezone.utc)
            d['days_until_decision'] = max(0, (ed - datetime.now(timezone.utc)).days)
        except Exception:
            d['days_until_decision'] = None
    return d


@router.get("/he/applications")
async def he_applications_list(user: dict = Depends(_auth())):
    items = []
    async for d in _db.he_applications.find({"user_id": str(user["_id"])}).sort("submitted_at", -1):
        items.append(_serialize_app(d))
    return {"applications": items, "total": len(items)}


@router.get("/he/applications/{app_id}")
async def he_application_detail(app_id: str, user: dict = Depends(_auth())):
    d = await _db.he_applications.find_one({"app_id": app_id, "user_id": str(user["_id"])})
    if not d:
        raise HTTPException(404, "Application not found")
    return {"application": _serialize_app(d)}


@router.post("/he/applications/{app_id}/update")
async def he_application_update(app_id: str, body: Dict[str, Any], user: dict = Depends(_auth())):
    fields = {}
    for k in ('status', 'notes', 'deadlines', 'timeline', 'documents', 'decision'):
        if k in (body or {}):
            fields[k] = body[k]
    if not fields:
        raise HTTPException(400, "Nothing to update")
    fields['updated_at'] = datetime.now(timezone.utc)
    res = await _db.he_applications.update_one(
        {"app_id": app_id, "user_id": str(user["_id"])}, {"$set": fields})
    if res.matched_count == 0:
        raise HTTPException(404, "Application not found")
    return {"ok": True, "updated_fields": list(fields.keys())}


# ─── AI Tools (Claude via emergentintegrations) ──────────────────────────
async def _claude(system: str, prompt: str, session: str = "he-ai") -> str:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(500, "EMERGENT_LLM_KEY missing")
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = (LlmChat(api_key=api_key, session_id=f"{session}-{uuid.uuid4().hex[:6]}",
                    system_message=system)
            .with_model("anthropic", "claude-sonnet-4-5-20250929"))
    try:
        return (await chat.send_message(UserMessage(text=prompt))) or ""
    except Exception as e:
        raise HTTPException(502, f"AI call failed: {e}")


async def _save_document(user: dict, kind: str, programme_id: Optional[str],
                          content: str, title: str, meta: Optional[Dict] = None) -> str:
    doc_id = str(ObjectId())
    await _db.he_documents.insert_one({
        "_id": ObjectId(doc_id),
        "doc_id": doc_id,
        "user_id": str(user["_id"]),
        "kind": kind,  # 'sop' | 'cv' | 'cover_letter' | 'lor_email' | 'eligibility' | 'profile'
        "programme_id": programme_id,
        "title": title,
        "content": content,
        "metadata": meta or {},
        "created_at": datetime.now(timezone.utc),
    })
    return doc_id


@router.post("/he/ai/sop")
async def ai_sop(body: Dict[str, Any], user: dict = Depends(_auth())):
    """4-question SOP flow. Body: {programme_id, answers?: {q1,q2,q3,q4}}"""
    pid = (body or {}).get("programme_id")
    answers = (body or {}).get("answers") or {}
    prog = next((p for p in _seed_programmes() if p['id'] == pid), None)
    if not prog:
        raise HTTPException(404, "Programme not found")
    # If no answers yet → return the 4 questions
    if not answers or len(answers) < 4:
        return {
            "stage": "questions",
            "programme": {"id": prog['id'], "name": prog['name'], "institution": prog['institution']},
            "questions": [
                {"id": "q1", "label": "Most impactful project — what was it, your role, and the outcome?"},
                {"id": "q2", "label": f"Why {prog['institution']} specifically — which professors, labs, or courses excite you?"},
                {"id": "q3", "label": "Your 5-year goal — be specific about role/industry/impact."},
                {"id": "q4", "label": "Any red flags to address — gap year, low semester GPA, career switch?"},
            ],
        }
    # Generate
    system = "You are an expert SOP writer for graduate school admissions. Write in compelling, specific, first-person Indian English. No fluff. 600-800 words, 5 paragraphs."
    prompt = f"""Programme: {prog['name']} at {prog['institution']} ({prog['country']})
Applicant: {user.get('full_name', 'Student')}, CGPA {user.get('cgpa', '8.6')}, {user.get('field_of_interest', 'CSE')}.

Q1 (Project): {answers.get('q1','')}
Q2 (Why this programme): {answers.get('q2','')}
Q3 (5-year goal): {answers.get('q3','')}
Q4 (Red flags): {answers.get('q4','')}

Write a 600-800 word SOP in 5 paragraphs:
1) Opening hook tied to the project
2) Academic foundation
3) Projects/research deep-dive
4) Why this programme/why this institution
5) Goals and closing
"""
    content = await _claude(system, prompt, "sop")
    doc_id = await _save_document(user, "sop", pid, content,
                                  f"SOP — {prog['name']} ({prog['institution']})",
                                  {"programme": prog['id'], "answers": answers})
    return {"stage": "draft", "doc_id": doc_id, "content": content,
            "word_count": len(content.split()), "programme_id": pid}


@router.post("/he/ai/cv")
async def ai_cv(body: Dict[str, Any], user: dict = Depends(_auth())):
    answers = (body or {}).get("answers") or {}
    if not answers:
        return {"stage": "questions", "questions": [
            {"id": "education",   "label": "Education (degrees, institutions, CGPA, dates)"},
            {"id": "projects",    "label": "Top 3-4 projects/research (role + outcome)"},
            {"id": "experience",  "label": "Internships / work experience"},
            {"id": "publications","label": "Publications / Conferences (or 'none')"},
            {"id": "skills",      "label": "Skills (technical + languages)"},
            {"id": "awards",      "label": "Awards / Certifications (or 'none')"},
        ]}
    tone = (body or {}).get("tone", "academic")
    system = "You are an expert CV writer for graduate-school applications. Output a 1-page CV in markdown."
    prompt = f"""Build a 1-page CV in {tone} tone for graduate school applications.
Applicant: {user.get('full_name', 'Student')}

Education: {answers.get('education','')}
Projects: {answers.get('projects','')}
Experience: {answers.get('experience','')}
Publications: {answers.get('publications','')}
Skills: {answers.get('skills','')}
Awards: {answers.get('awards','')}

Output markdown with sections: # Name, ## Education, ## Research/Projects, ## Experience, ## Publications, ## Skills, ## Awards.
Keep concise — bullet points, action verbs."""
    content = await _claude(system, prompt, "cv")
    doc_id = await _save_document(user, "cv", None, content,
                                  f"CV ({tone}) — {user.get('full_name','Student')}",
                                  {"tone": tone, "answers": answers})
    return {"stage": "draft", "doc_id": doc_id, "content": content, "tone": tone}


@router.post("/he/ai/cover-letter")
async def ai_cover_letter(body: Dict[str, Any], user: dict = Depends(_auth())):
    pid = (body or {}).get("programme_id")
    answers = (body or {}).get("answers") or {}
    prog = next((p for p in _seed_programmes() if p['id'] == pid), None)
    if not prog:
        raise HTTPException(404, "Programme not found")
    if not answers or len(answers) < 3:
        return {"stage": "questions",
                "programme": {"id": prog['id'], "name": prog['name'], "institution": prog['institution']},
                "questions": [
                    {"id": "hook",      "label": "What grabbed you about this programme?"},
                    {"id": "strength",  "label": "Your single strongest qualification?"},
                    {"id": "advisor",   "label": "Who do you want to work with? (advisor/lab/faculty)"},
                ]}
    system = "Write a 250-350 word cover letter for a graduate admissions committee. Polished, specific, first-person."
    prompt = f"""Cover letter for {prog['name']} at {prog['institution']}.
Applicant: {user.get('full_name', 'Student')}, CGPA {user.get('cgpa', '8.6')}.

Hook: {answers.get('hook','')}
Strength: {answers.get('strength','')}
Advisor target: {answers.get('advisor','')}

Format:
- Salutation
- 1 paragraph: hook + your interest
- 1 paragraph: qualification + project alignment with advisor's work
- 1 paragraph: closing + thank you
- Signature
Keep within 250-350 words.
"""
    content = await _claude(system, prompt, "cover")
    doc_id = await _save_document(user, "cover_letter", pid, content,
                                  f"Cover Letter — {prog['name']}",
                                  {"answers": answers})
    return {"stage": "draft", "doc_id": doc_id, "content": content, "programme_id": pid}


@router.post("/he/ai/lor-email")
async def ai_lor_email(body: Dict[str, Any], user: dict = Depends(_auth())):
    pid = (body or {}).get("programme_id")
    prof = (body or {}).get("prof_name") or "Professor"
    relationship = (body or {}).get("relationship") or ""
    outcome = (body or {}).get("outcome") or ""
    prog = next((p for p in _seed_programmes() if p['id'] == pid), None) if pid else None
    if not relationship or not outcome:
        return {"stage": "questions", "questions": [
            {"id": "prof_name",     "label": "Professor's name"},
            {"id": "relationship",  "label": "How you know them — class/project/lab + when"},
            {"id": "outcome",       "label": "Specific outcome they witnessed (grade, project, paper)"},
        ]}
    target_text = f"{prog['name']} at {prog['institution']}" if prog else "graduate programmes"
    system = "Write a polite, structured LOR-request email to a professor. Indian English. 4 short paragraphs."
    prompt = f"""LOR request email to {prof} for an applicant pursuing {target_text}.
Applicant: {user.get('full_name', 'Student')}.
Relationship + when: {relationship}
Specific outcome: {outcome}
Deadline: {prog.get('deadline','soon') if prog else 'soon'}

Format:
- Subject line
- 4 paragraphs: reminder of relationship → what I'm applying for → what to highlight → deadline + how to submit
- Signature
"""
    content = await _claude(system, prompt, "lor")
    doc_id = await _save_document(user, "lor_email", pid, content,
                                  f"LOR email to {prof}", {"prof_name": prof})
    return {"stage": "draft", "doc_id": doc_id, "content": content, "prof_name": prof}


@router.post("/he/ai/eligibility")
async def ai_eligibility(body: Dict[str, Any], user: dict = Depends(_auth())):
    pid = (body or {}).get("programme_id")
    prog = next((p for p in _seed_programmes() if p['id'] == pid), None)
    if not prog:
        raise HTTPException(404, "Programme not found")
    profile = user.get('he_profile') or {}
    cgpa = profile.get('cgpa') or 8.6
    system = "You are an admissions counsellor. Speak in concrete numbers and specific gaps. 200-300 words."
    prompt = f"""Eligibility check.
Applicant: CGPA {cgpa}, GRE {profile.get('gre','not yet')}, IELTS {profile.get('ielts','not yet')}, GATE {profile.get('gate','not yet')}.
Programme: {prog['name']} at {prog['institution']}.
Min CGPA: {prog['min_cgpa']}, GRE required: {prog['gre_required']}, IELTS required: {prog['ielts_required']},
Acceptance rate: {prog.get('acceptance_rate')}%, QS rank: {prog.get('qs_rank')}.

Answer:
1) Verdict: SAFE / REACH / STRETCH (1 line + reason)
2) Gaps to address (concrete)
3) 3 actions in 30 days to maximise odds
"""
    content = await _claude(system, prompt, "elig")
    return {"content": content, "programme_id": pid}


@router.post("/he/ai/profile-parse")
async def ai_profile_parse(body: Dict[str, Any], user: dict = Depends(_auth())):
    bio = (body or {}).get("bio_text") or ""
    if not bio:
        raise HTTPException(400, "bio_text required")
    system = ("You parse free-text bios into strict JSON. Output ONLY a valid JSON object — "
              "no preamble, no markdown fences.")
    prompt = f"""Parse this bio into JSON with these keys (string/array/number as appropriate):
name, age, location, current_degree, institution, cgpa, field_of_interest (array),
skills (array), projects (array of {{title, role, outcome, tech}}), achievements (array),
career_short_term, career_long_term, preferred_countries (array), budget_inr (number).

Use null for unknown values.
BIO:
{bio}
"""
    content = await _claude(system, prompt, "profile")
    raw = content.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*|```\s*$', '', raw, flags=re.MULTILINE).strip()
    try:
        parsed = json.loads(raw)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', raw)
        parsed = json.loads(m.group(0)) if m else {}
    # Save he_profile on user
    await _db.users.update_one({"_id": user["_id"]}, {"$set": {"he_profile": parsed}})
    doc_id = await _save_document(user, "profile", None, json.dumps(parsed, indent=2),
                                  "Parsed Profile", {"bio_excerpt": bio[:200]})
    return {"profile": parsed, "doc_id": doc_id}


@router.post("/he/ai/next-steps")
async def ai_next_steps(body: Dict[str, Any], user: dict = Depends(_auth())):
    aid = (body or {}).get("application_id")
    app = await _db.he_applications.find_one({"app_id": aid, "user_id": str(user["_id"])})
    if not app:
        raise HTTPException(404, "Application not found")
    prog = app.get('programme_snapshot') or {}
    deadlines = app.get('deadlines') or []
    pending = [d for d in deadlines if d.get('status') in ('pending', 'todo')]
    system = ("Output strict JSON only. No preamble, no markdown. "
              "Schema: {\"steps\": [{\"title\": str, \"why\": str, \"action\": {\"type\": \"upload|draft_email|practice|view\", \"label\": str}}]}")
    prompt = f"""Application: {prog.get('name')} at {prog.get('institution')}.
Status: {app.get('status')}.
Pending deadlines: {json.dumps([{'label': d.get('label'),'due_date': d.get('due_date')} for d in pending])}

Generate 3-5 prioritised, specific next steps for the student.
"""
    content = await _claude(system, prompt, "nextsteps")
    raw = content.strip()
    if raw.startswith("```"):
        raw = re.sub(r'^```(?:json)?\s*|```\s*$', '', raw, flags=re.MULTILINE).strip()
    try:
        parsed = json.loads(raw)
    except Exception:
        m = re.search(r'\{[\s\S]*\}', raw)
        parsed = json.loads(m.group(0)) if m else {"steps": []}
    return parsed


@router.get("/he/documents")
async def he_documents(user: dict = Depends(_auth()),
                       kind: Optional[str] = Query(None)):
    q = {"user_id": str(user["_id"])}
    if kind:
        q["kind"] = kind
    items = []
    async for d in _db.he_documents.find(q).sort("created_at", -1).limit(50):
        d["_id"] = str(d["_id"])
        d.pop("_id", None)
        if isinstance(d.get("created_at"), datetime):
            d["created_at"] = d["created_at"].isoformat()
        items.append(d)
    return {"documents": items, "total": len(items)}
