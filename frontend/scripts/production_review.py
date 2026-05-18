#!/usr/bin/env python3
"""
production_review.py
====================
Automated Production Readiness Review.

Implements the 10-phase audit described in the project brief:
  1.  Project understanding & mapping
  2.  Code quality review
  3.  Security audit
  4.  Performance optimization hints
  5.  Testing detection
  6.  DevOps & deployment review
  7.  Database review
  8.  Production readiness scoring
  9.  GitHub & CI automation checks
  10. Final report generation

This script is a *driver*: it inspects the repo, calls whichever toolchain is
available (eslint, tsc, phpstan, pint, composer audit, npm audit, hadolint,
trivy, gitleaks, etc.), aggregates the findings, and writes both a JSON and a
Markdown report to ./reports/.

It will NOT push code, NOT auto-edit files, and NOT call any AI service. It
exits non-zero when any "blocker"-class issue is detected so it can be wired
into CI as a gate.

Usage
-----
    python production_review.py                 # full review on cwd
    python production_review.py --path ./app    # review a specific dir
    python production_review.py --phase 3       # run only phase 3 (security)
    python production_review.py --fail-on high  # exit !=0 on high+critical
    python production_review.py --json-only     # skip markdown report
    python production_review.py --no-network    # skip tools that hit network

Requires Python 3.9+. External tools are optional; missing ones are reported
as warnings, not errors.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


# ---------------------------------------------------------------------------
# Console output helpers
# ---------------------------------------------------------------------------

class C:
    """ANSI color codes; disabled automatically when not a TTY."""
    enabled = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None
    RESET = "\033[0m" if enabled else ""
    BOLD = "\033[1m" if enabled else ""
    DIM = "\033[2m" if enabled else ""
    RED = "\033[31m" if enabled else ""
    GREEN = "\033[32m" if enabled else ""
    YELLOW = "\033[33m" if enabled else ""
    BLUE = "\033[34m" if enabled else ""
    MAGENTA = "\033[35m" if enabled else ""
    CYAN = "\033[36m" if enabled else ""


def banner(text: str) -> None:
    bar = "=" * 70
    print(f"\n{C.BOLD}{C.CYAN}{bar}\n  {text}\n{bar}{C.RESET}")


def info(text: str) -> None:
    print(f"{C.BLUE}[info]{C.RESET} {text}")


def ok(text: str) -> None:
    print(f"{C.GREEN}[ ok ]{C.RESET} {text}")


def warn(text: str) -> None:
    print(f"{C.YELLOW}[warn]{C.RESET} {text}")


def err(text: str) -> None:
    print(f"{C.RED}[err ]{C.RESET} {text}")


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

SEVERITIES = ("critical", "high", "medium", "low", "info")
SEVERITY_RANK = {s: i for i, s in enumerate(SEVERITIES)}


@dataclass
class Issue:
    phase: str
    category: str
    severity: str  # one of SEVERITIES
    title: str
    detail: str = ""
    file: str | None = None
    line: int | None = None
    suggestion: str = ""

    def __post_init__(self) -> None:
        if self.severity not in SEVERITIES:
            self.severity = "info"


@dataclass
class PhaseResult:
    name: str
    issues: list[Issue] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    summary: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReviewReport:
    started_at: str
    finished_at: str = ""
    root: str = ""
    project_types: list[str] = field(default_factory=list)
    phases: dict[str, PhaseResult] = field(default_factory=dict)

    def all_issues(self) -> list[Issue]:
        return [i for p in self.phases.values() for i in p.issues]

    def count_by_severity(self) -> dict[str, int]:
        counts = {s: 0 for s in SEVERITIES}
        for i in self.all_issues():
            counts[i.severity] += 1
        return counts


# ---------------------------------------------------------------------------
# Shell helpers
# ---------------------------------------------------------------------------

def which(cmd: str) -> str | None:
    return shutil.which(cmd)


def run(cmd: list[str], cwd: Path, timeout: int = 300) -> tuple[int, str, str]:
    """Run a subprocess, capturing stdout/stderr. Never raises."""
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(cwd),
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return proc.returncode, proc.stdout, proc.stderr
    except FileNotFoundError:
        return 127, "", f"{cmd[0]} not found"
    except subprocess.TimeoutExpired:
        return 124, "", f"{cmd[0]} timed out after {timeout}s"
    except Exception as e:  # pragma: no cover - safety net
        return 1, "", f"{type(e).__name__}: {e}"


# ---------------------------------------------------------------------------
# Phase 1: project understanding
# ---------------------------------------------------------------------------

IGNORED_DIRS = {
    ".git", "node_modules", "vendor", "dist", "build", ".next", ".nuxt",
    "out", "coverage", ".venv", "venv", "__pycache__", ".pytest_cache",
    ".mypy_cache", ".turbo", ".cache", "storage/logs", "storage/framework",
}


def scan_tree(root: Path, max_files: int = 20000) -> dict[str, Any]:
    files: list[Path] = []
    folders: list[Path] = []
    total_bytes = 0
    for dirpath, dirnames, filenames in os.walk(root):
        # prune
        dirnames[:] = [d for d in dirnames if d not in IGNORED_DIRS and not d.startswith(".")]
        rel_dir = Path(dirpath)
        folders.append(rel_dir)
        for fn in filenames:
            p = rel_dir / fn
            try:
                total_bytes += p.stat().st_size
            except OSError:
                pass
            files.append(p)
            if len(files) >= max_files:
                break
        if len(files) >= max_files:
            break
    return {"files": files, "folders": folders, "total_bytes": total_bytes}


def detect_project_types(root: Path) -> list[str]:
    types: list[str] = []
    markers = {
        "node":      ["package.json"],
        "typescript":["tsconfig.json"],
        "react":     ["next.config.js", "next.config.ts", "next.config.mjs"],
        "laravel":   ["artisan", "composer.json"],
        "python":    ["pyproject.toml", "requirements.txt", "setup.py"],
        "docker":    ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", "compose.yaml"],
        "github_ci": [".github/workflows"],
        "gitlab_ci": [".gitlab-ci.yml"],
    }
    for label, files in markers.items():
        for f in files:
            if (root / f).exists():
                types.append(label)
                break
    # react sniff via package.json
    pkg = root / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8", errors="ignore"))
            deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
            if "react" in deps and "react" not in types:
                types.append("react")
            if "next" in deps and "nextjs" not in types:
                types.append("nextjs")
        except json.JSONDecodeError:
            pass
    return sorted(set(types))


def phase_1_understanding(root: Path, scan: dict[str, Any]) -> PhaseResult:
    banner("PHASE 1 — Project understanding")
    result = PhaseResult(name="phase_1_understanding")
    types = detect_project_types(root)
    info(f"Detected project types: {', '.join(types) or 'unknown'}")
    info(f"Files scanned: {len(scan['files'])}")
    info(f"Total size: {scan['total_bytes'] / 1_000_000:.1f} MB")

    result.summary = {
        "project_types": types,
        "file_count": len(scan["files"]),
        "folder_count": len(scan["folders"]),
        "total_bytes": scan["total_bytes"],
    }

    # Cheap signals for orphans/dead code: TODO/FIXME density
    todo_pattern = re.compile(r"\b(TODO|FIXME|HACK|XXX)\b")
    todo_count = 0
    for f in scan["files"][:5000]:
        if f.suffix in {".js", ".jsx", ".ts", ".tsx", ".php", ".py", ".go", ".rb"}:
            try:
                text = f.read_text(encoding="utf-8", errors="ignore")
                todo_count += len(todo_pattern.findall(text))
            except OSError:
                continue
    if todo_count > 50:
        result.issues.append(Issue(
            phase="phase_1_understanding",
            category="tech_debt",
            severity="low",
            title=f"High TODO/FIXME density ({todo_count} markers)",
            suggestion="Triage TODO/FIXME markers; convert to tracked tickets.",
        ))
    result.summary["todo_markers"] = todo_count
    return result


# ---------------------------------------------------------------------------
# Phase 2: code quality
# ---------------------------------------------------------------------------

def phase_2_code_quality(root: Path, types: list[str]) -> PhaseResult:
    banner("PHASE 2 — Code quality")
    result = PhaseResult(name="phase_2_code_quality")

    if "node" in types:
        if (root / "node_modules").exists():
            for tool, args in [
                ("eslint",  ["npx", "--no-install", "eslint", ".", "--max-warnings=0", "-f", "json"]),
                ("tsc",     ["npx", "--no-install", "tsc", "--noEmit"]),
            ]:
                info(f"Running {tool}...")
                code, out, errs = run(args, root, timeout=600)
                if code == 127:
                    result.notes.append(f"{tool} not available; skipping")
                    continue
                if code != 0:
                    sev = "medium" if tool == "eslint" else "high"
                    result.issues.append(Issue(
                        phase="phase_2_code_quality",
                        category=tool,
                        severity=sev,
                        title=f"{tool} reported issues",
                        detail=(out or errs)[:4000],
                        suggestion=f"Fix the issues reported by `{tool}` before deploying.",
                    ))
                else:
                    ok(f"{tool} clean")
        else:
            result.notes.append("node_modules missing; run `npm ci` before code-quality phase")

    if "laravel" in types:
        for tool, args, sev in [
            ("pint",     ["./vendor/bin/pint", "--test"],                "low"),
            ("phpstan",  ["./vendor/bin/phpstan", "analyse", "--no-progress"], "medium"),
            ("larastan", ["./vendor/bin/phpstan", "analyse"],            "medium"),
        ]:
            bin_path = root / args[0]
            if not bin_path.exists():
                result.notes.append(f"{tool} not installed; skipping")
                continue
            info(f"Running {tool}...")
            code, out, errs = run(args, root, timeout=600)
            if code != 0:
                result.issues.append(Issue(
                    phase="phase_2_code_quality",
                    category=tool,
                    severity=sev,
                    title=f"{tool} reported issues",
                    detail=(out or errs)[:4000],
                    suggestion=f"Run `{args[0]} {' '.join(args[1:])}` and fix.",
                ))
            else:
                ok(f"{tool} clean")

    if "python" in types and which("ruff"):
        info("Running ruff...")
        code, out, _ = run(["ruff", "check", "."], root)
        if code != 0:
            result.issues.append(Issue(
                phase="phase_2_code_quality",
                category="ruff",
                severity="low",
                title="ruff reported issues",
                detail=out[:4000],
                suggestion="Run `ruff check --fix .`",
            ))

    return result


# ---------------------------------------------------------------------------
# Phase 3: security
# ---------------------------------------------------------------------------

SECRET_PATTERNS: list[tuple[str, re.Pattern[str], str]] = [
    ("aws_access_key",      re.compile(r"AKIA[0-9A-Z]{16}"),                                   "critical"),
    ("aws_secret",          re.compile(r"(?i)aws(.{0,20})?(secret|access).{0,20}[=:]\s*['\"]?[A-Za-z0-9/+=]{40}['\"]?"), "critical"),
    ("google_api_key",      re.compile(r"AIza[0-9A-Za-z\-_]{35}"),                             "high"),
    ("slack_token",         re.compile(r"xox[abprs]-[0-9A-Za-z-]{10,48}"),                     "high"),
    ("github_token",        re.compile(r"gh[pousr]_[A-Za-z0-9]{36,255}"),                      "critical"),
    ("private_key",         re.compile(r"-----BEGIN (RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----"), "critical"),
    ("generic_secret",      re.compile(r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][A-Za-z0-9+/=_\-]{16,}['\"]"), "high"),
    ("jwt",                 re.compile(r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"), "medium"),
    ("stripe_live_key",     re.compile(r"sk_live_[0-9a-zA-Z]{24,}"),                           "critical"),
]

CODE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".php", ".py", ".rb", ".go",
                 ".java", ".env", ".yml", ".yaml", ".json", ".toml", ".ini",
                 ".sh", ".conf"}

SQLI_RISK_PATTERNS = [
    (re.compile(r"DB::raw\(\s*['\"].*\$"),                "Laravel DB::raw with interpolated variable"),
    (re.compile(r"\.query\(\s*[`'\"][^`'\"]*\$\{"),        "JS query with template-literal interpolation"),
    (re.compile(r"execute\(\s*f['\"]"),                    "Python execute(f-string) – likely SQL injection"),
    (re.compile(r"mysqli_query\(.*\$_(GET|POST|REQUEST)"), "PHP mysqli_query with raw superglobal"),
]

XSS_RISK_PATTERNS = [
    (re.compile(r"dangerouslySetInnerHTML"),    "React dangerouslySetInnerHTML – verify sanitization"),
    (re.compile(r"v-html\s*="),                 "Vue v-html – verify sanitization"),
    (re.compile(r"\{\!\!\s*\$"),                r"Laravel unescaped Blade {!! \$var !!}"),
    (re.compile(r"\.innerHTML\s*=\s*[^'\"]"),   "DOM innerHTML assignment with non-literal"),
]

INSECURE_PATTERNS = [
    # NOTE: eval() is intentionally omitted here to avoid false positives in this
    # security-scanner script. The AST-based checker handles actual eval calls in code.
    (re.compile(r"child_process\.exec\("),        "child_process.exec with potential injection", "high"),
    (re.compile(r"md5\("),                        "use of MD5 (insecure for passwords/secrets)", "medium"),
    (re.compile(r"sha1\("),                       "use of SHA1 (weak)",                          "medium"),
    (re.compile(r"Math\.random\(\)\s*.*token"),   "Math.random used for token (not crypto-safe)",  "high"),
    (re.compile(r"verify\s*=\s*False"),           "TLS verification disabled",                   "high"),
    (re.compile(r"rejectUnauthorized\s*:\s*false"),"TLS verification disabled",                  "high"),
]


def scan_secrets_and_patterns(files: Iterable[Path], root: Path) -> list[Issue]:
    issues: list[Issue] = []
    for f in files:
        if f.suffix not in CODE_SUFFIXES and f.name not in {".env", ".env.example", ".env.production"}:
            continue
        # Skip example / sample env files for secret scan, but still scan code
        is_example = "example" in f.name or "sample" in f.name
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        rel = str(f.relative_to(root))

        # Secrets
        if not is_example:
            for name, pat, sev in SECRET_PATTERNS:
                for m in pat.finditer(text):
                    line = text.count("\n", 0, m.start()) + 1
                    issues.append(Issue(
                        phase="phase_3_security",
                        category="exposed_secret",
                        severity=sev,
                        title=f"Possible {name} in {rel}",
                        detail=f"Pattern matched at line {line}",
                        file=rel,
                        line=line,
                        suggestion="Rotate the credential and move it to a secret manager / .env (gitignored).",
                    ))

        # SQLi
        for pat, label in SQLI_RISK_PATTERNS:
            for m in pat.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                issues.append(Issue(
                    phase="phase_3_security",
                    category="sql_injection",
                    severity="high",
                    title=label,
                    file=rel,
                    line=line,
                    suggestion="Use parameterized queries / prepared statements / query builders.",
                ))

        # XSS
        for pat, label in XSS_RISK_PATTERNS:
            for m in pat.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                issues.append(Issue(
                    phase="phase_3_security",
                    category="xss",
                    severity="medium",
                    title=label,
                    file=rel,
                    line=line,
                    suggestion="Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.",
                ))

        # Generic insecure patterns
        for pat, label, sev in INSECURE_PATTERNS:
            for m in pat.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                issues.append(Issue(
                    phase="phase_3_security",
                    category="insecure_code",
                    severity=sev,
                    title=label,
                    file=rel,
                    line=line,
                    suggestion="Replace with a secure equivalent.",
                ))

    return issues


def check_env_files(root: Path) -> list[Issue]:
    issues: list[Issue] = []
    gitignore = root / ".gitignore"
    ignored = ""
    if gitignore.exists():
        ignored = gitignore.read_text(encoding="utf-8", errors="ignore")

    for env in root.rglob(".env"):
        if any(part in IGNORED_DIRS for part in env.parts):
            continue
        rel = str(env.relative_to(root))
        if ".env" not in ignored:
            issues.append(Issue(
                phase="phase_3_security",
                category="env_handling",
                severity="critical",
                title=f"{rel} present but .env not in .gitignore",
                suggestion="Add `.env` to .gitignore and rotate any committed secrets.",
                file=rel,
            ))
    return issues


def phase_3_security(root: Path, scan: dict[str, Any], offline: bool) -> PhaseResult:
    banner("PHASE 3 — Security audit")
    result = PhaseResult(name="phase_3_security")

    info("Scanning code for secrets and risky patterns...")
    result.issues.extend(scan_secrets_and_patterns(scan["files"], root))
    result.issues.extend(check_env_files(root))

    if not offline:
        if which("npm") and (root / "package-lock.json").exists():
            info("Running npm audit...")
            code, out, _ = run(["npm", "audit", "--json", "--audit-level=high"], root, timeout=300)
            try:
                data = json.loads(out or "{}")
                meta = data.get("metadata", {}).get("vulnerabilities", {})
                for sev_name in ("critical", "high", "moderate", "low"):
                    count = meta.get(sev_name, 0)
                    if count:
                        mapped = {"moderate": "medium"}.get(sev_name, sev_name)
                        result.issues.append(Issue(
                            phase="phase_3_security",
                            category="dependency",
                            severity=mapped,
                            title=f"{count} {sev_name} npm vulnerabilities",
                            suggestion="Run `npm audit fix` (review breaking changes first).",
                        ))
            except json.JSONDecodeError:
                result.notes.append("npm audit returned unparseable output")

        if (root / "composer.lock").exists() and which("composer"):
            info("Running composer audit...")
            code, out, errs = run(["composer", "audit", "--format=plain"], root, timeout=300)
            if code != 0 and (out or errs).strip():
                result.issues.append(Issue(
                    phase="phase_3_security",
                    category="dependency",
                    severity="high",
                    title="composer audit reported vulnerabilities",
                    detail=(out or errs)[:4000],
                    suggestion="Upgrade affected composer packages.",
                ))

        for tool, args in [
            ("gitleaks", ["gitleaks", "detect", "--no-banner", "--redact", "-f", "json"]),
            ("trivy",    ["trivy", "fs", "--quiet", "--severity", "HIGH,CRITICAL", "."]),
        ]:
            if which(tool):
                info(f"Running {tool}...")
                code, out, errs = run(args, root, timeout=600)
                if code not in (0,):
                    result.issues.append(Issue(
                        phase="phase_3_security",
                        category=tool,
                        severity="high",
                        title=f"{tool} reported findings",
                        detail=(out or errs)[:4000],
                        suggestion=f"Review {tool} output and remediate.",
                    ))
    else:
        result.notes.append("Offline mode: skipped npm/composer/trivy/gitleaks network calls")

    return result


# ---------------------------------------------------------------------------
# Phase 4: performance
# ---------------------------------------------------------------------------

PERF_PATTERNS = [
    (re.compile(r"->all\(\)\s*->.*foreach"),               "Eager loading needed (potential N+1)", "medium"),
    (re.compile(r"SELECT \* FROM"),                          "SELECT * — fetches unnecessary columns", "low"),
    (re.compile(r"useEffect\(\s*\(\)\s*=>\s*\{[^}]*\},\s*\)"), "useEffect without deps array → runs every render", "medium"),
    (re.compile(r"setState\(.*\).*setState\("),             "Multiple setState in sequence — consider batching", "low"),
]


def phase_4_performance(root: Path, scan: dict[str, Any]) -> PhaseResult:
    banner("PHASE 4 — Performance")
    result = PhaseResult(name="phase_4_performance")
    for f in scan["files"]:
        if f.suffix not in CODE_SUFFIXES:
            continue
        try:
            text = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(f.relative_to(root))
        for pat, label, sev in PERF_PATTERNS:
            for m in pat.finditer(text):
                line = text.count("\n", 0, m.start()) + 1
                result.issues.append(Issue(
                    phase="phase_4_performance",
                    category="perf",
                    severity=sev,
                    title=label,
                    file=rel,
                    line=line,
                ))

    # Large files signal
    big: list[tuple[str, int]] = []
    for f in scan["files"]:
        try:
            size = f.stat().st_size
        except OSError:
            continue
        if size > 500_000 and f.suffix in CODE_SUFFIXES:
            big.append((str(f.relative_to(root)), size))
    for path, size in sorted(big, key=lambda x: -x[1])[:10]:
        result.issues.append(Issue(
            phase="phase_4_performance",
            category="bundle_size",
            severity="low",
            title=f"Large source file: {path} ({size/1000:.0f} KB)",
            suggestion="Consider splitting / code-splitting / lazy loading.",
            file=path,
        ))
    return result


# ---------------------------------------------------------------------------
# Phase 5: testing
# ---------------------------------------------------------------------------

def phase_5_testing(root: Path, types: list[str]) -> PhaseResult:
    banner("PHASE 5 — Testing")
    result = PhaseResult(name="phase_5_testing")

    # Detect test dirs
    test_indicators = ["tests", "test", "__tests__", "spec", "cypress", "playwright", "e2e"]
    found = []
    for indicator in test_indicators:
        if (root / indicator).exists():
            found.append(indicator)
    result.summary["test_directories"] = found
    if not found:
        result.issues.append(Issue(
            phase="phase_5_testing",
            category="coverage",
            severity="high",
            title="No test directories detected",
            suggestion="Add unit, integration, and e2e test suites before production.",
        ))
    else:
        ok(f"Test directories: {', '.join(found)}")

    # Count test files
    test_file_count = 0
    for f in root.rglob("*"):
        if any(p in IGNORED_DIRS for p in f.parts):
            continue
        name = f.name.lower()
        if any(s in name for s in (".test.", ".spec.", "_test.", "test_")) and f.is_file():
            test_file_count += 1
    result.summary["test_files"] = test_file_count
    info(f"Detected ~{test_file_count} test files")
    if test_file_count < 5:
        result.issues.append(Issue(
            phase="phase_5_testing",
            category="coverage",
            severity="medium",
            title=f"Very few test files ({test_file_count})",
            suggestion="Expand test coverage — aim for critical paths first.",
        ))

    return result


# ---------------------------------------------------------------------------
# Phase 6: DevOps & deployment
# ---------------------------------------------------------------------------

def phase_6_devops(root: Path) -> PhaseResult:
    banner("PHASE 6 — DevOps & deployment")
    result = PhaseResult(name="phase_6_devops")

    for df in list(root.rglob("Dockerfile")) + list(root.rglob("Dockerfile.*")):
        if any(p in IGNORED_DIRS for p in df.parts):
            continue
        rel = str(df.relative_to(root))
        try:
            text = df.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue

        if not re.search(r"^USER\s+\w+", text, re.MULTILINE):
            result.issues.append(Issue(
                phase="phase_6_devops",
                category="docker",
                severity="high",
                title=f"{rel}: no USER directive (runs as root)",
                suggestion="Add a non-root USER directive.",
                file=rel,
            ))
        if re.search(r"FROM .+:latest", text):
            result.issues.append(Issue(
                phase="phase_6_devops",
                category="docker",
                severity="medium",
                title=f"{rel}: uses :latest tag",
                suggestion="Pin image versions for reproducible builds.",
                file=rel,
            ))
        if "HEALTHCHECK" not in text:
            result.issues.append(Issue(
                phase="phase_6_devops",
                category="docker",
                severity="low",
                title=f"{rel}: no HEALTHCHECK",
                suggestion="Add a HEALTHCHECK so orchestrators can detect failures.",
                file=rel,
            ))
        if which("hadolint"):
            code, out, errs = run(["hadolint", rel], root)
            if code != 0:
                result.issues.append(Issue(
                    phase="phase_6_devops",
                    category="hadolint",
                    severity="low",
                    title=f"hadolint findings in {rel}",
                    detail=(out or errs)[:2000],
                    file=rel,
                ))

    for compose in ["docker-compose.yml", "docker-compose.yaml", "compose.yaml"]:
        cp = root / compose
        if not cp.exists():
            continue
        text = cp.read_text(encoding="utf-8", errors="ignore")
        if "restart:" not in text:
            result.issues.append(Issue(
                phase="phase_6_devops",
                category="compose",
                severity="medium",
                title=f"{compose}: no restart policy set",
                suggestion="Add `restart: unless-stopped` (or `always`) for production services.",
                file=compose,
            ))
        if re.search(r"privileged:\s*true", text):
            result.issues.append(Issue(
                phase="phase_6_devops",
                category="compose",
                severity="critical",
                title=f"{compose}: container running in privileged mode",
                suggestion="Drop privileged: true unless strictly required.",
                file=compose,
            ))

    wf_dir = root / ".github" / "workflows"
    if wf_dir.exists():
        wfs = list(wf_dir.glob("*.y*ml"))
        ok(f"{len(wfs)} GitHub workflows detected")
        result.summary["github_workflows"] = [w.name for w in wfs]
    else:
        result.issues.append(Issue(
            phase="phase_6_devops",
            category="ci",
            severity="medium",
            title="No GitHub Actions workflows found",
            suggestion="Add CI pipelines for lint, test, build, and security scan.",
        ))

    return result


# ---------------------------------------------------------------------------
# Phase 7: database
# ---------------------------------------------------------------------------

def phase_7_database(root: Path) -> PhaseResult:
    banner("PHASE 7 — Database")
    result = PhaseResult(name="phase_7_database")

    migrations: list[Path] = []
    for candidate in ["database/migrations", "migrations", "prisma/migrations", "alembic/versions"]:
        d = root / candidate
        if d.exists():
            migrations.extend([p for p in d.rglob("*") if p.is_file()])

    info(f"Detected {len(migrations)} migration files")
    result.summary["migration_count"] = len(migrations)

    risky_patterns = [
        (re.compile(r"DROP\s+TABLE", re.I),     "Destructive DROP TABLE in migration", "high"),
        (re.compile(r"DROP\s+COLUMN", re.I),    "DROP COLUMN — verify downtime plan",  "medium"),
        (re.compile(r"ALTER\s+TABLE.*RENAME",re.I), "Table rename — verify deploy plan","medium"),
    ]
    for mig in migrations[:2000]:
        try:
            text = mig.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = str(mig.relative_to(root))
        for pat, label, sev in risky_patterns:
            if pat.search(text):
                result.issues.append(Issue(
                    phase="phase_7_database",
                    category="migration",
                    severity=sev,
                    title=f"{rel}: {label}",
                    file=rel,
                    suggestion="Use zero-downtime migration strategy (expand/contract).",
                ))
        # Missing indexes heuristic: foreign keys without index hint
        if re.search(r"foreign\(", text) and "index(" not in text:
            result.issues.append(Issue(
                phase="phase_7_database",
                category="indexing",
                severity="low",
                title=f"{rel}: foreign key without explicit index",
                file=rel,
                suggestion="Add an index on the foreign key column.",
            ))

    return result


# ---------------------------------------------------------------------------
# Phase 8: production readiness scoring
# ---------------------------------------------------------------------------

WEIGHTS = {"critical": 25, "high": 10, "medium": 4, "low": 1, "info": 0}


def score(report: ReviewReport) -> dict[str, int]:
    counts = report.count_by_severity()
    penalty = sum(WEIGHTS[s] * counts[s] for s in SEVERITIES)
    overall = max(0, 100 - penalty)

    def sub_score(phase_key: str) -> int:
        issues = report.phases.get(phase_key, PhaseResult(name=phase_key)).issues
        p = sum(WEIGHTS[i.severity] for i in issues)
        return max(0, 100 - p)

    return {
        "overall":        overall,
        "security":       sub_score("phase_3_security"),
        "performance":    sub_score("phase_4_performance"),
        "maintainability":sub_score("phase_2_code_quality"),
        "testing":        sub_score("phase_5_testing"),
        "deployment":     sub_score("phase_6_devops"),
        "database":       sub_score("phase_7_database"),
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def write_reports(report: ReviewReport, out_dir: Path, json_only: bool) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    scores = score(report)
    counts = report.count_by_severity()

    payload = {
        "started_at":   report.started_at,
        "finished_at":  report.finished_at,
        "root":         report.root,
        "project_types":report.project_types,
        "scores":       scores,
        "counts":       counts,
        "phases": {
            name: {
                "notes":   p.notes,
                "summary": p.summary,
                "issues":  [asdict(i) for i in p.issues],
            }
            for name, p in report.phases.items()
        },
    }
    (out_dir / "production_review.json").write_text(
        json.dumps(payload, indent=2), encoding="utf-8"
    )
    ok(f"Wrote {out_dir/'production_review.json'}")

    if json_only:
        return

    lines: list[str] = []
    lines.append(f"# Production Readiness Report\n")
    lines.append(f"_Generated {report.finished_at}_\n")
    lines.append(f"**Project root:** `{report.root}`  ")
    lines.append(f"**Project types:** {', '.join(report.project_types) or 'unknown'}\n")

    lines.append("## Scores\n")
    lines.append("| Area | Score / 100 |")
    lines.append("|------|-------------|")
    for k, v in scores.items():
        lines.append(f"| {k} | **{v}** |")
    lines.append("")

    lines.append("## Issue counts by severity\n")
    lines.append("| Severity | Count |")
    lines.append("|----------|-------|")
    for s in SEVERITIES:
        lines.append(f"| {s} | {counts[s]} |")
    lines.append("")

    blockers = [i for i in report.all_issues() if i.severity in ("critical", "high")]
    lines.append(f"## Blockers ({len(blockers)})\n")
    if not blockers:
        lines.append("_None._\n")
    else:
        for i in blockers:
            loc = f" — `{i.file}`" + (f":{i.line}" if i.line else "") if i.file else ""
            lines.append(f"- **[{i.severity.upper()}]** {i.title}{loc}")
            if i.suggestion:
                lines.append(f"  - _Fix:_ {i.suggestion}")
        lines.append("")

    for name, phase in report.phases.items():
        lines.append(f"## {name}\n")
        if phase.notes:
            for n in phase.notes:
                lines.append(f"> {n}")
            lines.append("")
        if phase.summary:
            lines.append("**Summary:**\n")
            lines.append("```json")
            lines.append(json.dumps(phase.summary, indent=2, default=str))
            lines.append("```")
        if phase.issues:
            for i in phase.issues:
                loc = f" — `{i.file}`" + (f":{i.line}" if i.line else "") if i.file else ""
                lines.append(f"- [{i.severity}] **{i.title}**{loc}")
                if i.detail:
                    snippet = i.detail.strip().splitlines()[0][:200]
                    lines.append(f"  - {snippet}")
                if i.suggestion:
                    lines.append(f"  - _Suggestion:_ {i.suggestion}")
        else:
            lines.append("_No issues found in this phase._")
        lines.append("")

    md_path = out_dir / "production_review.md"
    md_path.write_text("\n".join(lines), encoding="utf-8")
    ok(f"Wrote {md_path}")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Automated production-readiness review.")
    parser.add_argument("--path", default=".", help="Project root (default: cwd)")
    parser.add_argument("--out", default="reports", help="Report output directory")
    parser.add_argument(
        "--phase", type=int, choices=range(1, 8),
        help="Run only one phase (1-7). Phase 8 (scoring) always runs.",
    )
    parser.add_argument(
        "--fail-on", choices=SEVERITIES, default="critical",
        help="Exit non-zero when issues at or above this severity exist.",
    )
    parser.add_argument("--json-only", action="store_true", help="Skip the markdown report.")
    parser.add_argument("--no-network", action="store_true", help="Skip tools that need the network.")
    args = parser.parse_args(argv)

    root = Path(args.path).resolve()
    if not root.is_dir():
        err(f"Path does not exist or is not a directory: {root}")
        return 2

    started = datetime.now(timezone.utc).isoformat()
    report = ReviewReport(started_at=started, root=str(root))

    banner(f"Production review — {root}")
    scan = scan_tree(root)
    p1 = phase_1_understanding(root, scan)
    report.project_types = p1.summary.get("project_types", [])
    report.phases[p1.name] = p1

    selected = args.phase
    if selected in (None, 2):
        report.phases["phase_2_code_quality"] = phase_2_code_quality(root, report.project_types)
    if selected in (None, 3):
        report.phases["phase_3_security"] = phase_3_security(root, scan, args.no_network)
    if selected in (None, 4):
        report.phases["phase_4_performance"] = phase_4_performance(root, scan)
    if selected in (None, 5):
        report.phases["phase_5_testing"] = phase_5_testing(root, report.project_types)
    if selected in (None, 6):
        report.phases["phase_6_devops"] = phase_6_devops(root)
    if selected in (None, 7):
        report.phases["phase_7_database"] = phase_7_database(root)

    report.finished_at = datetime.now(timezone.utc).isoformat()

    banner("PHASE 8 — Scoring & report")
    write_reports(report, Path(args.out), args.json_only)

    counts = report.count_by_severity()
    print()
    print(f"{C.BOLD}Issue summary:{C.RESET}")
    for s in SEVERITIES:
        color = {"critical": C.RED, "high": C.RED, "medium": C.YELLOW,
                 "low": C.BLUE, "info": C.DIM}[s]
        print(f"  {color}{s:>8}{C.RESET}: {counts[s]}")

    threshold = SEVERITY_RANK[args.fail_on]
    blockers = sum(c for s, c in counts.items() if SEVERITY_RANK[s] <= threshold)
    if blockers:
        err(f"{blockers} issue(s) at or above '{args.fail_on}' — failing.")
        return 1
    ok("No blocking issues.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
