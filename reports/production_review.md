# Production Readiness Report

_Generated 2026-05-17T19:32:16.373718+00:00_

**Project root:** `/Users/avks/Desktop/Student Alumni/Student-Alumni-Master`  
**Project types:** docker, github_ci

## Scores

| Area | Score / 100 |
|------|-------------|
| overall | **0** |
| security | **0** |
| performance | **99** |
| maintainability | **100** |
| testing | **100** |
| deployment | **100** |
| database | **100** |

## Issue counts by severity

| Severity | Count |
|----------|-------|
| critical | 0 |
| high | 0 |
| medium | 34 |
| low | 1 |
| info | 0 |

## Blockers (0)

_None._

## phase_1_understanding

**Summary:**

```json
{
  "project_types": [
    "docker",
    "github_ci"
  ],
  "file_count": 501,
  "folder_count": 86,
  "total_bytes": 23511414,
  "todo_markers": 13
}
```
_No issues found in this phase._

## phase_2_code_quality

_No issues found in this phase._

## phase_3_security

- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend/app/+html.tsx`:22
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend/scripts/production_review.py`:378
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend/scripts/production_review.py`:378
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend/src/views/web/tour/TourOverlay.tsx`:141
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `frontend/src/views/web/tour/TourOverlay.tsx`:168
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/deals_aggregator.py`:82
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/jobs_feed.py`:61
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/agent_k.py`:960
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/events_aggregator.py`:156
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/events_aggregator.py`:199
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/events_aggregator.py`:848
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/events_aggregator.py`:1110
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/portals.py`:410
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **use of MD5 (insecure for passwords/secrets)** — `backend/financial_services.py`:76
  - _Suggestion:_ Replace with a secure equivalent.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:53
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:63
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:73
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:83
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:93
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:203
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:213
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:223
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:233
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:243
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:253
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:263
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:273
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:283
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:293
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:303
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:313
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:323
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:333
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.
- [medium] **React dangerouslySetInnerHTML – verify sanitization** — `reports/production_review.json`:343
  - _Suggestion:_ Sanitize untrusted input (DOMPurify, htmlspecialchars, etc.) before rendering.

## phase_4_performance

- [low] **Large source file: frontend/package-lock.json (584 KB)** — `frontend/package-lock.json`
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
    "05-release.yml",
    "03-deploy.yml",
    "06-nightly.yml",
    "02-docker-build-push.yml",
    "07-ai-pr-review.yml",
    "01-ci.yml",
    "04-security.yml"
  ]
}
```
_No issues found in this phase._

## phase_7_database

**Summary:**

```json
{
  "migration_count": 0
}
```
_No issues found in this phase._
