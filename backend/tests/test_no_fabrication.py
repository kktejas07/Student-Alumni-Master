"""Guard test: fail if known fabricated-backend markers reappear.

This protects the P2 work ("remove remaining fabricated backend data"). Each
marker below was a hardcoded value that was passed off as real data. The test
scans the backend source tree (excluding the test suite itself and seed
scripts, which are explicitly allowed to contain demo fixtures) and fails if
any marker shows up again.

Scope notes:
- The bare number ``80000`` legitimately appears in static reference catalog
  data (job salary ranges, scholarship amounts, living-cost figures) in
  integrations_base.py, financial_services.py and higher_ed_platform.py. Those
  are out of P2 scope, so the ``80000`` guard is scoped to ``routers/users.py``
  (where the fabricated admin-payment seed ``base=80000`` lived), not global.
- ``or 999`` is a global guard: the fabricated ₹999 price fallback was removed
  from every module that had it.
"""
from __future__ import annotations

from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent

# (marker, scope). scope is None => scan the whole tree; otherwise a list of
# Path (relative to BACKEND_DIR) that the marker must NOT appear in.
_CHECKS: list[tuple[str, list[Path] | None, str]] = [
    ('80000', [Path("routers") / "users.py"], "fabricated admin-payment seed base"),
    ('"MOCKED"', None, "hardcoded MOCKED rating label"),
    ('"Mock daily brief"', None, "fabricated daily-brief fallback text"),
    ('"mock-teams-session"', None, "fabricated Teams join URL"),
    ("or 999", None, "fabricated ₹999 price fallback"),
    ("or 4.5", None, "fabricated 4.5 course rating fallback"),
    ("or 4.7", None, "fabricated 4.7 rating fallback"),
    ('"match": 80', None, "fabricated match-score heuristic"),
    ("_fake_mutual", None, "removed fabrication helper"),
]


def _iter_backend_py() -> "list[tuple[Path, str]]":
    """Yield (path, text) for each backend .py file the guard applies to."""
    results: list[tuple[Path, str]] = []
    for path in sorted(BACKEND_DIR.rglob("*.py")):
        rel = path.relative_to(BACKEND_DIR)
        # Skip the test suite itself.
        if rel.parts and rel.parts[0] == "tests":
            continue
        # Skip seed scripts (demo fixtures are allowed there).
        if rel.parts and rel.parts[0] == "scripts" and rel.name.startswith("seed_"):
            continue
        # Skip bytecode caches.
        if "__pycache__" in rel.parts:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        results.append((rel, text))
    return results


def test_no_fabricated_markers_reappear() -> None:
    files = _iter_backend_py()
    assert files, f"guard found no backend python files under {BACKEND_DIR}"

    violations: list[str] = []
    for marker, scope, why in _CHECKS:
        if scope is None:
            candidates = files
        else:
            candidates = [(rel, text) for rel, text in files if rel in scope]
        for rel, text in candidates:
            if marker in text:
                for lineno, line in enumerate(text.splitlines(), start=1):
                    if marker in line:
                        violations.append(
                            f"{marker!r} reappeared in {rel.as_posix()}:{lineno} ({why})"
                        )
    assert not violations, "\n".join(violations)
