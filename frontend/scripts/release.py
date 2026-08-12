#!/usr/bin/env python3
"""Hyra release helper — generates commit message, release notes & version.

Usage:
    python3 scripts/release.py patch         # 1.0.0 -> 1.0.1
    python3 scripts/release.py minor         # 1.0.0 -> 1.1.0
    python3 scripts/release.py major         # 1.0.0 -> 2.0.0
    python3 scripts/release.py minor --dry   # preview only — no files written
    python3 scripts/release.py minor --push  # also stage + commit + tag locally

What it does:
    1. Reads /app/VERSION, bumps it (major/minor/patch).
    2. Walks `git log <last-tag>..HEAD` and classifies commits into
       feat/fix/refactor/docs/test/chore/other using Conventional Commits
       prefixes; falls back to keyword sniffing when prefixes are missing.
    3. Writes:
         /app/VERSION             — new version
         /app/RELEASE_NOTES.md    — markdown notes for THIS release (overwrites)
         /app/CHANGELOG.md        — appended history (kept across releases)
         /app/.release/<vX.Y.Z>/  — copy of commit-msg + release-notes + PR body
    4. Prints copy-paste-ready commands for: `git commit`, `git tag`,
       `gh release create`, and `gh pr create`.
     5. If --push is set, also runs `git add` + `git commit` + `git tag`
        locally (does NOT push to remote — Save-to-Github does that).
"""
from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION"
NOTES_FILE = ROOT / "RELEASE_NOTES.md"
CHANGELOG = ROOT / "CHANGELOG.md"
ARCHIVE_DIR = ROOT / ".release"

# Conventional-commit prefixes -> human section headers.
SECTIONS: Dict[str, str] = {
    "feat":     "🚀 Features",
    "fix":      "🐛 Bug Fixes",
    "perf":     "⚡ Performance",
    "refactor": "🏗️ Refactor",
    "docs":     "📚 Documentation",
    "test":     "✅ Tests",
    "chore":    "🧹 Chores",
    "ci":       "🔧 CI / Build",
    "style":    "💄 Style",
    "build":    "🔧 CI / Build",
    "other":    "🔍 Other",
}


def sh(cmd: List[str], check: bool = False, cwd: Path | None = None) -> str:
    res = subprocess.run(
        cmd, capture_output=True, text=True, cwd=str(cwd or ROOT),
    )
    if check and res.returncode != 0:
        sys.exit(f"$ {' '.join(cmd)}\n{res.stderr}")
    return res.stdout.strip()


def read_version() -> str:
    if not VERSION_FILE.exists():
        return "0.0.0"
    return VERSION_FILE.read_text().strip()


def bump(version: str, level: str) -> str:
    parts = [int(p) for p in version.split(".")]
    while len(parts) < 3:
        parts.append(0)
    maj, mi, pa = parts[0], parts[1], parts[2]
    if level == "major":
        return f"{maj + 1}.0.0"
    if level == "minor":
        return f"{maj}.{mi + 1}.0"
    if level == "patch":
        return f"{maj}.{mi}.{pa + 1}"
    sys.exit(f"Unknown level: {level}")


def last_tag() -> str | None:
    tag = sh(["git", "describe", "--tags", "--abbrev=0"])
    return tag or None


def commits_since(tag: str | None) -> List[str]:
    rng = f"{tag}..HEAD" if tag else "HEAD"
    out = sh(["git", "log", rng, "--pretty=format:%H%x09%s%x09%an"])
    return [line for line in out.splitlines() if line.strip()]


def classify(subject: str) -> str:
    m = re.match(r"^([a-z]+)(\([^)]+\))?!?:\s*", subject, re.I)
    if m:
        prefix = m.group(1).lower()
        if prefix in SECTIONS:
            return prefix
    lower = subject.lower()
    keywords = [
        ("fix", ["fix", "bug", "patch", "hotfix"]),
        ("feat", ["add", "introduce", "implement", "new", "feature"]),
        ("refactor", ["refactor", "rewrite", "cleanup", "extract", "split"]),
        ("docs", ["doc", "readme", "comment"]),
        ("test", ["test", "spec", "coverage"]),
        ("perf", ["perf", "speed", "optimize"]),
        ("chore", ["chore", "bump", "deps", "lint"]),
    ]
    for kind, words in keywords:
        if any(w in lower for w in words):
            return kind
    return "other"


def shorten(subject: str) -> str:
    # Strip the conventional prefix when present, capitalise.
    cleaned = re.sub(r"^([a-z]+)(\([^)]+\))?!?:\s*", "", subject, flags=re.I)
    cleaned = cleaned.strip()
    if not cleaned:
        return subject
    return cleaned[0].upper() + cleaned[1:]


def build_sections(raw_commits: List[str]) -> Dict[str, List[str]]:
    buckets: Dict[str, List[str]] = {k: [] for k in SECTIONS}
    for line in raw_commits:
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        sha, subject = parts[0], parts[1]
        author = parts[2] if len(parts) > 2 else ""
        # Skip the noisy auto-commits unless they're the only thing.
        if subject.startswith("auto-commit for "):
            continue
        kind = classify(subject)
        line_out = f"- {shorten(subject)} (`{sha[:7]}`"
        if author:
            line_out += f" — {author}"
        line_out += ")"
        buckets[kind].append(line_out)
    return buckets


def render_notes(version: str, prev_tag: str | None, sections: Dict[str, List[str]]) -> str:
    header = (
        f"# v{version} — {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"
        f"Range: `{prev_tag or '<initial>'}` → `HEAD`\n\n"
    )
    body_parts: List[str] = []
    for key, title in SECTIONS.items():
        items = sections.get(key) or []
        if not items:
            continue
        body_parts.append(f"## {title}\n" + "\n".join(items) + "\n")
    if not body_parts:
        body_parts.append("_No noteworthy commits in this range._\n")
    return header + "\n".join(body_parts)


def render_commit_message(version: str, sections: Dict[str, List[str]]) -> str:
    headline_parts: List[str] = []
    for key in ("feat", "fix", "refactor"):
        if sections.get(key):
            label = {
                "feat": f"{len(sections[key])} new feature(s)",
                "fix":  f"{len(sections[key])} bug fix(es)",
                "refactor": "refactor",
            }[key]
            headline_parts.append(label)
    summary = " + ".join(headline_parts) or "maintenance"
    title = f"release: v{version} — {summary}"

    body_lines: List[str] = []
    for key, label in (
        ("feat",     "Features"),
        ("fix",      "Bug Fixes"),
        ("refactor", "Refactor"),
        ("perf",     "Performance"),
        ("docs",     "Documentation"),
        ("test",     "Tests"),
        ("chore",    "Chores"),
        ("ci",       "CI / Build"),
    ):
        items = sections.get(key) or []
        if not items:
            continue
        body_lines.append(f"\n{label}:")
        for it in items[:30]:
            body_lines.append("  " + it[2:])  # strip the leading "- "
        if len(items) > 30:
            body_lines.append(f"  ... and {len(items) - 30} more")
    return title + "\n" + "\n".join(body_lines).rstrip() + "\n"


def render_pr_body(version: str, prev_tag: str | None, notes_md: str) -> str:
    return (
        f"# Release v{version}\n\n"
        f"Auto-generated by `scripts/release.py`. Range: "
        f"`{prev_tag or '<initial>'}` → `HEAD`.\n\n"
        f"---\n\n{notes_md}\n\n"
        "## ✅ Verification\n"
        "- [ ] CI green\n"
        "- [ ] Backend pytest pass (`pytest -q /app/backend/tests`)\n"
        "- [ ] Frontend smoke tests pass\n"
        "- [ ] No `data-testid` regressions\n"
        "- [ ] PRD.md updated\n"
    )


def write_outputs(version: str, prev_tag: str | None, dry: bool) -> Dict[str, Path]:
    sections = build_sections(commits_since(prev_tag))
    notes_md = render_notes(version, prev_tag, sections)
    commit_msg = render_commit_message(version, sections)
    pr_body = render_pr_body(version, prev_tag, notes_md)

    archive = ARCHIVE_DIR / f"v{version}"
    if dry:
        print("\n────── COMMIT MESSAGE ──────\n")
        print(commit_msg)
        print("\n────── RELEASE NOTES ──────\n")
        print(notes_md)
        print("\n────── PR BODY ──────\n")
        print(pr_body)
        return {}

    VERSION_FILE.write_text(version + "\n")
    NOTES_FILE.write_text(notes_md)
    ARCHIVE_DIR.mkdir(exist_ok=True)
    archive.mkdir(exist_ok=True)
    (archive / "COMMIT_MSG.txt").write_text(commit_msg)
    (archive / "RELEASE_NOTES.md").write_text(notes_md)
    (archive / "PR_BODY.md").write_text(pr_body)

    # Append to CHANGELOG
    prev_changelog = CHANGELOG.read_text() if CHANGELOG.exists() else "# Changelog\n\n"
    if not prev_changelog.startswith("# Changelog"):
        prev_changelog = "# Changelog\n\n" + prev_changelog
    CHANGELOG.write_text(
        prev_changelog.replace("# Changelog\n\n", f"# Changelog\n\n{notes_md}\n", 1)
    )
    return {
        "version": VERSION_FILE,
        "notes": NOTES_FILE,
        "changelog": CHANGELOG,
        "commit_msg": archive / "COMMIT_MSG.txt",
        "pr_body": archive / "PR_BODY.md",
    }


def maybe_commit_and_tag(version: str, paths: Dict[str, Path]):
    print("\n────── LOCAL GIT ACTIONS ──────")
    for p in paths.values():
        sh(["git", "add", str(p)], check=False)
    msg_file = paths.get("commit_msg")
    if msg_file:
        res = subprocess.run(
            ["git", "commit", "-F", str(msg_file)],
            cwd=str(ROOT), capture_output=True, text=True,
        )
        print(res.stdout)
        if res.returncode != 0 and "nothing to commit" not in res.stderr:
            print(res.stderr)
            return
    tag_msg = f"Release v{version}"
    res = subprocess.run(
        ["git", "tag", "-a", f"v{version}", "-m", tag_msg],
        cwd=str(ROOT), capture_output=True, text=True,
    )
    print(res.stdout)
    if res.returncode != 0:
        print(res.stderr)


def print_next_steps(version: str, paths: Dict[str, Path]):
    if not paths:
        return
    branch = f"release/v{version}"
    print("\n────── NEXT STEPS ──────")
    print("1) Stage + commit + tag locally (or pass --push to do it for you):")
    print(f"     git checkout -b {branch}")
    print("     git add -A")
    print(f"     git commit -F {paths['commit_msg']}")
    print(f"     git tag -a v{version} -m 'Release v{version}'")
    print()
    print("2) Push via the 'Save to GitHub' button OR locally:")
    print(f"     git push origin {branch}")
    print()
    print(f"   .github/workflows/release.yml will then OPEN A PR FROM"
          f" {branch} → main automatically with the auto-generated body.")
    print()
    print("3) After the PR is merged into main, publish the release:")
    print(f"     git push origin v{version}")
    print()
    print(f"   The same workflow will create the GitHub Release using"
          f" {paths['notes']}.")
    print()
    print(f"4) Manual fallback (if Actions is disabled):")
    print(f"     gh pr create --base main --head {branch} \\")
    print(f"       --title \"$(head -1 {paths['commit_msg']})\" \\")
    print(f"       --body-file {paths['pr_body']}")
    print(f"     gh release create v{version} --title 'v{version}' \\")
    print(f"       --notes-file {paths['notes']}")


def main():
    p = argparse.ArgumentParser(description="Hyra release helper.")
    p.add_argument("level", choices=["major", "minor", "patch"])
    p.add_argument("--dry", action="store_true", help="Preview only, no writes.")
    p.add_argument("--push", action="store_true",
                   help="Also `git add` + `git commit` + `git tag` locally.")
    args = p.parse_args()

    if not shutil.which("git"):
        sys.exit("git not found on PATH")

    current = read_version()
    new = bump(current, args.level)
    prev_tag = last_tag()
    print(f"Hyra release helper — {current} -> {new} (prev tag: {prev_tag or 'none'})")

    paths = write_outputs(new, prev_tag, dry=args.dry)
    if args.push and paths:
        maybe_commit_and_tag(new, paths)
    print_next_steps(new, paths)


if __name__ == "__main__":
    main()
