"""
talent_scraper_ai_agent.py — Multi-Agent Talent Sourcing, Scraping & Enrichment Service

Agents:
  1. AI Talent Web Scraper Agent (Extracts public LinkedIn, GitHub, Portfolio & Resume entities)
  2. AI Skill Competency & Experience Extractor (Normalizes technical skills via the
     TP22 taxonomy, calculates experience & seniority ONLY from text actually present)
  3. AI Deduplication & MongoDB Persistence Agent (Prevents duplicates, merges updates
     into db.talent_pool with tz-aware UTC timestamps)

Honest-degradation contract (this rewrite kills the old fabricated fallbacks):
  - LinkedIn URLs attempt the REAL Proxycurl/LinkedIn API via talent_enrichment
    (TP15). Without credentials the result is an explicit URL-only extraction:
    name derived from the handle (flagged `name_derived`), skills [], every
    unknown field None, source "URL_EXTRACTED", trust_score 0.4.
  - GitHub URLs attempt the REAL GitHub API via talent_enrichment (TP16).
    Same honest URL-only fallback when unavailable.
  - Raw resume text: real regex extractions only. No default company,
    location, experience, education or skills are invented.
"""
from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from services.agents.talent_common import agent_run_log, log_activity, now_utc
from services.agents import talent_enrichment
from services.agents.talent_skill_taxonomy import canonicalize_skills, _SEED_TAXONOMY


class ScrapeProfileRequest(BaseModel):
    url_or_text: str
    source_hint: Optional[str] = "auto"  # linkedin, github, portfolio, resume, auto
    recruiter_notes: Optional[str] = None
    save_to_db: Optional[bool] = True


class BatchScrapeRequest(BaseModel):
    urls: List[str]
    recruiter_notes: Optional[str] = None
    save_to_db: Optional[bool] = True


class ExtractedCandidate(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    current_company: Optional[str] = None
    current_role: Optional[str] = None
    experience_years: Optional[float] = None
    seniority: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: Optional[str] = None
    graduation_year: Optional[int] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    dev_strength_score: Optional[int] = None
    dev_strength_basis: Optional[str] = None
    source: str = "URL_EXTRACTED"
    screening_notes: Optional[str] = None
    trust_score: float = 0.4
    name_derived: bool = False
    confidence_notes: List[str] = Field(default_factory=list)


class ScrapeProfileResponse(BaseModel):
    success: bool
    candidate: ExtractedCandidate
    is_duplicate: bool = False
    profile_id: Optional[str] = None
    message: str


class BatchScrapeResponse(BaseModel):
    total_processed: int
    successful_imports: int
    duplicates_updated: int
    failed: int
    candidates: List[ExtractedCandidate]


_EMAIL_RE = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
_PHONE_RE = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}")
_YEARS_RE = re.compile(
    r"\b(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b(?=[^\n]{0,40}\bexperience\b)",
    re.IGNORECASE,
)
_DEGREE_RE = re.compile(
    r"\b(?:M\.?Tech|B\.?Tech|M\.?S(?:c)?|B\.?S(?:c)?|MBA|PhD|Ph\.?D|"
    r"Bachelor(?:'s)?(?:\s+of\s+\w+)?|Master(?:'s)?(?:\s+of\s+\w+)?)\b",
    re.IGNORECASE,
)
_GRADYEAR_RE = re.compile(r"\b(19[89]\d|20[0-3]\d)\b")


def _skill_pattern() -> re.Pattern:
    """Word-boundary alternation over every canonical + alias in the seed
    taxonomy (longest first so 'Spring Boot' wins over 'Spring')."""
    keys: List[str] = []
    for entry in _SEED_TAXONOMY:
        keys.append(entry["canonical"])
        keys.extend(entry.get("aliases", []))
    keys = sorted({str(k) for k in keys if k}, key=len, reverse=True)
    return re.compile(
        r"\b(?:" + "|".join(re.escape(k) for k in keys) + r")\b", re.IGNORECASE
    )


def _seniority_for(years: float) -> str:
    if years < 2:
        return "Junior"
    if years < 5:
        return "Mid"
    if years < 10:
        return "Senior"
    return "Lead"


class TalentScraperAIAgentService:
    """Orchestrates multi-agent scraping, skill parsing, and MongoDB persistence."""

    def _infer_source(self, raw: str) -> str:
        low = raw.lower()
        if "linkedin.com" in low:
            return "linkedin"
        if "github.com" in low:
            return "github"
        if low.startswith("http://") or low.startswith("https://"):
            return "portfolio"
        return "resume_text"

    # ── Agent 1: source-specific extraction (no fabricated data) ─────

    async def _parse_github_url(self, url: str, db=None) -> Dict[str, Any]:
        username_match = re.search(r"github\.com/([a-zA-Z0-9_-]+)", url, re.IGNORECASE)
        username = username_match.group(1) if username_match else "developer"
        candidate_url = f"https://github.com/{username}"

        base: Dict[str, Any] = {
            "github_url": candidate_url,
            "source": "URL_EXTRACTED",
            "trust_score": 0.4,
            "name_derived": True,
            "full_name": username.replace("-", " ").replace("_", " ").title(),
            "confidence_notes": [
                "Real GitHub API unavailable — name derived from the URL handle only; "
                "all other fields are unknown."
            ],
        }

        if db is not None:
            res = await talent_enrichment.enrich_github(
                db, profile_id=None, github_url=candidate_url, username=username
            )
            if res.get("enriched"):
                prof = res.get("profile") or {}
                strength = res.get("strength") or {}
                base.update({
                    "source": "GITHUB_API",
                    "trust_score": 0.85,
                    "name_derived": False,
                    "full_name": prof.get("name") or base["full_name"],
                    "location": prof.get("location"),
                    "bio": prof.get("bio"),
                    "skills": res.get("skills") or [],
                    "dev_strength_score": strength.get("score"),
                    "dev_strength_basis": strength.get("basis"),
                    "confidence_notes": [
                        "GitHub profile fetched live; developer-strength "
                        f"{strength.get('score')}/100 ({strength.get('basis', '')})"
                    ],
                })
        return base

    async def _parse_linkedin_url(self, url: str, db=None) -> Dict[str, Any]:
        handle_match = re.search(r"linkedin\.com/in/([a-zA-Z0-9_-]+)", url, re.IGNORECASE)
        handle = handle_match.group(1) if handle_match else "professional"
        candidate_url = f"https://linkedin.com/in/{handle}"

        base: Dict[str, Any] = {
            "linkedin_url": candidate_url,
            "source": "URL_EXTRACTED",
            "trust_score": 0.4,
            "name_derived": True,
            "full_name": handle.replace("-", " ").replace("_", " ").title(),
            "confidence_notes": [
                "Live LinkedIn API unavailable — name derived from the URL handle only; "
                "all other fields are unknown."
            ],
        }

        if db is not None:
            res = await talent_enrichment.fetch_linkedin(db, candidate_url)
            if res.get("enriched"):
                data = res.get("data") or {}
                skills = await canonicalize_skills(db, data.get("skills") or [], "linkedin")
                base.update({
                    "source": "LINKEDIN_API",
                    "trust_score": 0.85,
                    "name_derived": False,
                    "full_name": data.get("full_name") or base["full_name"],
                    "headline": data.get("headline"),
                    "location": data.get("location"),
                    "current_company": data.get("current_company"),
                    "current_role": data.get("current_role"),
                    "experience_years": data.get("experience_years"),
                    "education": data.get("education"),
                    "photo_url": data.get("photo_url"),
                    "bio": data.get("bio"),
                    "skills": skills,
                    "confidence_notes": [
                        f"LinkedIn profile fetched live via {res.get('via')}."
                    ],
                })
                if data.get("experience_years") is not None:
                    base["seniority"] = _seniority_for(float(data["experience_years"]))
        return base

    async def _parse_raw_text(self, text: str, db=None) -> Dict[str, Any]:
        email_match = _EMAIL_RE.search(text)
        email = email_match.group(0) if email_match else None

        phone_match = _PHONE_RE.search(text)
        phone = phone_match.group(0).strip() if phone_match else None

        # Real skill detection against the seed taxonomy (no fallback list)
        hits = [m.group(0) for m in _skill_pattern().finditer(text)]
        skills = (
            await canonicalize_skills(db, hits, "resume_text")
            if db is not None
            else [h for h in dict.fromkeys(x.lower() for x in hits)]
        )

        # Name: only when the first non-empty line looks like a name —
        # 2-6 words, letters/hyphens only, no digits or @
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        name: Optional[str] = None
        name_derived = False
        if lines:
            first = lines[0][:50]
            word_count = len(first.split())
            is_name_like = (
                2 <= word_count <= 6
                and "@" not in first
                and not any(ch.isdigit() for ch in first)
                and re.fullmatch(r"[A-Za-z][A-Za-z\-'\. ]*", first) is not None
            )
            if is_name_like:
                name = first
                name_derived = True

        # Experience: only from an explicit "N years ... experience" phrase
        years_match = _YEARS_RE.search(text)
        experience_years: Optional[float] = float(years_match.group(1)) if years_match else None
        seniority = _seniority_for(experience_years) if experience_years is not None else None

        # Education: only when a degree keyword actually appears in the text
        degree_match = _DEGREE_RE.search(text)
        education: Optional[str] = degree_match.group(0) if degree_match else None
        grad_match = _GRADYEAR_RE.search(text)
        graduation_year = int(grad_match.group(1)) if grad_match else None

        notes: List[str] = []
        if email:
            notes.append("Email extracted from text.")
        if skills:
            notes.append(f"{len(skills)} skill(s) matched the canonical taxonomy.")
        else:
            notes.append("No recognized skills found — left empty rather than guessed.")
        if experience_years is None:
            notes.append("No explicit experience-years statement found.")

        trust = 0.3
        if name:
            trust += 0.15
        if email:
            trust += 0.1
        if skills:
            trust += min(0.15, 0.05 * len(skills))
        if experience_years is not None:
            trust += 0.1

        return {
            "full_name": name,
            "name_derived": name_derived,
            "headline": None,
            "email": email,
            "phone": phone,
            "location": None,
            "current_company": None,
            "current_role": None,
            "experience_years": experience_years,
            "seniority": seniority,
            "skills": skills,
            "education": education,
            "graduation_year": graduation_year,
            "bio": text[:400] if len(text) > 400 else text,
            "source": "RESUME_TEXT",
            "trust_score": round(trust, 2),
            "confidence_notes": notes,
        }

    # ── Agent 3: dedup + persistence ─────────────────────────────────

    async def scrape_and_enrich_candidate(
        self, req: ScrapeProfileRequest, db=None
    ) -> ScrapeProfileResponse:
        """Agents 1 & 2: extract from the URL/text source, normalize skills,
        then Agent 3: deduplicate and persist into db.talent_pool."""
        raw = req.url_or_text.strip()
        source_type = (
            self._infer_source(raw)
            if req.source_hint in (None, "", "auto")
            else req.source_hint
        )

        if source_type == "github":
            data = await self._parse_github_url(raw, db)
        elif source_type == "linkedin":
            data = await self._parse_linkedin_url(raw, db)
        else:
            data = await self._parse_raw_text(raw, db)

        if req.recruiter_notes:
            data["screening_notes"] = req.recruiter_notes

        candidate = ExtractedCandidate(**data)
        await agent_run_log(
            db, "TP-SCRAPER", f"scrape:{candidate.source}",
            status="SUCCESS",
            detail={"url_or_text": raw[:200], "source": candidate.source,
                    "trust": candidate.trust_score, "db": db is not None},
        )

        # Agent 3: Deduplication & MongoDB Persistence
        is_dup = False
        profile_id: Optional[str] = None

        if db is not None and req.save_to_db:
            try:
                # Deduplicate by email, linkedin_url, or github_url
                or_clauses: List[Dict[str, Any]] = []
                if candidate.email:
                    or_clauses.append({"email": candidate.email.lower()})
                if candidate.linkedin_url:
                    or_clauses.append({"linkedin_url": candidate.linkedin_url})
                if candidate.github_url:
                    or_clauses.append({"github_url": candidate.github_url})

                existing = None
                if or_clauses:
                    existing = await db.talent_pool.find_one({"$or": or_clauses})

                now = now_utc()
                doc = candidate.model_dump(exclude_none=False)
                # House convention: tz-aware UTC datetimes, never ISO strings
                # (the legacy agent's ISO strings broke the 24h-stale query).
                doc["last_synced_at"] = now
                doc["imported_at"] = now
                doc["is_active"] = True
                doc["interest_status"] = "AI_PROFILED"
                doc["trust_score"] = candidate.trust_score

                if existing:
                    is_dup = True
                    profile_id = str(existing.get("id") or existing.get("_id"))
                    # Merges non-None fields only so a URL-only scrape never
                    # blanks out data a live API already filled in.
                    merge = {k: v for k, v in doc.items() if v is not None and v != []}
                    if merge:
                        await db.talent_pool.update_one(
                            {"_id": existing["_id"]}, {"$set": merge}
                        )
                else:
                    doc["id"] = f"tp_{uuid.uuid4().hex[:8]}"
                    res = await db.talent_pool.insert_one(doc)
                    profile_id = str(res.inserted_id)

                await log_activity(
                    db, "agent:TP-SCRAPER", "Ingest", object_id=profile_id,
                    summary=f"Candidate ingested via {candidate.source} "
                            f"(trust {candidate.trust_score:.2f})",
                    data={"source": candidate.source, "trust": candidate.trust_score},
                )
            except Exception as e:
                await agent_run_log(db, "TP-SCRAPER", "persist", status="FAILED",
                                    error=str(e))
                return ScrapeProfileResponse(
                    success=False,
                    candidate=candidate,
                    message=f"Persistence error: {str(e)}"
                )

        return ScrapeProfileResponse(
            success=True,
            candidate=candidate,
            is_duplicate=is_dup,
            profile_id=profile_id,
            message=(
                f"Candidate successfully {'updated' if is_dup else 'scraped & stored in Talent Pool'} "
                f"via {candidate.source}!"
            )
        )

    async def batch_source_candidates(
        self, req: BatchScrapeRequest, db=None
    ) -> BatchScrapeResponse:
        """Concurrently executes scraping & enrichment across a list of URLs."""
        tasks = [
            self.scrape_and_enrich_candidate(
                ScrapeProfileRequest(
                    url_or_text=url,
                    recruiter_notes=req.recruiter_notes,
                    save_to_db=req.save_to_db,
                ),
                db=db,
            )
            for url in req.urls if url.strip()
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful = 0
        duplicates = 0
        failed = 0
        candidates: List[ExtractedCandidate] = []

        for r in results:
            if isinstance(r, ScrapeProfileResponse) and r.success:
                candidates.append(r.candidate)
                if r.is_duplicate:
                    duplicates += 1
                else:
                    successful += 1
            else:
                failed += 1

        return BatchScrapeResponse(
            total_processed=len(req.urls),
            successful_imports=successful,
            duplicates_updated=duplicates,
            failed=failed,
            candidates=candidates,
        )


# Global singleton
talent_scraper_ai_agent = TalentScraperAIAgentService()
