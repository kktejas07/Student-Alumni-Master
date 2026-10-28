"""
services.skills.resume_parser — structured profile data from resumes.

Accepts base64 data URLs (the shape used by users.resume_documents),
PDF bytes, or plain text. Section splitting is heading-driven; skills come
from taxonomy.extract; when an LLM key is configured one optional
structured call refines the result (validated against the taxonomy so the
LLM can never invent skill ids).

Storage contract:
- Raw resume text is NOT retained past the caller's need: `text` in the
  result is truncated to MAX_TEXT_BYTES (20 KB).
- `sha256` of the full document lets callers skip re-parsing unchanged
  uploads.
"""
from __future__ import annotations

import base64
import binascii
import hashlib
import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from services.skills import taxonomy

logger = logging.getLogger("skills.resume_parser")

MAX_TEXT_BYTES = 20_000  # never store more than 20 KB of resume text

_HEADING_MAP: Dict[str, str] = {
    "experience": "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "employment": "experience",
    "employment history": "experience",
    "education": "education",
    "academic": "education",
    "academic background": "education",
    "projects": "projects",
    "key projects": "projects",
    "skill": "skills",
    "skills": "skills",
    "technical skills": "skills",
    "core competencies": "skills",
    "competencies": "skills",
    "certification": "certifications",
    "certifications": "certifications",
    "licenses & certifications": "certifications",
}

_LLM_SCHEMA = {
    "type": "object",
    "properties": {
        "skills": {"type": "array", "items": {"type": "string"}},
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "stack": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "roles": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "company": {"type": "string"},
                    "start": {"type": "string"},
                    "end": {"type": "string"},
                },
            },
        },
        "education": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "degree": {"type": "string"},
                    "institution": {"type": "string"},
                    "year": {"type": "string"},
                },
            },
        },
    },
    "required": ["skills"],
}


# ─── extraction ────────────────────────────────────────────────────────────
def document_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def extract_text(data_url_or_bytes: Any) -> Tuple[bytes, str, str]:
    """Return (raw_bytes, text, format). format is 'pdf' | 'docx' | 'text'.

    Raises ValueError when no text layer could be obtained (e.g. an
    image-only PDF) — the caller turns that into the graceful
    "no text found" response.
    """
    if isinstance(data_url_or_bytes, str):
        raw = _decode_data_url(data_url_or_bytes)
    else:
        raw = bytes(data_url_or_bytes)

    if raw[:5] == b"%PDF-":
        text = _pdf_text(raw)
        if not text:
            raise ValueError("no text layer found in PDF (scanned/image-only?)")
        return raw, text, "pdf"

    if raw[:4] == b"PK\x03\x04":
        text = _docx_text(raw)
        if not text:
            raise ValueError("no text found in DOCX")
        return raw, text, "docx"

    # plain text / unknown binary -> try utf-8
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("unrecognized document format")
    if not text.strip():
        raise ValueError("no text found in document")
    return raw, text, "text"


def _decode_data_url(data_url: str) -> bytes:
    if not data_url.startswith("data:"):
        # tolerate callers passing bare base64
        try:
            return base64.b64decode(data_url, validate=True)
        except binascii.Error:
            raise ValueError("resume is not a valid data URL")
    _, comma, rest = data_url.partition(",")
    if not comma:
        raise ValueError("malformed data URL")
    return base64.b64decode(rest)


def _pdf_text(raw: bytes) -> str:
    import io
    import pdfplumber

    parts: List[str] = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages[:6]:  # resumes beyond 6 pages are out of scope
            t = page.extract_text()
            if t:
                parts.append(t)
    return "\n".join(parts)


def _docx_text(raw: bytes) -> str:
    import io
    from docx import Document

    doc = Document(io.BytesIO(raw))
    lines = [p.text for p in doc.paragraphs if p.text and p.text.strip()]
    for table in doc.tables:
        for row in table.rows:
            cells = [c.text.strip() for c in row.cells if c.text and c.text.strip()]
            if cells:
                lines.append(" | ".join(cells))
    return "\n".join(lines)


# ─── section splitting ─────────────────────────────────────────────────────
def split_sections(text: str) -> Dict[str, str]:
    """Split resume text into named sections by its headings."""
    sections: Dict[str, str] = {}
    current = "preamble"
    for line in re.split(r"\n+", text):
        heading = line.strip().rstrip(":").lower()
        if heading in _HEADING_MAP and len(line) < 60:
            current = _HEADING_MAP[heading]
            sections.setdefault(current, [])
            continue
        if line.strip():
            sections.setdefault(current, []).append(line)
    return {k: "\n".join(v) for k, v in sections.items() if v}


# ─── LLM refinement (optional) ────────────────────────────────────────────
async def _llm_structured(text: str) -> Optional[Dict[str, Any]]:
    """One structured LLM call when a key is available.

    Returns None when no provider is configured or the call fails — the
    deterministic extraction above always stands on its own.
    """
    skill_names: Optional[List[str]] = None
    try:
        if os_has("ANTHROPIC_API_KEY"):
            skill_names = await _call_anthropic(text)
        elif os_has("OPENAI_API_KEY"):
            skill_names = await _call_openai(text)
        elif os_has("EMERGENT_LLM_KEY"):
            skill_names = await _call_openai(text)  # OpenAI-compatible endpoint
    except Exception as e:
        logger.warning(f"[skills.resume_parser] LLM refinement unavailable: {e}")
        return None
    if skill_names is None:
        return None
    return {"skills": skill_names}


def os_has(key: str) -> bool:
    import os
    return bool(os.environ.get(key))


async def _call_anthropic(text: str) -> List[str]:
    import httpx
    import os

    client = httpx.AsyncClient(timeout=30.0)
    try:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": os.environ["ANTHROPIC_API_KEY"],
                "anthropic-version": "2023-06-01",
            },
            json={
                "model": os.environ.get("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest"),
                "max_tokens": 2000,
                "messages": [{
                    "role": "user",
                    "content": (
                        'List the distinct skills and tools this resume demonstrates, '
                        'as plain terms ("Python", "Docker", ...). Reply with JSON: '
                        '{"skills": ["..."]}\n\n' + text[:MAX_TEXT_BYTES]
                    ),
                }],
            },
        )
        r.raise_for_status()
        content = r.json()["content"][0]["text"]
        m = re.search(r"\{.*\}", content, re.S)
        return json.loads(m.group(0))["skills"] if m else []
    finally:
        await client.aclose()


async def _call_openai(text: str) -> List[str]:
    import httpx
    import os

    base = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    client = httpx.AsyncClient(timeout=30.0)
    try:
        r = await client.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {os.environ['OPENAI_API_KEY']}"},
            json={
                "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [{
                    "role": "user",
                    "content": (
                        'Extract distinct skills/tools from this resume. Reply with JSON: '
                        '{"skills": ["..."]}\n\n' + text[:MAX_TEXT_BYTES]
                    ),
                }],
            },
        )
        r.raise_for_status()
        return json.loads(r.json()["choices"][0]["message"]["content"])["skills"]
    finally:
        await client.aclose()


def _validate_llm_skills(llm_terms: List[str]) -> List[Dict[str, Any]]:
    """Validate LLM-suggested terms against the taxonomy; drop what it invents."""
    out: List[Dict[str, Any]] = []
    seen = set()
    for term in llm_terms:
        t = str(term or "").strip()
        if not t or len(t) > 60:
            continue
        hit = taxonomy.normalize(t)
        if hit and hit["id"] not in seen:
            seen.add(hit["id"])
            out.append({"id": hit["id"], "name": hit["name"],
                       "confidence": 0.9, "evidence": t, "source": "llm"})
    return out


# ─── section parsing heuristics ────────────────────────────────────────────
_ROLE_LINE = re.compile(
    r"^(?P<title>[A-Z][A-Za-z0-9 &+/\-]{2,60}?)\s+at\s+(?P<company>[A-Za-z0-9&.\-]{2,40})(?P<dates>.*\d{4}.*)?$"
)
_DEGREE = re.compile(
    r"\b(B\.?\s?[TEH]d?|M\.?\s?[TEH]d?|Ph\.?D|Bachelor|Master|Diploma|B\.?Sc|M\.?Sc|B\.?Tech|M\.?Tech|B\.?E|M\.?E)\b",
    re.I,
)
_YEAR = re.compile(r"\b(19|20)\d{2}\b")


def _parse_roles(text: str) -> List[Dict[str, Optional[str]]]:
    roles: List[Dict[str, Optional[str]]] = []
    for line in text.splitlines():
        line = line.strip().rstrip("|").strip()
        if not line or len(line) > 140:
            continue
        m = _ROLE_LINE.match(line)
        if not m:
            continue
        dates_part = m.group("dates") or ""
        years = _YEAR.findall(dates_part)
        start, end = (years[0] if years else None), (years[1] if len(years) > 1 else None)
        roles.append({"title": m.group("title"), "company": m.group("company"),
                      "start": start, "end": end})
    return roles[:8]


def _parse_education(text: str) -> List[Dict[str, Optional[str]]]:
    out: List[Dict[str, Optional[str]]] = []
    for line in text.splitlines():
        if not _DEGREE.search(line):
            continue
        m = _YEAR.search(line)
        out.append({
            "degree": line.strip()[:80],
            "institution": None,
            "year": m.group(0) if m else None,
        })
        if len(out) >= 4:
            break
    return out


def _parse_projects(text: str, skills: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Heuristic: lines in the projects section that contain a known skill."""
    projects: List[Dict[str, Any]] = []
    known = {s["name"].lower() for s in skills}
    known.update(s["id"] for s in skills)
    for line in text.splitlines():
        line = line.strip()
        if not line or len(line) < 8:
            continue
        lowered = line.lower()
        stack = [name for name in known if name and name in lowered]
        if stack:
            name = re.sub(r"^[-*•]\s*", "", line)[:80]
            projects.append({"name": name, "stack": sorted(set(stack))[:10]})
        if len(projects) >= 5:
            break
    return projects


# ─── public entry point ────────────────────────────────────────────────────
async def parse_resume(data_url_or_bytes: Any, use_llm: bool = True) -> Dict[str, Any]:
    """Parse a resume into structured profile data.

    Returns:
        {
          "sha256": str,
          "text_preview": str,          # truncated to 20 KB — the only stored text
          "text_found": bool,
          "no_text_reason": str|None,   # set when text_found is False
          "sections": {name: text},
          "skills": [{id,name,confidence,evidence,source}],
          "projects": [{name, stack[]}],
          "roles": [{title, company, start, end}],
          "education": [{degree, institution, year}],
        }
    """
    try:
        raw, text, _fmt = extract_text(data_url_or_bytes)
    except ValueError as e:
        return {
            "sha256": hashlib.sha256(str(e).encode()).hexdigest() if not isinstance(data_url_or_bytes, (bytes, bytearray)) else "",
            "text_found": False,
            "no_text_reason": str(e),
            "text_preview": "",
            "sections": {},
            "skills": [],
            "projects": [],
            "roles": [],
            "education": [],
        }

    digest = document_sha256(raw)
    sections = split_sections(text)
    skills = taxonomy.extract(text, limit=30)

    # Optional LLM refinement, merged ahead of the deterministic list but
    # deduped by canonical id — LLM terms must pass taxonomy.normalize.
    if use_llm and (os_has("ANTHROPIC_API_KEY") or os_has("OPENAI_API_KEY")):
        llm_result = await _llm_structured(text)
        if llm_result:
            validated = _validate_llm_skills(llm_result.get("skills") or [])
            existing = {s["id"] for s in skills}
            skills = [v for v in validated if v["id"] not in existing] + skills

    return {
        "sha256": digest,
        "text_found": True,
        "no_text_reason": None,
        "text_preview": text[:MAX_TEXT_BYTES],
        "sections": sections,
        "skills": skills,
        "projects": _parse_projects(sections.get("projects", ""), skills),
        "roles": _parse_roles(sections.get("experience", "")),
        "education": _parse_education(sections.get("education", "")),
    }
