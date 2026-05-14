#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# extract-changelog.sh
# Parses CHANGELOG.md (Keep-a-Changelog format) and prints metadata
# used by the release workflow.
#
# Usage:
#   scripts/extract-changelog.sh --version           # latest semver, e.g. 0.12.0
#   scripts/extract-changelog.sh --tag               # latest tag, e.g. v0.12.0
#   scripts/extract-changelog.sh --body              # body of latest version
#   scripts/extract-changelog.sh --list-versions     # every semver, newest→oldest
#   scripts/extract-changelog.sh --body-for 0.10.0   # body of a specific version
#
# Env:
#   CHANGELOG_PATH  defaults to ./CHANGELOG.md
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

CHANGELOG_PATH="${CHANGELOG_PATH:-CHANGELOG.md}"
MODE="${1:---version}"

if [[ ! -f "$CHANGELOG_PATH" ]]; then
  echo "CHANGELOG not found at $CHANGELOG_PATH" >&2
  exit 1
fi

# All semver section headers in the order they appear in the file.
# (Skips `## [Unreleased]` and anything non-semver.)
list_versions() {
  grep -E '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' "$CHANGELOG_PATH" \
    | sed -E 's/^## \[([0-9]+\.[0-9]+\.[0-9]+)\].*/\1/'
}

# Body for a given version — from its `## [x.y.z]` header up to (but not
# including) the next `## ` header. Also strips trailing horizontal-rule
# (`---`) lines and trailing blanks.
body_for() {
  local ver="$1"
  awk -v ver="$ver" '
    $0 ~ "^## \\[" ver "\\]" { capture=1; print; next }
    capture && /^## / { exit }
    capture { print }
  ' "$CHANGELOG_PATH" \
    | awk '
      # Buffer everything; strip trailing "---" and blank lines at the end.
      { lines[NR] = $0 }
      END {
        last = NR
        while (last > 0 && (lines[last] ~ /^[[:space:]]*$/ || lines[last] ~ /^[[:space:]]*-{3,}[[:space:]]*$/)) {
          last--
        }
        for (i = 1; i <= last; i++) print lines[i]
      }
    '
}

case "$MODE" in
  --version)
    list_versions | head -1
    ;;
  --tag)
    v=$(list_versions | head -1)
    [[ -z "$v" ]] && { echo "No semver section found" >&2; exit 1; }
    echo "v$v"
    ;;
  --list-versions)
    list_versions
    ;;
  --body)
    v=$(list_versions | head -1)
    [[ -z "$v" ]] && { echo "No semver section found" >&2; exit 1; }
    body_for "$v"
    ;;
  --body-for)
    ver="${2:-}"
    [[ -z "$ver" ]] && { echo "Usage: $0 --body-for <version>" >&2; exit 2; }
    body_for "$ver"
    ;;
  -h|--help)
    grep -E '^# ' "$0" | sed 's/^# //'
    ;;
  *)
    echo "Unknown mode: $MODE" >&2
    echo "Try: $0 --help" >&2
    exit 2
    ;;
esac
