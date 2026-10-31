"""
talent_skill_taxonomy.py — TP22: canonical skill taxonomy + fuzzy normalization.

Every skill string that enters the talent pool (CSV import, resume parse,
LinkedIn/GitHub enrichment, manual entry) is normalized to a canonical form
so that "K8s", "Kubernetes" and "kubernetes.io" all resolve to one bucket
and skill-overlap / matching math is meaningful.

Data model (db.canonical_skills):
    {_id, canonical: "Kubernetes", aliases: ["k8s", "k8"], status: "active",
     source: "seed|import|agent", last_seen: datetime, usage_count: int}

Resolution order:
    1. exact case-insensitive hit in the seed taxonomy
    2. alias-table hit
    3. RapidFuzz token_set_ratio >= 92 against canonical names
    4. leave the raw string as its own canonical form and record it as a
       pending alias candidate for the admin "Manage Skills" review queue.

All functions are lazy-import-safe: rapidfuzz is declared in requirements.txt
and is a soft dependency (pure Python wheel), so import failures degrade to
the exact-match path rather than raising.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

_SEED_TAXONOMY: List[Dict[str, Any]] = [
    # backend
    {"canonical": "Python", "aliases": ["python3", "py"]},
    {"canonical": "Java", "aliases": ["jdk"]},
    {"canonical": "C++", "aliases": ["cpp", "c-plus-plus"]},
    {"canonical": "Go", "aliases": ["golang"]},
    {"canonical": "Rust", "aliases": []},
    {"canonical": "C#", "aliases": ["csharp", ".net", "dotnet", "dot net"]},
    {"canonical": "TypeScript", "aliases": ["ts"]},
    {"canonical": "JavaScript", "aliases": ["js", "ecmascript"]},
    {"canonical": "Ruby", "aliases": ["ruby on rails"]},
    {"canonical": "PHP", "aliases": []},
    {"canonical": "Kotlin", "aliases": []},
    {"canonical": "Swift", "aliases": []},
    {"canonical": "Scala", "aliases": []},
    {"canonical": "R", "aliases": []},
    {"canonical": "MATLAB", "aliases": []},
    {"canonical": "Dart", "aliases": []},
    {"canonical": "C", "aliases": []},
    {"canonical": "SQL", "aliases": ["structured query language"]},
    # frameworks / runtime
    {"canonical": "React", "aliases": ["react.js", "reactjs"]},
    {"canonical": "Next.js", "aliases": ["nextjs", "next"]},
    {"canonical": "Vue.js", "aliases": ["vue", "vuejs"]},
    {"canonical": "Angular", "aliases": ["angularjs"]},
    {"canonical": "Svelte", "aliases": []},
    {"canonical": "Node.js", "aliases": ["node", "nodejs"]},
    {"canonical": "Express.js", "aliases": ["express"]},
    {"canonical": "FastAPI", "aliases": []},
    {"canonical": "Django", "aliases": []},
    {"canonical": "Flask", "aliases": []},
    {"canonical": "Spring Boot", "aliases": ["spring", "springboot", "spring mvc"]},
    {"canonical": ".NET", "aliases": ["asp.net", "asp net", "web api"]},
    {"canonical": "Laravel", "aliases": []},
    {"canonical": "Ruby on Rails", "aliases": ["rails"]},
    {"canonical": "GraphQL", "aliases": []},
    {"canonical": "gRPC", "aliases": []},
    {"canonical": "REST API", "aliases": ["rest", "restful", "rest api", "rest apis"]},
    {"canonical": "WebSockets", "aliases": ["websocket"]},
    {"canonical": "Expo", "aliases": ["expo go", "react native expo"]},
    {"canonical": "React Native", "aliases": ["react-native"]},
    # databases
    {"canonical": "MongoDB", "aliases": ["mongo"]},
    {"canonical": "PostgreSQL", "aliases": ["postgres"]},
    {"canonical": "MySQL", "aliases": []},
    {"canonical": "SQLite", "aliases": []},
    {"canonical": "Redis", "aliases": []},
    {"canonical": "Elasticsearch", "aliases": ["elastic search", "elastic"]},
    {"canonical": "Cassandra", "aliases": []},
    {"canonical": "Amazon DynamoDB", "aliases": ["dynamodb"]},
    {"canonical": "Firebase", "aliases": ["firestore"]},
    # cloud / infra
    {"canonical": "AWS", "aliases": ["amazon web services", "aws lambda", "amazon"]},
    {"canonical": "Azure", "aliases": ["microsoft azure"]},
    {"canonical": "Google Cloud", "aliases": ["gcp", "google cloud platform"]},
    {"canonical": "Docker", "aliases": []},
    {"canonical": "Kubernetes", "aliases": ["k8s", "k8"]},
    {"canonical": "Terraform", "aliases": []},
    {"canonical": "Ansible", "aliases": []},
    {"canonical": "Jenkins", "aliases": []},
    {"canonical": "GitHub Actions", "aliases": ["actions", "ci/cd", "cicd", "ci cd"]},
    {"canonical": "Linux", "aliases": ["ubuntu", "bash"]},
    {"canonical": "Nginx", "aliases": []},
    {"canonical": "Helm", "aliases": []},
    {"canonical": "AWS EC2", "aliases": ["ec2"]},
    {"canonical": "AWS S3", "aliases": ["s3"]},
    {"canonical": "AWS RDS", "aliases": ["rds"]},
    # data / ml
    {"canonical": "Machine Learning", "aliases": ["ml", "machine learning engineering"]},
    {"canonical": "Deep Learning", "aliases": ["dl"]},
    {"canonical": "TensorFlow", "aliases": []},
    {"canonical": "PyTorch", "aliases": []},
    {"canonical": "scikit-learn", "aliases": ["sklearn", "sk learn"]},
    {"canonical": "Pandas", "aliases": []},
    {"canonical": "NumPy", "aliases": ["numpy"]},
    {"canonical": "Numina", "aliases": []},
    {"canonical": "LLM Engineering", "aliases": ["llm", "large language models", "genai", "generative ai"]},
    {"canonical": "Prompt Engineering", "aliases": ["prompting"]},
    {"canonical": "RAG", "aliases": ["retrieval augmented generation", "vector search"]},
    {"canonical": "Hugging Face", "aliases": ["huggingface"]},
    {"canonical": "OpenCV", "aliases": []},
    {"canonical": "Spark", "aliases": ["pyspark", "apache spark"]},
    {"canonical": "Kafka", "aliases": ["apache kafka"]},
    {"canonical": "Airflow", "aliases": ["apache airflow"]},
    {"canonical": "Tableau", "aliases": []},
    {"canonical": "Power BI", "aliases": ["powerbi", "power bi"]},
    # testing / practices
    {"canonical": "Unit Testing", "aliases": ["pytest", "jest", "junit", "testing"]},
    {"canonical": "Git", "aliases": ["github", "gitflow"]},
    {"canonical": "CI/CD", "aliases": ["devops", "continuous integration"]},
    {"canonical": "Agile", "aliases": ["scrum", "kanban"]},
    {"canonical": "System Design", "aliases": ["distributed systems"]},
    # design / product
    {"canonical": "Figma", "aliases": []},
    {"canonical": "UI/UX Design", "aliases": ["ux", "ui design", "user experience"]},
    # mobile / ios
    {"canonical": "iOS Development", "aliases": ["ios"]},
    {"canonical": "Android Development", "aliases": []},
]

# alias → canonical lookup (built once)
_ALIAS_MAP: Dict[str, str] = {}
for _entry in _SEED_TAXONOMY:
    _n = _entry["canonical"]
    _ALIAS_MAP[_n.lower()] = _n
    for _a in _entry["aliases"]:
        _ALIAS_MAP[str(_a).lower()] = _n

_TOKEN_RE = re.compile(r"[\w+#./-]+")


def _token_set_ratio(a: str, b: str) -> int:
    try:
        from rapidfuzz import fuzz
        return int(fuzz.token_set_ratio(a, b))
    except Exception:
        ta, tb = set(a.lower().split()), set(b.lower().split())
        if not ta or not tb:
            return 0
        return int(100 * len(ta & tb) / len(ta | tb))


def _fuzzy_canonical(norm: str) -> Optional[str]:
    """Best rapidfuzz match against canonical names; None below threshold."""
    threshold = 92
    best, best_score = None, 0
    for key, canonical in _ALIAS_MAP.items():
        if key in _ALIAS_MAP:
            score = 100 if key == norm.lower() else _token_set_ratio(norm, key)
        else:
            continue
        if score > best_score:
            best, best_score = canonical, score
    if best_score >= threshold:
        return best
    return None


def _seed_canonicals() -> List[str]:
    seen: List[str] = []
    for e in _SEED_TAXONOMY:
        if e["canonical"] not in seen:
            seen.append(e["canonical"])
    return seen


def normalize_skill(raw: Optional[str]) -> Tuple[Optional[str], str]:
    """Return (canonical_form, match_method).

    match_method ∈ {"exact", "alias", "fuzzy", "none"} — "none" means the
    raw string had no mappable content and is returned as-is (caller may
    discard).
    """
    if raw is None:
        return None, "none"
    s = str(raw).strip()
    if not s:
        return None, "none"
    # tidy common write-once noise
    s = s.replace("__", " ").replace("--", " ")
    s = re.sub(r"\s{2,}", " ", s).strip()
    key = s.lower()
    if key in _ALIAS_MAP:
        return _ALIAS_MAP[key], ("exact" if key == _ALIAS_MAP[key].lower() else "alias")
    tokens = _TOKEN_RE.findall(key)
    if len(tokens) == 1:
        fuzzy = _fuzzy_canonical(s)
        if fuzzy:
            return fuzzy, "fuzzy"
        # single unknown token → keep title-cased raw
        return s.title(), "none"
    fuzzy = _fuzzy_canonical(" ".join(tokens))
    if fuzzy:
        return fuzzy, "fuzzy"
    return s, "none"


async def ensure_taxonomy(db) -> Dict[str, Any]:
    """Seed canonical_skills from the built-in taxonomy; upsert existing.

    Idempotent: runs on every module load that needs it; safe to call from
    the scheduler on a weekly cadence. Returns {"seeded": n, "total": m}.
    """
    seeded = 0
    for entry in _SEED_TAXONOMY:
        canonical = entry["canonical"]
        existing = await db.canonical_skills.find_one({"canonical": canonical})
        if not existing:
            await db.canonical_skills.insert_one({
                "canonical": canonical,
                "aliases": [a.lower() for a in entry.get("aliases", [])],
                "status": "active",
                "source": "seed",
                "usage_count": 0,
                "last_seen": datetime.now(timezone.utc),
            })
            seeded += 1
    total = await db.canonical_skills.count_documents({"status": "active"})
    return {"seeded": seeded, "total": total}


async def register_observed_skill(db, raw: str, source: str) -> None:
    """Record that a raw skill spelling was observed (for review queue).

    Called by every importer when normalize_skill returned method "none" —
    admin "Manage Skills" can then promote it into an alias in one click.
    Never raises.
    """
    try:
        canonical, method = normalize_skill(raw)
        if method != "none" or not canonical:
            return
        await db.canonical_skills.update_one(
            {"canonical": canonical, "status": {"$in": ["active", "pending"]}},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_seen": datetime.now(timezone.utc), "source": source},
                "$addToSet": {"aliases": raw.lower()},
            },
            upsert=True,
        )
    except Exception:
        pass


async def canonicalize_skills(db, skills: List[str], source: str = "unknown") -> List[str]:
    """Normalize a list of raw skill strings to canonical forms.

    - Dedupes case-insensitively
    - Records unknown spellings for admin review (register_observed_skill)
    - Bumps usage_count for every canonical skill that resolved (exact/alias/fuzzy)
    """
    out: List[str] = []
    seen: set = set()
    used_canonicals: List[str] = []
    for raw in skills or []:
        if raw is None:
            continue
        canonical, method = normalize_skill(raw)
        if not canonical:
            continue
        ck = canonical.lower()
        if ck in seen:
            continue
        seen.add(ck)
        out.append(canonical)
        if method in ("exact", "alias", "fuzzy"):
            used_canonicals.append(canonical)
        else:
            await register_observed_skill(db, canonical, source)
    if used_canonicals:
        now = datetime.now(timezone.utc)
        for c in used_canonicals:
            try:
                await db.canonical_skills.update_one(
                    {"canonical": c},
                    {"$inc": {"usage_count": 1}, "$set": {"last_seen": now}},
                )
            except Exception:
                pass
    return out


async def taxonomy_report(db) -> Dict[str, Any]:
    """Stats for the admin "Manage Skills" screen."""
    total = await db.canonical_skills.count_documents({"status": "active"})
    pending = await db.canonical_skills.count_documents({"status": "pending"})
    top = await db.canonical_skills.find(
        {"status": "active"}, {"canonical": 1, "usage_count": 1, "aliases": 1}
    ).sort("usage_count", -1).limit(50).to_list(50)
    return {
        "total_canonical": total,
        "pending_review": pending,
        "top_used": [
            {"canonical": t.get("canonical"), "usage_count": t.get("usage_count", 0),
             "aliases": t.get("aliases", [])}
            for t in top
        ],
    }


async def review_promote(db, canonical: str, aliases: List[str]) -> Dict[str, Any]:
    """Admin action: fold a list of raw aliases under a canonical entry.

    Backfills every talent_pool.profile.skills entry that matched an alias.
    Returns {"backfilled": n}.
    """
    lowered = [a.lower() for a in aliases if a]
    await db.canonical_skills.update_one(
        {"canonical": canonical},
        {
            "$set": {"status": "active"},
            "$addToSet": {"aliases": {"$each": lowered}},
        },
        upsert=True,
    )
    # extend the in-memory alias map so subsequent normalizations in this
    # process are instant; Mongo is the source of truth across workers.
    for a in lowered:
        _ALIAS_MAP[a] = canonical
    backfilled = 0
    cursor = db.talent_pool.find({"skills": {"$in": aliases}})
    async for doc in cursor:
        new_skills: List[str] = []
        for s in doc.get("skills") or []:
            ns, _ = normalize_skill(s)
            new_skills.append(ns if ns else s)
        new_skills = list(dict.fromkeys(new_skills))
        if len(new_skills) != len(doc.get("skills") or []):
            await db.talent_pool.update_one(
                {"_id": doc["_id"]},
                {"$set": {"skills": new_skills, "updated_at": datetime.now(timezone.utc)}},
            )
            backfilled += 1
    return {"backfilled": backfilled}


async def load_alias_overlay(db) -> int:
    """Pull admin-curated aliases from Mongo into the in-process map.

    Called at scheduler boot and on-demand after review_promote. Returns the
    number of alias keys loaded.
    """
    count = 0
    async for doc in db.canonical_skills.find({"status": "active", "aliases": {"$exists": True}}):
        for a in doc.get("aliases") or []:
            key = str(a).lower()
            if key and key not in _ALIAS_MAP:
                _ALIAS_MAP[key] = doc["canonical"]
                count += 1
    return count


async def skill_index_status(db) -> Dict[str, Any]:
    """Health probe: confirm the collection is seeded and aliases loaded."""
    return {
        "seeded": len(_SEED_TAXONOMY),
        "aliases_loaded": len(_ALIAS_MAP),
        "mongo_active": await db.canonical_skills.count_documents({"status": "active"}),
    }


class SkillTaxonomyAgent:
    """TP22 dashboard facade."""
    name = "TP22 Skill Taxonomy"
    group = "intelligence"
    priority = "P1"

    async def agent_status(self, db) -> Dict[str, Any]:
        st = await skill_index_status(db)
        rep = await taxonomy_report(db)
        last = await db.scheduler_logs.find_one(
            {"agent": "tp23_scheduler", "action": "taxonomy_seed"},
            sort=[("started_at", -1)])
        return {
            "name": self.name, "group": self.group, "priority": self.priority,
            "status": "ok",
            "canonical_skills": st["mongo_active"],
            "aliases_loaded": st["aliases_loaded"],
            "pending_review": rep["pending_review"],
            "est_cost_per_month": "$0 (rapidfuzz token_set, local only)",
            "last_run_at": last.get("started_at").isoformat() if last and last.get("started_at") else None,
        }


taxonomy_agent = SkillTaxonomyAgent()
