# Production Readiness Report

_Generated 2026-05-21T08:26:22.749548+00:00_

**Project root:** `C:\Users\kalya\Desktop\Master\Student-Alumni-Master`  
**Project types:** docker, github_ci

## Scores

| Area | Score / 100 |
|------|-------------|
| overall | **1** |
| security | **12** |
| performance | **99** |
| maintainability | **100** |
| testing | **100** |
| deployment | **90** |
| database | **100** |

## Issue counts by severity

| Severity | Count |
|----------|-------|
| critical | 0 |
| high | 3 |
| medium | 17 |
| low | 1 |
| info | 0 |

## Blockers (3)

- **[HIGH]** Possible slack_token in backend\admin_settings.py — `backend\admin_settings.py`:228
  - _Fix:_ Rotate the credential and move it to a secret manager / .env (gitignored).
- **[HIGH]** use of eval() — `frontend\scripts\production_review.py`:385
  - _Fix:_ Replace with a secure equivalent.
- **[HIGH]** frontend\Dockerfile: no USER directive (runs as root) — `frontend\Dockerfile`
  - _Fix:_ Add a non-root USER directive.

## phase_1_understanding

**Summary:**

```json
{
  "project_types": [
    "docker",
    "github_ci"
  ],
  "file_count": 497,
  "folder_count": 83,
  "total_bytes": 23661861,
  "todo_markers": 13
}
```
_No issues found in this phase._

## phase_2_code_quality

_No issues found in this phase._

## phase_3_security

- [high] **Possible slack_token in backend\admin_settings.py** — `backend\admin_settings.py`:228
  - Pattern matched at line 228
  - _Suggestion:_ Rotate the credential and move it to a secret manager / .env (gitignored).
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\agent_k.py`:960
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\deals_aggregator.py`:82
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\events_aggregator.py`:156
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\events_aggregator.py`:199
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\events_aggregator.py`:848
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\events_aggregator.py`:1110
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\financial_services.py`:76
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\jobs_feed.py`:61
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend\portals.py`:410
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\app\+html.tsx`:22
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\scripts\production_review.py`:378
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\scripts\production_review.py`:378
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [high] **use of eval()** — `frontend\scripts\production_review.py`:385
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\src\views\web\policy\HtmlRenderer.tsx`:31
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **DOM innerHTML assignment with non-literal** — `frontend\src\views\web\portals\superadmin\views\LexicalEditor.tsx`:35
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **DOM innerHTML assignment with non-literal** — `frontend\src\views\web\portals\superadmin\views\LexicalEditor.tsx`:70
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\src\views\web\tour\TourOverlay.tsx`:140
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend\src\views\web\tour\TourOverlay.tsx`:162
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.

## phase_4_performance

- [low] **Large source file: frontend\package-lock.json (599 KB)** — `frontend\package-lock.json`
  - _Suggestion:_ Consider splitting / code-splitting / lazy loading.

## phase_5_testing

**Summary:**

```json
{
  "test_directories": [
    "tests"
  ],
  "test_files": 47
}
```
_No issues found in this phase._

## phase_6_devops

**Summary:**

```json
{
  "github_workflows": [
    "01-ci.yml",
    "02-docker-build-push.yml",
    "03-deploy.yml",
    "04-security.yml",
    "05-release.yml",
    "06-nightly.yml",
    "07-ai-pr-review.yml"
  ]
}
```
- [high] **frontend\Dockerfile: no USER directive (runs as root)** — `frontend\Dockerfile`
  - _Suggestion:_ Add a non-root USER directive.

## phase_7_database

**Summary:**

```json
{
  "migration_count": 0
}
```
_No issues found in this phase._
