"""
talent_resume_parser.py — TP17: Real NLP Resume Parser (replaces the fake
`/admin/talent-pool/ai/parse-resume` canned response).

Extraction stack (all heavy deps via talent_common.import_optional, so this
module imports cleanly on a machine missing them):
  - PDF: PyMuPDF (import name `fitz`); DOCX: `python-docx`; .txt passthrough.
  - NLP: spaCy en_core_web_sm (PERSON/ORG/GPE/DATE entities) + skillner
    (skill spanner). Date spans normalized with dateparser when available.
  - Heuristic fallback (no spacy/skillner installed): pure regex for email,
    phone, linkedin/github URLs, degree lines, section headers, and a
    curated tech-skill dictionary — extracts ONLY what is literally in the
    text; unknown fields are None, never fabricated.

Output is structured JSON (see parse_resume_text) with per-field confidence,
an overall confidence, and a deterministic template-built ai_summary.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from services.agents.talent_common import import_optional, now_utc, agent_run_log
from services.agents.talent_skill_taxonomy import canonicalize_skills, ensure_taxonomy

logger = logging.getLogger("talent_resume_parser")

# ── Optional pipeline handles (loaded once, lazily) ─────────────────
_NLP: Dict[str, Any] = {}

# Curated skill dictionary used by the heuristic path AND as a safety net
# for the NLP path (skillner misses abbreviations; the taxonomy catches them
# via canonicalize_skills — but only exact/alias spellings, so we seed the
# dict with both canonical and common alias forms).
_SKILL_DICT: List[str] = [
    "Python", "Java", "C++", "Go", "Rust", "C#", "TypeScript", "JavaScript",
    "Ruby", "PHP", "Kotlin", "Swift", "Scala", "R", "Dart",
    "React", "Next.js", "Vue.js", "Angular", "Svelte", "Node.js", "Express.js",
    "FastAPI", "Django", "Flask", "Spring Boot", "Laravel", "Ruby on Rails",
    "GraphQL", "gRPC", "REST API", "React Native", "Expo",
    "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Elasticsearch",
    "Cassandra", "DynamoDB", "Firebase",
    "AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Terraform",
    "Ansible", "Jenkins", "GitHub Actions", "Linux", "Nginx", "Helm",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "scikit-learn", "Pandas", "NumPy", "LLM", "RAG", "OpenCV",
    "Spark", "Kafka", "Airflow", "Tableau", "Power BI",
    "Unit Testing", "pytest", "Git", "CI/CD", "Figma", "UI/UX Design",
    "SQL", "HTML", "CSS", "Tailwind", "Flutter", "Android", "iOS",
]
_SKILL_LOOKUP = {s.lower(): s for s in _SKILL_DICT}

# ── Regexes (real-data-only extraction) ─────────────────────────────
_RE_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]{2,}")
# Phone: optional +cc, optional (area), then 8–15 digits with any run of
# spaces/hyphens/dots between them. Raw years like "2021 2022" never match
# (digit count + year-range checks in _find_phone).
_PHONE_RUN = re.compile(
    r"(?<![\d.])(?:\+\d{1,3}[\s\-]?)?(?:\(\d{2,4}\)[\s\-]?)?(?:(?:\d[\s\-.]?){7,14}\d)")
def _find_phone(text: str) -> Optional[str]:
    """First plausible phone number in `text`; None when the only digit runs
    look like year ranges (the classic false positive in resumes)."""
    for m in _PHONE_RUN.finditer(text):
        cand = m.group(0)
        digits = re.sub(r"\D", "", cand)
        if not (7 <= len(digits) <= 15):
            continue
        # reject "YYYY YYYY" / "YYYY-YYYY" — both halves plausible years
        if re.fullmatch(r"\d{4}[\s\-]\d{4}", cand.strip()):
            y1, y2 = int(cand[0:4]), int(cand[-4:])
            if 1980 <= y1 <= 2030 and 1980 <= y2 <= 2030:
                continue
        return re.sub(r"\s+", " ", cand).strip()
    return None


_RE_LINKEDIN = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/(?:in|pub)/[\w\-/%]+", re.I)
_RE_GITHUB = re.compile(r"(?:https?://)?(?:www\.)?github\.com/[\w\-/.]+", re.I)
_RE_CGPA = re.compile(
    r"\b(?:(?:CGPA|GPA|percentage|percent|score|marks)\s*[:=]?\s*"
    r"(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/\s*(\d{1,2}(?:\.\d{1,2})?))?|(\d{1,2}(?:\.\d{1,2})?)/10)\b",
    re.I,
)
_RE_DEGREE = re.compile(
    r"(B\.?\s?Tech(?:nology)?|B\.?\s?E\.?|B\.?Sc|BSc|M\.?\s?Tech(?:nology)?|M\.?\s?E\.?|"
    r"M\.?Sc|MS|MBA|Ph\.?D|Postgraduate|Diploma)\s*(?:in|of)?\s*([A-Za-z&][A-Za-z &/]{1,40}?)?"
    r"(?=\b(at|from|,|\(|\d{4}|$)|\s+(?:at|from)\b)",
    re.I,
)
_RE_SECTION = re.compile(
    r"^\s*(EXPERIENCE|WORK HISTORY|EMPLOYMENT|PROFESSIONAL EXPERIENCE|PROJECTS?|"
    r"EDUCATION|ACADEMICS|ACADEMIC PROFILE|CERTIFICATIONS?|SKILLS|TECHNICAL SKILLS|"
    r"TECHNICAL PROFICIENCY|ACHIEVEMENTS?|HONORS?|AWARDS?|SUMMARY|PROFILE|ABOUT)\s*$",
    re.I,
)
_RE_YEAR = re.compile(r"\b(19[89]\d|20[0-4]\d)\b")
_RANGE_RE = re.compile(
    r"^\s*(?P<start>\w{3,9}\.?\s{0,2}\d{4}|\d{4})\s*(?:-|–|—|to|until|till)\s*"
    r"(?P<end>\w{3,9}\.?\s{0,2}\d{4}|\d{4}|present|current|ongoing|now)\b",
    re.I)
_RANGE_ANY_RE = re.compile(
    r"\b(\w{3,9}\.?\s{0,2}\d{4}|\d{4})\s*(?:-|–|—|to|until|till)\s*"
    r"(\w{3,9}\.?\s{0,2}\d{4}|\d{4}|present|current|ongoing|now)\b",
    re.I)
_ROLE_HINT_RE = re.compile(
    r"\b(Software\s+(?:Engineer|Developer|Architect|Engineers)?|Full[\s-]?Stack|"
    r"Backend|Back[\s-]?[Ee]nd|Front[\s-]?[Ee]nd|Frontend|DevOps|S\.?D\.?E\.?|"
    r"Intern(?:ship)?|Engineer|Analyst|Developer|Designer|Architect|Researcher|"
    r"Programmer|Consultant|Manager|Lead)\b")

# Prose lines ("Worked on Django services.") are NOT company/role tokens. A
# line that starts a sentence verb or carries "on/for/in the" is prose.
_PROSE_RE = re.compile(
    r"^(?:built|worked|led|designed|developed|implemented|created|launched|"
    r"shipped|managed|owned|delivered|collaborated|achieved|reduced|"
    r"increased|improved|automated|mentored|wrote|authored)\b", re.I)
_PREP_RE = re.compile(r"\b(?:on|for|in|the|with|across|at)\b", re.I)
# Strong institution markers — used to tell "Computer Science" (field) apart
# from "IIT Delhi" (institution) on comma-separated education lines.
_INSTITUTION_RE = re.compile(
    r"\b(?:IIIT|IIT|IIM|NIT|BITS|VIT|DTU|MIT|Oxford|Cambridge|University|"
    r"College|Institute|Institution|Academy|School of)\b", re.I)


def _looks_like_company(tok: str) -> bool:
    """A token is company-shaped when it's a short proper-noun phrase with no
    leading verb, no year, and no preposition. ('Acme Corp', 'IIT Delhi')."""
    if len(tok) > 40 or _RE_YEAR.search(tok):
        return False
    words = tok.split()
    if not (1 <= len(words) <= 6):
        return False
    upper = sum(1 for w in words if w[:1].isupper())
    if upper / len(words) < 0.5:
        return False
    if _PROSE_RE.match(tok) or _PREP_RE.search(tok):
        return False
    return True


def _role_company_split(line: str):
    """Split 'Software Engineer | Acme Corp | Jan 2022 - Present'
    → (role, company, range-or-None).

    Classifies each pipe/`@`-separated token: date-range tokens, company
    tokens (2-6 words, capitalized), and role tokens (contain a known role
    word, or are the first remaining text token). Returns
    (None, None, None) when the line is not an experience header.
    """
    core = line.strip()
    # 1) pull out any date range anywhere on the line
    m = _RANGE_ANY_RE.search(core)
    rng: Optional[str] = None
    if m:
        rng = m.group(0)
        core = core[:m.start()] + " " + core[m.end():]
    if not core.strip():
        return None, None, rng
    # 2) split the remaining text into tokens (pipe / @ / comma / " - ")
    tokens = [t.strip() for t in re.split(r"[\|@,]|\s[-—–]\s", core) if t.strip()]
    role: Optional[str] = None
    company: Optional[str] = None
    for tok in tokens:
        if len(tok) < 2:
            continue
        hm = _ROLE_HINT_RE.search(tok)
        if hm and role is None:
            role = tok.strip()
            continue
        if company is None and _looks_like_company(tok):
            company = tok
            continue
        if role is None and _looks_like_company(tok):
            role = tok
    return role, company, rng

_SECTIONS_N = ("EXPERIENCE", "WORK HISTORY", "EMPLOYMENT", "PROFESSIONAL EXPERIENCE",
               "PROJECTS", "EDUCATION", "ACADEMICS", "ACADEMIC PROFILE",
               "CERTIFICATIONS", "CERTIFICATE", "SKILLS", "TECHNICAL SKILLS",
               "ACHIEVEMENTS", "HONORS", "AWARDS")


def _split_sections(text: str) -> Dict[str, str]:
    """Split text into named sections by header line; pre-header text is 'header'."""
    lines = text.splitlines()
    sections: Dict[str, str] = {"header": ""}
    current = "header"
    for line in lines:
        m = _RE_SECTION.match(line.strip())
        if m:
            current = m.group(1).upper().replace(" ", " ")
            # collapse synonyms
            if current in ("WORK HISTORY", "EMPLOYMENT", "PROFESSIONAL EXPERIENCE"):
                current = "EXPERIENCE"
            if current in ("PROJECTS",):
                current = "PROJECT"
            if current in ("ACADEMICS", "ACADEMIC PROFILE"):
                current = "EDUCATION"
            if current in ("CERTIFICATE",):
                current = "CERTIFICATIONS"
            if current in ("HONORS", "AWARDS"):
                current = "ACHIEVEMENTS"
            if current in ("SKILLS", "TECHNICAL SKILLS", "TECHNICAL PROFICIENCY"):
                current = "SKILLS"
            sections.setdefault(current, "")
            continue
        sections[current] = sections.get(current, "") + line + "\n"
    return sections


# ── Date helpers ────────────────────────────────────────────────────
_MONTHS = {m.lower(): i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def _parse_date_token(s: Optional[str], default_year: int) -> Optional[datetime]:
    """Best-effort parse of 'Jan 2020', '2020', 'Present', ISO strings, etc.

    Returns tz-aware UTC datetime, or None when nothing usable is present.
    Uses dateparser when installed, else the built-in regex fallback.
    """
    if not s:
        return None
    s = s.strip()
    low = s.lower()
    if low in ("present", "current", "now", "ongoing", "currently"):
        return now_utc()
    dp = import_optional("dateparser")
    if dp is not None:
        try:
            d = dp.parse(s, settings={"PREFER_DATES_FROM": "future", "DEFAULT_DATE": (default_year, 7, 1)})
            if d:
                return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    # Fallback: month-year or bare year
    m = re.match(r"^(?:([A-Za-z]{3,9})\.?\s*(\d{4}))$", s)
    if m:
        mon = _MONTHS.get(m.group(1)[:3].lower())
        if mon:
            return datetime(int(m.group(2)), mon, 1, tzinfo=timezone.utc)
    m = re.match(r"^(\d{4})$", s)
    if m:
        return datetime(int(m.group(1)), 1, 1, tzinfo=timezone.utc)
    m = _RE_YEAR.search(s)
    if m:
        return datetime(int(m.group(1)), 1, 1, tzinfo=timezone.utc)
    return None


def _years_between(start: Optional[datetime], end: Optional[datetime]) -> Optional[float]:
    if not start:
        return None
    if not end:
        end = now_utc()
    days = (end - start).days
    return round(max(days, 0) / 365.25, 2)


# ── Heuristic (regex-only) extraction ──────────────────────────────
def _heuristic_extract(text: str, sections: Dict[str, str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {"name": None, "email": None, "phone": None,
                           "linkedin_url": None, "github_url": None,
                           "skills_raw": [], "education": [], "cgpa": None,
                           "experience": [], "certifications": [],
                           "projects": [], "summary_text": None}
    warnings: List[str] = []

    email = _RE_EMAIL.search(text)
    if email:
        out["email"] = email.group(0)
    out["phone"] = _find_phone(text)
    if not out["phone"]:
        warnings.append("no phone pattern detected")
    li = _RE_LINKEDIN.search(text)
    out["linkedin_url"] = li.group(0) if li else None
    gh = _RE_GITHUB.search(text)
    out["github_url"] = gh.group(0) if gh else None

    # Name: first short, mostly-alphabetic header line that is not a contact
    # line (email/phone/URL) and not a section title.
    for line in sections.get("header", "").splitlines():
        cand = line.strip()
        if not cand or len(cand) > 60:
            continue
        low = cand.lower()
        if low.startswith(("linkedin", "github", "http", "phone", "email", "tel")):
            continue
        if _RE_EMAIL.search(cand) or _RE_LINKEDIN.search(cand) or _RE_GITHUB.search(cand):
            continue
        if cand in _SECTIONS_N or low in _SECTIONS_N or low.startswith(
                ("experience", "education", "academic", "project", "skill", "certificat")):
            continue
        letters = sum(ch.isalpha() for ch in cand)
        compact = cand.replace(" ", "")
        if 1 <= len(cand.split()) <= 5 and letters >= 4 and letters >= 0.7 * len(compact):
            out["name"] = cand
            break
    if not out["name"]:
        warnings.append("could not identify candidate name")

    # Skills: dict scan with word-ish boundaries over the whole document
    found_skills = []
    for s in _SKILL_DICT:
        pat = re.compile(r"(?<![A-Za-z0-9])" + re.escape(s) + r"(?![A-Za-z0-9])", re.I)
        if pat.search(text):
            found_skills.append(s)
    out["skills_raw"] = found_skills
    if not found_skills:
        warnings.append("no known skills detected")

    # CGPA
    m = _RE_CGPA.search(text)
    if m:
        val = m.group(1) or m.group(3)
        if val:
            try:
                f = float(val)
                out["cgpa"] = f
            except ValueError:
                pass

    # Education
    ed_text = (sections.get("EDUCATION", "") or "").strip() or None
    for dm in _RE_DEGREE.finditer(ed_text or text):
        degree = (dm.group(1) or "").strip()
        field = (dm.group(2) or "").strip()
        if not degree:
            continue
        base = ed_text if ed_text is not None else text
        # scope to the line the degree sits on, then the tokens after it
        line_start = base.rfind("\n", 0, dm.start()) + 1
        line_end = base.find("\n", dm.start())
        line = base[line_start:line_end if line_end > 0 else len(base)]
        ctx = line
        ym = _RE_YEAR.search(ctx)

        # "X at/from Institution" form
        inst_m = re.search(r"\b(?:at|from)\s+([A-Z][\w&\.\- ]{2,40})", ctx)
        institution = inst_m.group(1).strip() if inst_m else None

        # comma form: "Degree, Field, Institution, Year" — prefer an
        # institution-marker token, else the last non-year token only when it
        # is plausibly an institution (≥2 non-year tokens after the degree).
        if institution is None:
            tail = ctx[dm.end():].split("\n")[0]
            toks = [t.strip() for t in re.split(r"\s*,\s*", tail) if t.strip()]
            for t in toks:
                if _RE_YEAR.search(t):
                    continue
                if _INSTITUTION_RE.search(t):
                    institution = t
                    break
            if institution is None:
                nonyear = [t for t in toks if not _RE_YEAR.fullmatch(t)]
                if len(nonyear) >= 2:
                    institution = nonyear[-1]
            # if the degree regex captured no field group, backfill it from
            # the first comma token that isn't the year and isn't the institution
            if not field:
                field = next((t for t in toks
                              if t and not _RE_YEAR.fullmatch(t) and t != institution), None)

        out["education"].append({
            "degree": f"{degree} {field}".strip(),
            "institution": institution,
            "year": int(ym.group(1)) if ym else None,
        })
    if not out["education"]:
        warnings.append("no education entries detected")

    # Experience: state machine over the EXPERIENCE section.
    # Typical layout: a role/company line, an optional date-range line
    # (which may be on its own line), then bullet summary lines.
    exp_lines = [l.strip() for l in (sections.get("EXPERIENCE", "") or "").splitlines()]
    cur: Dict[str, Any] = {"title": None, "company": None, "start": None, "end": None, "summary_lines": []}

    def _flush_exp() -> None:
        start = _parse_date_token(cur["start"], 2020) if isinstance(cur["start"], str) else None
        end = _parse_date_token(cur["end"], 2025) if isinstance(cur["end"], str) else None
        years = _years_between(start, end)
        if cur["title"] or cur["company"]:
            out["experience"].append({
                "title": cur["title"],
                "company": cur["company"],
                "start": start.isoformat() if start else None,
                "end": end.isoformat() if end else None,
                "years": years,
                "summary": " ".join(cur["summary_lines"])[:400] or None,
            })

    for line in exp_lines:
        if not line:
            continue
        role, company, rng = _role_company_split(line)
        if role or company:
            # new entry: flush the previous one
            _flush_exp()
            cur = {"title": role, "company": company, "start": None, "end": None, "summary_lines": []}
            if rng:
                m = _RANGE_RE.match(rng)
                if m:
                    cur["start"], cur["end"] = m.group("start"), m.group("end")
            continue
        m = _RANGE_RE.match(line)
        if m:
            # date-range line under the current entry
            if not cur["start"]:
                cur["start"] = m.group("start")
            cur["end"] = m.group("end")
            continue
        # summary line
        if cur["title"] or cur["company"]:
            clean = line.lstrip("-•*· \t")
            if len(clean) >= 12:
                cur["summary_lines"].append(clean)
    _flush_exp()
    if not out["experience"]:
        warnings.append("no structured experience entries detected")

    # Certifications
    cert_text = sections.get("CERTIFICATIONS", "")
    if cert_text:
        out["certifications"] = [l.strip() for l in cert_text.splitlines()
                                 if len(l.strip()) > 6 and l.strip().upper() not in _SECTIONS_N][:10]

    # Projects (real excerpts only)
    proj_text = sections.get("PROJECT", "")
    if proj_text:
        items = []
        for para in re.split(r"\n\s*\n", proj_text):
            para = " ".join(para.split())
            if len(para) >= 20:
                first = para[:80]
                items.append({"title": first, "description": para[:400]})
            if len(items) >= 5:
                break
        out["projects"] = items

    out["summary_text"] = (sections.get("SUMMARY", "").strip() or None)
    out["_warnings"] = warnings
    return out


# ── NLP pipeline extraction ─────────────────────────────────────────
def _nlp_extract(text: str, sections: Dict[str, str]) -> Dict[str, Any]:
    """spaCy + skillner + dateparser pipeline; reuses the heuristic contact
    regexes (they are more reliable for raw strings than NER for URLs)."""
    base = _heuristic_extract(text, sections)
    warnings: List[str] = base.pop("_warnings", [])

    spacy_mod = import_optional("spacy")
    skillner_mod = import_optional("skillner")
    doc = None
    if spacy_mod is not None:
        nlp = _NLP.get("nlp")
        if nlp is None:
            try:
                nlp = spacy_mod.load("en_core_web_sm")
                _NLP["nlp"] = nlp
            except Exception:
                try:
                    nlp = spacy_mod.blank("en", enabled=["ner", "tok2vec"])
                    _NLP["nlp"] = nlp
                    warnings.append("spacy blank model — NER disabled, no en_core_web_sm")
                except Exception:
                    nlp = None
        if nlp is not None:
            doc = nlp(text[:1_000_000])

    if doc is None:
        base["extraction_method"] = "heuristic"
        base["nlp_available"] = False
        base["warnings"] = warnings + ["spacy unavailable — using heuristic NER path"]
        return base

    base["nlp_available"] = True

    # PERSON → name (first, highest confidence)
    persons = [e for e in doc.ents if e.label_ == "PERSON"]
    if persons:
        best = max(persons, key=lambda e: e.text)
        cand = best.text.strip()
        if 2 <= len(cand.split()) <= 5:
            base["name"] = cand

    # URLs come from regex already; GPE → location (unused in schema, drop)
    # DATE entities → help date tokens in experience lines
    date_ents = [e for e in doc.ents if e.label_ == "DATE" and len(e.text) <= 25]

    # skillner skills
    sk = _NLP.get("skillner")
    if sk is None and skillner_mod is not None:
        try:
            sk = skillner_mod.SkillNER.load(skillner_mod.SKILLNER_PRETRAINED_MODEL_NAME)
            _NLP["skillner"] = sk
        except Exception:
            sk = None
            warnings.append("skillner model load failed — skill dict fallback only")
    if sk is not None:
        try:
            skill_spans = sk.get_skills(doc)
            if isinstance(skill_spans, dict):
                skill_spans = skill_spans.get(doc, [])
            for span in skill_spans or []:
                txt = getattr(span, "text", str(span))
                txt = txt.strip()
                if txt and txt not in base["skills_raw"]:
                    base["skills_raw"].append(txt)
        except Exception as e:
            warnings.append(f"skillner run failed: {e}")

    # Date entities refine experience entries
    if date_ents and base["experience"]:
        for ent in date_ents[:12]:
            dt = _parse_date_token(ent.text, 2020)
            if dt:
                # attach to the earliest experience entry lacking a start
                for exp in base["experience"]:
                    if not exp["start"]:
                        exp["start"] = dt.isoformat()
                        break

    base["extraction_method"] = "nlp" if not warnings or "spacy unavailable" not in warnings else "heuristic"
    if base["extraction_method"] == "nlp" and doc is not None and not persons:
        warnings.append("no PERSON entity found — name may be missing")
    base["warnings"] = base.get("warnings", []) + warnings
    return base


# ── Confidence model ────────────────────────────────────────────────
def _confidence(result: Dict[str, Any]) -> Dict[str, Any]:
    """Per-field and overall confidence in [0, 1].

    Heuristics (deterministic, explainable):
      - contact fields: regex match = 0.9 (email/phone/urls are unambiguous)
      - name: NLP entity = 0.9, header heuristic = 0.5, missing = 0.0
      - skills: NLP path = 0.85 base (model may miss/over-claim), dict-only
        = 0.7 (exact-match only); scaled by coverage vs. typical resumes
      - education: entry with degree+year = 0.8, degree-only = 0.5
      - experience: entry with start AND end dates = 0.8, start-only = 0.5
      - cgpa: 0.9 when the value parsed cleanly
      - overall: weighted mean of field confidences that are non-null
    """
    per: Dict[str, float] = {}
    method = result.get("extraction_method", "heuristic")
    if result.get("email"):
        per["email"] = 0.9
    if result.get("phone"):
        per["phone"] = 0.9
    if result.get("linkedin_url"):
        per["linkedin_url"] = 0.9
    if result.get("github_url"):
        per["github_url"] = 0.9
    if result.get("name"):
        per["name"] = 0.9 if method == "nlp" else 0.5
    nskills = len(result.get("skills", []))
    per["skills"] = 0.0 if not nskills else min(
        (0.85 if method == "nlp" else 0.7) + min(nskills, 8) * 0.02, 0.95)
    if result.get("education"):
        e = result["education"][0]
        per["education"] = 0.8 if (e.get("degree") and e.get("year")) else 0.5
    if result.get("experience_years") is not None:
        per["experience_years"] = 0.8
    elif result.get("experience"):
        per["experience_years"] = 0.5
    if result.get("cgpa") is not None:
        per["cgpa"] = 0.9
    filled = {k: v for k, v in per.items() if v > 0}
    overall = round(sum(filled.values()) / len(filled), 2) if filled else 0.0
    return {"overall": overall, "per_field": {k: round(v, 2) for k, v in per.items()}}


# ── Deterministic ai_summary (real data only) ───────────────────────
def _build_summary(result: Dict[str, Any]) -> str:
    """Deterministic, real-data-only plain-English summary. States thinness
    explicitly when fields are missing. No fabricated detail."""
    sentences: List[str] = []
    name = result.get("name")
    yrs = result.get("experience_years")
    skills = result.get("skills", [])

    if name and yrs:
        s = f"{name} brings {yrs:g} years of experience"
        if skills:
            s += f" across {len(skills)} recorded skills"
        sentences.append(s)
    elif name:
        sentences.append(f"Resume for {name}; contact and experience details were sparse")
    elif yrs:
        sentences.append(f"Anonymous candidate with {yrs:g} years of experience")
    else:
        sentences.append("No name or experience duration detected")

    top = skills[:3]
    if top:
        sentences.append(f"Key skills: {', '.join(top)}")

    ed = result.get("education")
    if ed and ed[0].get("degree"):
        s = f"Holds {ed[0]['degree']}"
        if ed[0].get("year"):
            s += f" ({ed[0]['year']})"
        sentences.append(s)

    summary = ". ".join(sentences)
    if len(summary) < 40:
        summary += ". Limited data extracted — recommend manual review"
    return summary


# ── Seniority (derived, labeled as such) ────────────────────────────
def _seniority(years: Optional[float]) -> Optional[str]:
    if years is None:
        return None
    if years <= 1:
        return "Junior"
    if years <= 4:
        return "Mid"
    if years <= 8:
        return "Senior"
    return "Lead"


# ── Public API ──────────────────────────────────────────────────────
async def parse_resume_text(db, text: str, source_label: str = "raw_text") -> Dict[str, Any]:
    """Parse raw resume text (shared core for file + scraped-text paths).

    Returns the full structured JSON response (router wraps it in its
    payload). Raises ValueError on empty input. Never fabricates fields —
    absent data is None / [].
    """
    t0 = time.time()
    if not text or not text.strip():
        await agent_run_log(db, "TP17", "parse-resume", status="FAILED",
                            error="empty input text",
                            duration_ms=int((time.time() - t0) * 1000))
        return {"success": False, "error": "empty input text", "source": source_label}

    text = text.strip()
    sections = _split_sections(text)
    raw = _nlp_extract(text, sections)

    # ensure the canonical_skills table exists (idempotent, cheap when seeded)
    try:
        await ensure_taxonomy(db)
    except Exception:
        pass

    # canonicalize skills (TP22) — taxonomy may be lazily seeded
    try:
        skills = await canonicalize_skills(db, raw.get("skills_raw", []), source="TP17-resume-parser")
    except Exception:
        skills = raw.get("skills_raw", [])
    raw["skills"] = skills

    # collapse experience years
    exps = raw.get("experience", [])
    total = 0.0
    have_years = False
    for e in exps:
        if e.get("years") is not None:
            total += e["years"]
            have_years = True
    result: Dict[str, Any] = {
        "success": True,
        "source": source_label,
        "name": raw.get("name"),
        "email": raw.get("email"),
        "phone": raw.get("phone"),
        "linkedin_url": raw.get("linkedin_url"),
        "github_url": raw.get("github_url"),
        "skills": skills,
        "education": raw.get("education", []),
        "cgpa": raw.get("cgpa"),
        "experience": exps,
        "experience_years": round(total, 2) if have_years else None,
        "seniority": _seniority(round(total, 2) if have_years else None),
        "seniority_basis": "derived_from_years" if have_years else None,
        "top_projects": raw.get("projects", [])[:5],
        "certifications": raw.get("certifications", []),
        "ai_summary": _build_summary({**raw, "experience_years": round(total, 2) if have_years else None}),
        "extraction_method": raw.get("extraction_method", "heuristic"),
        "confidence": _confidence(raw),
        "warnings": raw.get("warnings", []),
    }
    await agent_run_log(
        db, "TP17", "parse-resume",
        status="SUCCESS",
        detail={
            "source": source_label, "method": result["extraction_method"],
            "skills": len(skills), "exp_entries": len(exps),
            "overall_confidence": result["confidence"]["overall"],
        },
        duration_ms=int((time.time() - t0) * 1000),
    )
    return result


def _extract_file_text(content: bytes, filename: str) -> str:
    low = (filename or "").lower()
    if low.endswith(".docx") or low.startswith("application/vnd") or content[:2] == b"PK":
        docx_mod = import_optional("docx")
        if docx_mod is None:
            raise ValueError("python-docx not installed — cannot parse DOCX")
        import io
        doc = docx_mod.Document(io.BytesIO(content))
        parts = [p.text for p in doc.paragraphs if p.text.strip()]
        for tbl in doc.tables:
            for row in tbl.rows:
                parts.append(" ".join(c.text.strip() for c in row.cells if c.text.strip()))
        return "\n".join(parts)
    if low.endswith(".pdf") or content[:4] == b"%PDF":
        fitz_mod = import_optional("fitz")
        if fitz_mod is None:
            raise ValueError("PyMuPDF (fitz) not installed — cannot parse PDF")
        doc = fitz_mod.open(stream=content)
        try:
            pages = [doc[i].get_text() for i in range(doc.page_count)]
        finally:
            doc.close()
        return "\n".join(pages)
    if low.endswith((".txt", ".md")):
        return content.decode("utf-8", errors="replace")
    # Sniff magic bytes
    if content[:4] == b"%PDF":
        return _extract_file_text(content, "inferred.pdf")
    if content[:2] == b"PK" and low.endswith(".zip"):
        return _extract_file_text(content, "inferred.docx")
    return content.decode("utf-8", errors="replace")


async def parse_resume(db, content: bytes, filename: str) -> Dict[str, Any]:
    """Parse an uploaded resume file (PDF/DOCX/TXT). Call after the router's
    security scan. Returns the same structured JSON as parse_resume_text plus
    filename. Corrupt/empty → {"success": False, "error": str}."""
    t0 = time.time()
    if content is None or not content:
        return {"success": False, "filename": filename, "error": "empty file"}
    try:
        text = _extract_file_text(content, filename)
    except Exception as e:
        await agent_run_log(db, "TP17", "parse-resume", status="FAILED",
                            error=f"extraction: {e}",
                            duration_ms=int((time.time() - t0) * 1000))
        return {"success": False, "filename": filename, "error": f"extraction failed: {e}"}
    if not text.strip():
        await agent_run_log(db, "TP17", "parse-resume", status="FAILED",
                            error="no text extractable",
                            duration_ms=int((time.time() - t0) * 1000))
        return {"success": False, "filename": filename, "error": "no text extractable from file"}

    res = await parse_resume_text(db, text, source_label=f"file:{filename}")
    res["filename"] = filename
    return res


# ── Singleton + status probe ───────────────────────────────────────
class TalentResumeParserAgent:
    """Module-level service object (house agent singleton shape)."""

    async def parse(self, db, content: bytes, filename: str) -> Dict[str, Any]:
        return await parse_resume(db, content, filename)

    async def parse_text(self, db, text: str) -> Dict[str, Any]:
        return await parse_resume_text(db, text, source_label="text")


talent_resume_parser_agent = TalentResumeParserAgent()


async def agent_status(db) -> Dict[str, Any]:
    """Dashboard status probe: which optional NLP packages are live right now."""
    spacy_mod = import_optional("spacy")
    skillner_mod = import_optional("skillner")
    dateparser_mod = import_optional("dateparser")
    fitz_mod = import_optional("fitz")
    docx_mod = import_optional("docx")
    notes = []
    if spacy_mod:
        notes.append("spacy: available")
    else:
        notes.append("spacy: MISSING — heuristic NER path active")
    if skillner_mod:
        notes.append("skillner: available")
    else:
        notes.append("skillner: MISSING — curated skill dict fallback active")
    if dateparser_mod:
        notes.append("dateparser: available")
    else:
        notes.append("dateparser: MISSING — regex date fallback active")
    notes.append(f"PyMuPDF: {'available' if fitz_mod else 'MISSING — PDF extraction disabled'}")
    notes.append(f"python-docx: {'available' if docx_mod else 'MISSING — DOCX extraction disabled'}")

    last = await db.scheduler_logs.find(
        {"agent": "TP17", "action": "parse-resume"}
    ).sort("started_at", -1).limit(1).to_list(1)
    last_run = last[0].get("completed_at") or last[0].get("started_at") if last else None
    if not last:
        status = "idle"
    elif last[0].get("status") != "SUCCESS":
        status = "degraded"
    else:
        status = "ok"
    return {
        "agent_id": "TP17",
        "name": "TP17 Resume Parser",
        "group": "core",
        "priority": "P0",
        "status": status,
        "last_run_at": last_run.isoformat() if last_run else None,
        "est_cost_per_month": "$0 (local OSS)",
        "notes": notes,
    }
