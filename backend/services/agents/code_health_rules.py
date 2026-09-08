"""
code_health_rules.py — Rule Engine for CodeHealthAgent (v2.0).

Enforces .agents/rules/development_standards.md §1–§4.
Generates findings with stable fingerprints invariant to line number changes:
  fingerprint = sha256(rule_id + file_path + normalized_symbol)

Tier Classifications:
  - Tier A: Purely mechanical, semantically inert, reversible (autofixable).
  - Tier B: Propose only, never auto-fixed (logic changes, tests, dead code removal).
  - Tier C: Alert only, never touch (Auth/Security, payments, migrations, core/deps.py, core/security.py).
"""

from __future__ import annotations
import ast
import hashlib
import logging
import os
import re
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Tier C Protected Paths (Strictly untouched by any auto-fixer)
TIER_C_PATHS = (
    "backend/core/deps.py",
    "backend/core/security.py",
    "core/deps.py",
    "core/security.py",
    "backend/routers/auth.py",
    "backend/core/auth",
    "migrations",
    "payment",
    "refund",
)


@dataclass
class CodeHealthFinding:
    fingerprint: str
    rule_id: str
    family: str  # "DEAD", "FAKE", "TEST", "LOG", "ANALYTICS", "FALLBACK"
    severity: str  # "P0", "P1", "P2", "P3"
    tier: str  # "Tier A", "Tier B", "Tier C"
    autofixable: bool
    file: str
    line: int
    symbol: str
    evidence: str
    blast_radius: str
    proposed_fix: str
    confidence: str  # "confirmed", "likely", "needs-owner-input"
    verification_method: str
    status: str = "open"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def generate_fingerprint(rule_id: str, file_path: str, normalized_symbol: str) -> str:
    """Stable fingerprint hash of rule_id + relative file path + normalized symbol name."""
    raw = f"{rule_id}:{file_path.strip().lower()}:{normalized_symbol.strip().lower()}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def is_tier_c_path(file_path: str) -> bool:
    """Check if a file falls under Tier C security/auth/payment boundaries."""
    norm = file_path.replace("\\", "/").lower()
    return any(protected in norm for protected in TIER_C_PATHS)


SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".next", "build", "dist",
    ".expo", "ios", "android", "scratch", ".gemini", "venv", "env", ".venv", "site-packages"
}

class CodeHealthRuleEngine:
    """Engine executing static and AST/regex audit rules against the workspace."""

    def __init__(self, workspace_root: str):
        self.workspace_root = os.path.abspath(workspace_root)

    def scan_all(self, families: Optional[List[str]] = None) -> List[CodeHealthFinding]:
        """Runs enabled rule families across the codebase."""
        findings: List[CodeHealthFinding] = []
        target_families = set(families) if families else {"DEAD", "FAKE", "TEST", "LOG", "ANALYTICS", "FALLBACK"}

        if "DEAD" in target_families:
            findings.extend(self._check_dead_code())
        if "FAKE" in target_families:
            findings.extend(self._check_fake_code())
        if "TEST" in target_families:
            findings.extend(self._check_test_standards())
        if "LOG" in target_families:
            findings.extend(self._check_logging_standards())
        if "ANALYTICS" in target_families:
            findings.extend(self._check_analytics_standards())
        if "FALLBACK" in target_families:
            findings.extend(self._check_fallback_standards())

        # Enforce Tier C override rule on findings
        for f in findings:
            if is_tier_c_path(f.file):
                f.tier = "Tier C"
                f.autofixable = False

        return findings

    # --- WS1: DEAD CODE RULES ---
    def _check_dead_code(self) -> List[CodeHealthFinding]:
        findings = []

        # DEAD-003: Orphan __pycache__ / .pyc / .DS_Store artifacts
        for root, dirs, files in os.walk(self.workspace_root):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            for file in files:
                if file.endswith(".pyc") or file == ".DS_Store":
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.workspace_root)
                    fp = generate_fingerprint("DEAD-003", rel_path, file)
                    findings.append(
                        CodeHealthFinding(
                            fingerprint=fp,
                            rule_id="DEAD-003",
                            family="DEAD",
                            severity="P3",
                            tier="Tier A",
                            autofixable=True,
                            file=rel_path,
                            line=1,
                            symbol=file,
                            evidence=f"Orphan artifact file: {file}",
                            blast_radius="Zero runtime impact (build artifact)",
                            proposed_fix=f"Delete orphan artifact {rel_path}",
                            confidence="confirmed",
                            verification_method="FileSystem inspection",
                        )
                    )

        # DEAD-001 & DEAD-002: AST parsing on backend python files
        backend_dir = os.path.join(self.workspace_root, "backend")
        if os.path.exists(backend_dir):
            for root, dirs, files in os.walk(backend_dir):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for file in files:
                    if file.endswith(".py"):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, self.workspace_root)
                        findings.extend(self._check_python_dead_ast(full_path, rel_path))

        return findings

    def _check_python_dead_ast(self, full_path: str, rel_path: str) -> List[CodeHealthFinding]:
        findings = []
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            tree = ast.parse(content, filename=rel_path)
        except Exception:
            return findings

        # Track imports
        imported_symbols: Dict[str, Tuple[int, str]] = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_symbols[name] = (node.lineno, f"import {alias.name}")
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_symbols[name] = (node.lineno, f"from {node.module or ''} import {alias.name}")

        # Simple usage count check (excluding import lines)
        lines = content.splitlines()
        for sym, (line_no, imp_stmt) in imported_symbols.items():
            if sym.startswith("_") or sym in ("__future__", "annotations"):
                continue
            # Grep symbol occurrences in file outside the import line
            occurrences = [
                idx + 1
                for idx, l in enumerate(lines)
                if idx + 1 != line_no and re.search(r"\b" + re.escape(sym) + r"\b", l)
            ]
            if not occurrences:
                # Dynamic reference guardrail check
                if not self._is_dynamically_referenced(sym, content):
                    fp = generate_fingerprint("DEAD-001", rel_path, sym)
                    findings.append(
                        CodeHealthFinding(
                            fingerprint=fp,
                            rule_id="DEAD-001",
                            family="DEAD",
                            severity="P3",
                            tier="Tier A" if not is_tier_c_path(rel_path) else "Tier C",
                            autofixable=not is_tier_c_path(rel_path),
                            file=rel_path,
                            line=line_no,
                            symbol=sym,
                            evidence=f"Unused import '{sym}' from line {line_no}: {imp_stmt}",
                            blast_radius="None (Unused AST import)",
                            proposed_fix=f"Remove unused import '{sym}'",
                            confidence="confirmed",
                            verification_method="AST parsing & dynamic ref check",
                        )
                    )

        return findings

    def _is_dynamically_referenced(self, symbol: str, content: str) -> bool:
        """Dynamic reference guardrail for FastAPI DI, pytest fixtures, router registration."""
        if symbol in ("Depends", "Header", "Query", "Path", "Body", "Security", "pytest", "fixture"):
            return True
        if "__all__" in content and symbol in content:
            return True
        if "router.include_router" in content or "include_router" in symbol:
            return True
        return False

    # --- WS2: FAKE & PLACEHOLDER RULES ---
    def _check_fake_code(self) -> List[CodeHealthFinding]:
        findings = []
        backend_dir = os.path.join(self.workspace_root, "backend")
        frontend_dir = os.path.join(self.workspace_root, "frontend")

        # Scan backend files for FAKE rules
        if os.path.exists(backend_dir):
            for root, dirs, files in os.walk(backend_dir):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for file in files:
                    if file.endswith(".py"):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, self.workspace_root)
                        findings.extend(self._scan_file_fake_rules(full_path, rel_path, is_py=True))

        # Scan frontend files for print/console.log
        if os.path.exists(frontend_dir):
            for root, dirs, files in os.walk(frontend_dir):
                dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
                for file in files:
                    if file.endswith((".ts", ".tsx", ".js", ".jsx")):
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, self.workspace_root)
                        findings.extend(self._scan_file_fake_rules(full_path, rel_path, is_py=False))

        return findings

    def _scan_file_fake_rules(self, full_path: str, rel_path: str, is_py: bool) -> List[CodeHealthFinding]:
        findings = []
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
        except Exception:
            return findings

        has_logger = False
        in_except_block = False

        for idx, line in enumerate(lines, 1):
            line_str = line.strip()

            # FAKE-002: Check if python module has named logger
            if is_py and ("logging.getLogger(" in line or "logger = logging" in line):
                has_logger = True

            # FAKE-001: print() in python or console.log() in frontend shipping code
            if is_py and re.search(r"\bprint\s*\(", line_str) and not line_str.startswith("#"):
                if "test" not in rel_path and "script" not in rel_path:
                    fp = generate_fingerprint("FAKE-001", rel_path, f"print_line_{idx}")
                    findings.append(
                        CodeHealthFinding(
                            fingerprint=fp,
                            rule_id="FAKE-001",
                            family="FAKE",
                            severity="P3",
                            tier="Tier A" if not is_tier_c_path(rel_path) else "Tier C",
                            autofixable=not is_tier_c_path(rel_path),
                            file=rel_path,
                            line=idx,
                            symbol="print",
                            evidence=line_str,
                            blast_radius="Console output clutter in production logs",
                            proposed_fix="Replace print() with logger.debug()",
                            confidence="confirmed",
                            verification_method="Regex scan §2",
                        )
                    )

            # FAKE-003: Swallowed exception (except: pass)
            if is_py:
                if line_str.startswith("except ") or line_str == "except:":
                    in_except_block = True
                elif in_except_block:
                    if line_str == "pass" or line_str == "return None" or line_str == "return":
                        fp = generate_fingerprint("FAKE-003", rel_path, f"swallowed_except_{idx}")
                        findings.append(
                            CodeHealthFinding(
                                fingerprint=fp,
                                rule_id="FAKE-003",
                                family="FAKE",
                                severity="P1",
                                tier="Tier B",
                                autofixable=False,
                                file=rel_path,
                                line=idx,
                                symbol="except_pass",
                                evidence=f"Swallowed exception on line {idx}: {line_str}",
                                blast_radius="Hides runtime errors silently",
                                proposed_fix="Log error with exc_info=True or re-raise exception",
                                confidence="confirmed",
                                verification_method="Syntax block scan",
                            )
                        )
                    in_except_block = False

            # FAKE-004: Hardcoded Auth Return Stub (Tier C HARD STOP)
            if is_tier_c_path(rel_path) or "security.py" in rel_path or "deps.py" in rel_path:
                if "return True" in line_str or 'return {"status": "ok"}' in line_str:
                    fp = generate_fingerprint("FAKE-004", rel_path, f"auth_stub_{idx}")
                    findings.append(
                        CodeHealthFinding(
                            fingerprint=fp,
                            rule_id="FAKE-004",
                            family="FAKE",
                            severity="P0",
                            tier="Tier C",
                            autofixable=False,
                            file=rel_path,
                            line=idx,
                            symbol="auth_stub",
                            evidence=line_str,
                            blast_radius="SECURITY RISK: Auth check returns hardcoded constant!",
                            proposed_fix="Replace hardcoded stub with real JWT verification",
                            confidence="confirmed",
                            verification_method="Security audit scan (Tier C)",
                        )
                    )

        # FAKE-002 Finding
        if is_py and not has_logger and "test" not in rel_path and "migrations" not in rel_path:
            fp = generate_fingerprint("FAKE-002", rel_path, "missing_logger")
            findings.append(
                CodeHealthFinding(
                    fingerprint=fp,
                    rule_id="FAKE-002",
                    family="FAKE",
                    severity="P3",
                    tier="Tier A" if not is_tier_c_path(rel_path) else "Tier C",
                    autofixable=not is_tier_c_path(rel_path),
                    file=rel_path,
                    line=1,
                    symbol="logger",
                    evidence="Module missing logger = logging.getLogger(__name__)",
                    blast_radius="Inconsistent logging output",
                    proposed_fix="Add logger = logging.getLogger(__name__) at top of module",
                    confidence="confirmed",
                    verification_method="Module header inspection §2",
                )
            )

        return findings

    # --- WS3: TEST STANDARDS RULES ---
    def _check_test_standards(self) -> List[CodeHealthFinding]:
        findings = []
        backend_dir = os.path.join(self.workspace_root, "backend")
        routers_dir = os.path.join(backend_dir, "routers")
        tests_dir = os.path.join(backend_dir, "tests")

        if os.path.exists(routers_dir) and os.path.exists(tests_dir):
            test_files = {f for f in os.listdir(tests_dir) if f.startswith("test_") and f.endswith(".py")}
            for rfile in os.listdir(routers_dir):
                if rfile.endswith(".py") and not rfile.startswith("__"):
                    feature_name = rfile.replace(".py", "")
                    expected_test = f"test_{feature_name}.py"
                    if expected_test not in test_files and f"test_{feature_name}_unit.py" not in test_files:
                        fp = generate_fingerprint("TEST-001", f"backend/routers/{rfile}", feature_name)
                        findings.append(
                            CodeHealthFinding(
                                fingerprint=fp,
                                rule_id="TEST-001",
                                family="TEST",
                                severity="P1",
                                tier="Tier B",
                                autofixable=False,
                                file=f"backend/routers/{rfile}",
                                line=1,
                                symbol=feature_name,
                                evidence=f"Router {rfile} has no matching test file {expected_test} in backend/tests/",
                                blast_radius="Untested production endpoint feature",
                                proposed_fix=f"Create backend/tests/{expected_test} with endpoint unit tests",
                                confidence="confirmed",
                                verification_method="Test matrix check §1",
                            )
                        )

        # Check assertion-free tests (TEST-002)
        if os.path.exists(tests_dir):
            for tfile in os.listdir(tests_dir):
                if tfile.endswith(".py"):
                    full_tpath = os.path.join(tests_dir, tfile)
                    rel_tpath = os.path.relpath(full_tpath, self.workspace_root)
                    try:
                        with open(full_tpath, "r", encoding="utf-8") as tf:
                            tcontent = tf.read()
                        ttree = ast.parse(tcontent, filename=rel_tpath)
                        for node in ast.walk(ttree):
                            if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                                has_assert = any(isinstance(child, ast.Assert) for child in ast.walk(node))
                                if not has_assert:
                                    fp = generate_fingerprint("TEST-002", rel_tpath, node.name)
                                    findings.append(
                                        CodeHealthFinding(
                                            fingerprint=fp,
                                            rule_id="TEST-002",
                                            family="TEST",
                                            severity="P1",
                                            tier="Tier B",
                                            autofixable=False,
                                            file=rel_tpath,
                                            line=node.lineno,
                                            symbol=node.name,
                                            evidence=f"Test function '{node.name}' contains no assert statements!",
                                            blast_radius="False positive test confidence (test cannot fail)",
                                            proposed_fix=f"Add meaningful assertions to {node.name}()",
                                            confidence="confirmed",
                                            verification_method="AST Assert inspection §1",
                                        )
                                    )
                    except Exception:
                        pass

        return findings

    # --- WS4: LOGGING STANDARDS RULES ---
    def _check_logging_standards(self) -> List[CodeHealthFinding]:
        findings = []
        backend_dir = os.path.join(self.workspace_root, "backend")
        if not os.path.exists(backend_dir):
            return findings

        skip_dirs = {".git", "node_modules", "__pycache__", ".next", "build", "dist", ".expo", "ios", "android", "scratch", ".gemini"}
        for root, dirs, files in os.walk(backend_dir):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.workspace_root)
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()
                    except Exception:
                        continue

                    in_except = False
                    for idx, line in enumerate(lines, 1):
                        lstr = line.strip()
                        if lstr.startswith("except ") or lstr == "except:":
                            in_except = True
                        elif in_except and lstr.startswith("def "):
                            in_except = False

                        # LOG-001: logger.error inside except block missing exc_info=True
                        if in_except and ("logger.error(" in lstr or "logger.exception(" in lstr):
                            if "logger.error(" in lstr and "exc_info" not in lstr:
                                fp = generate_fingerprint("LOG-001", rel_path, f"log_exc_info_{idx}")
                                findings.append(
                                    CodeHealthFinding(
                                        fingerprint=fp,
                                        rule_id="LOG-001",
                                        family="LOG",
                                        severity="P2",
                                        tier="Tier A" if not is_tier_c_path(rel_path) else "Tier C",
                                        autofixable=not is_tier_c_path(rel_path),
                                        file=rel_path,
                                        line=idx,
                                        symbol="exc_info",
                                        evidence=lstr,
                                        blast_radius="Error log missing exception traceback context",
                                        proposed_fix="Add exc_info=True to logger.error() call",
                                        confidence="confirmed",
                                        verification_method="Logger AST check §2",
                                    )
                                )

                        # LOG-002: Secret/PII in log payload (Tier C HARD STOP)
                        if re.search(r"logger\.(info|debug|error)\(.*(password|secret|bearer_token|credit_card)", lstr, re.IGNORECASE):
                            fp = generate_fingerprint("LOG-002", rel_path, f"pii_log_{idx}")
                            findings.append(
                                CodeHealthFinding(
                                    fingerprint=fp,
                                    rule_id="LOG-002",
                                    family="LOG",
                                    severity="P0",
                                    tier="Tier C",
                                    autofixable=False,
                                    file=rel_path,
                                    line=idx,
                                    symbol="pii_log",
                                    evidence=lstr,
                                    blast_radius="SECURITY/PRIVACY RISK: Secret or PII printed to log stream!",
                                    proposed_fix="Sanitize log statement to remove sensitive payload",
                                    confidence="confirmed",
                                    verification_method="Security Log Inspection §2 (Tier C)",
                                )
                            )

        return findings

    # --- WS5: ANALYTICS STANDARDS RULES ---
    def _check_analytics_standards(self) -> List[CodeHealthFinding]:
        findings = []
        views_dir = os.path.join(self.workspace_root, "frontend/src/views")
        if not os.path.exists(views_dir):
            return findings

        for root, _, files in os.walk(views_dir):
            for file in files:
                if file.endswith((".tsx", ".jsx")) and "View" in file:
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.workspace_root)
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                    except Exception:
                        continue

                    # ANALYTICS-001: Missing trackScreen on View mount
                    if "trackScreen" not in content and "track_screen" not in content:
                        fp = generate_fingerprint("ANALYTICS-001", rel_path, file)
                        findings.append(
                            CodeHealthFinding(
                                fingerprint=fp,
                                rule_id="ANALYTICS-001",
                                family="ANALYTICS",
                                severity="P2",
                                tier="Tier A" if not is_tier_c_path(rel_path) else "Tier C",
                                autofixable=not is_tier_c_path(rel_path),
                                file=rel_path,
                                line=1,
                                symbol=file,
                                evidence=f"View component {file} lacks trackScreen() instrumentation on mount",
                                blast_radius="Missing pageview telemetry for view",
                                proposed_fix="Add useEffect(() => { trackScreen(...) }, []) to View mount",
                                confidence="confirmed",
                                verification_method="View instrumentation scan §3",
                            )
                        )

        return findings

    # --- WS6: FALLBACK STANDARDS RULES ---
    def _check_fallback_standards(self) -> List[CodeHealthFinding]:
        findings = []
        backend_dir = os.path.join(self.workspace_root, "backend")
        if not os.path.exists(backend_dir):
            return findings

        skip_dirs = {".git", "node_modules", "__pycache__", ".next", "build", "dist", ".expo", "ios", "android", "scratch", ".gemini"}
        for root, dirs, files in os.walk(backend_dir):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for file in files:
                if file.endswith(".py"):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, self.workspace_root)
                    try:
                        with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                            content = f.read()
                    except Exception:
                        continue

                    # FALLBACK-001: External LLM or HTTP call without availability try/except fallback
                    if ("httpx." in content or "requests." in content or "openai." in content or "google.generativeai" in content):
                        if "try:" not in content or ("except" not in content and "fallback" not in content):
                            fp = generate_fingerprint("FALLBACK-001", rel_path, file)
                            findings.append(
                                CodeHealthFinding(
                                    fingerprint=fp,
                                    rule_id="FALLBACK-001",
                                    family="FALLBACK",
                                    severity="P1",
                                    tier="Tier B",
                                    autofixable=False,
                                    file=rel_path,
                                    line=1,
                                    symbol=file,
                                    evidence=f"External call in {file} lacks try/except fallback guard",
                                    blast_radius="External API outage could crash request handler",
                                    proposed_fix="Wrap external call in try/except with graceful cached fallback",
                                    confidence="likely",
                                    verification_method="Fallback availability inspection §4",
                                )
                            )

        return findings
