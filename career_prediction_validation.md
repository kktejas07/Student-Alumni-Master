# Career Prediction Validation

## Overview
Validation of all Predictive Career Intelligence calculations, APIs, widgets, and data flow.

---

## 1. Backend Unit Tests

### Module: `backend/core/career_prediction.py`

| Test | Input | Expected | Actual | Status |
|------|-------|----------|--------|--------|
| `compute_predictions` basic | score=62, 5 actions | 7d=75, 30d=92, 90d=100 | 7d=75, 30d=92, 90d=100 | PASS |
| `compute_predictions` cap at 100 | score=95, 2 actions | 7d=100, 90d=100 | 7d=100, 90d=100 | PASS |
| `estimate_placement_readiness` | score=62, scores, profile=70 | returns 3 estimates | internship/placement/interview | PASS |
| `simulate_goal_impact` full | score=62, [RESUME,PROJECT,LINKEDIN] | gain=25, simulated=87 | gain=25, simulated=87 | PASS |
| `simulate_goal_impact` single | score=62, [SKILLS] | gain=5, simulated=67 | gain=5, simulated=67 | PASS |
| `simulate_goal_impact` empty | score=62, [] | gain=0, simulated=62 | gain=0, simulated=62 | PASS |
| `simulate_goal_impact` cap | score=95, [RESUME,PROJECT,MOCK] | simulated=100, gain=5 | simulated=100, gain=5 | PASS |

### Score Prediction Formulas Verified

**7-day prediction:** `current + sum(gains for RESUME, PROFILE, PHOTO, EDUCATION, LINKEDIN)`
- These actions are completable within 7 days (quick profile fixes)
- Example: 62 + 8(RESUME) + 5(LINKEDIN) + 3(PHOTO) = 78

**30-day prediction:** `7d_score + sum(gains for SKILLS, PROJECT, PORTFOLIO, NETWORKING)`
- Medium-effort actions requiring 1-4 weeks
- Example: 78 + 5(SKILLS) + 12(PROJECT) + 7(PORTFOLIO) + 4(NETWORKING) = 100 (capped)

**90-day prediction:** `30d_score + sum(gains for MOCK_INTERVIEW, CERTIFICATION, JOB_APPLICATION)`
- High-effort actions requiring 1-3 months
- Example: 100 + 8 + 6 + 2 = 100 (capped)

### Readiness Estimate Thresholds

| Estimate | Criteria | Weight |
|----------|----------|--------|
| **Internship Ready** | Technical Excellence >= 50 | 30% |
| | Career Preparation >= 40 | 30% |
| | Profile Completion >= 60% | 25% |
| | Personal Brand >= 40 | 15% |
| **Placement Ready** | Technical Excellence >= 60 | 25% |
| | Career Preparation >= 50 | 25% |
| | Profile Completion >= 70% | 20% |
| | Personal Brand >= 50 | 15% |
| | Industry Presence >= 40 | 15% |
| **Interview Ready** | Career Preparation >= 60 | 35% |
| | Technical Excellence >= 50 | 30% |
| | Professional Communication >= 50 | 20% |
| | Leadership & Collaboration >= 40 | 15% |

All thresholds are met when weighted criteria >= 70%.

---

## 2. API Endpoint Validation

### Existing: `GET /api/users/me/skill-intelligence`
- **New fields added:**
  - `predictions.current` (int) — current readiness score
  - `predictions.predictions.7d` — 7-day prediction object
  - `predictions.predictions.30d` — 30-day prediction object
  - `predictions.predictions.90d` — 90-day prediction object
  - `readiness_estimates.internship_readiness` — internship readiness estimate
  - `readiness_estimates.placement_readiness` — placement readiness estimate
  - `readiness_estimates.interview_readiness` — interview readiness estimate
- **Cache:** 5-minute TTL maintained; predictions recomputed on cache miss
- **Error handling:** Failures return empty `{}` with warning log

### NEW: `POST /api/career/predictions`
- **Purpose:** Standalone prediction-only endpoint
- **Returns:** `{ predictions, readiness_estimates }` from same compute
- **Auth:** Students only (403 for other roles)
- **Error handling:** Returns empty data on failure

### NEW: `POST /api/career/simulate`
- **Purpose:** Goal simulator — what-if scoring without DB writes
- **Input:** `{ enabled_actions: ["RESUME", "PROJECT", ...] }`
- **Returns:** `{ current, simulated, total_gain, breakdown[] }`
- **Auth:** Students only
- **Read-only:** No database modifications
- **Error handling:** Returns fallback zero-state on compute failure

### Existing: `GET /api/dashboard/student-summary`
- **New fields added:**
  - `predictions` — same structure as skill-intelligence
  - `readiness_estimates` — same structure as skill-intelligence
- **No breaking changes:** Backward compatible

---

## 3. Frontend Widget Validation

### PredictionTimeline Component
- **File:** `frontend/src/views/web/PredictionTimeline.tsx`
- **Integration points:** StudentDashboardView (after Hero), career-ai.tsx (after Goal Banner)
- **Renders:** 3-column card with 7d/30d/90d predictions + progress bars
- **Empty state:** Returns null if no prediction data
- **Data source:** `skill_intelligence.predictions` from API

### ReadinessEstimates Component
- **File:** `frontend/src/views/web/ReadinessEstimates.tsx`
- **Integration points:** StudentDashboardView (next to predictions), career-ai.tsx (next to predictions)
- **Renders:** 3 estimates with progress bars and met/total criteria
- **Empty state:** Returns null if no estimate data
- **Color coding:** Green=ready, amber=near-ready, accent=needs work

### GoalSimulator Component
- **File:** `frontend/src/views/web/GoalSimulator.tsx`
- **Integration points:** StudentDashboardView (right column), career-ai.tsx (left column)
- **Renders:** Toggle list of 10 action types, current vs simulated score, per-action breakdown
- **API call:** `POST /api/career/simulate` — auto-triggers on toggle change
- **Empty state:** Initial display with "—" for simulated score
- **Read-only guarantee:** "This is a simulation only. No data is saved." label rendered at bottom

---

## 4. Data Flow Verification

```
User Profile Update
    ↓
server.py:get_my_skill_intelligence()
    ↓
compute_predictions(overall_score, ranked_actions)  →  predictions dict
estimate_placement_readiness(overall_score, scores, profile_pct)  →  estimates dict
    ↓
_SKILL_INTEL_CACHE[uid] (5min TTL)
    ↓
Response includes: predictions + readiness_estimates
    ↓
GET /dashboard/student-summary  →  passes through to client
    ↓
StudentDashboardView / career-ai.tsx  →  PredictionTimeline, ReadinessEstimates, GoalSimulator
```

**Simulator flow (read-only):**
```
User toggles "Upload Resume" in GoalSimulator
    ↓
POST /career/simulate { enabled_actions: ["RESUME"] }
    ↓
simulate_goal_impact(current, ["RESUME"], ranked_actions)
    ↓
Returns { current, simulated, total_gain, breakdown }
    ↓
GoalSimulator re-renders with updated values
```

---

## 5. Component Inventory

| Component | File | Lines | Dependencies | Status |
|-----------|------|-------|-------------|--------|
| Prediction backend module | `backend/core/career_prediction.py` | ~145 | None | VALIDATED |
| Backend injection in skill-intel | `backend/server.py:3896-3905` | ~10 | career_prediction | VERIFIED |
| Goal Simulator endpoint | `backend/server.py:3912-3968` | ~57 | get_my_skill_intelligence | VERIFIED |
| Predictions endpoint | `backend/server.py:3970-3986` | ~17 | get_my_skill_intelligence | VERIFIED |
| Dashboard injection | `backend/server.py:7467-7468` | ~2 | intel dict | VERIFIED |
| PredictionTimeline widget | `frontend/src/views/web/PredictionTimeline.tsx` | ~65 | react-native | NO LINT ERRORS |
| ReadinessEstimates widget | `frontend/src/views/web/ReadinessEstimates.tsx` | ~80 | react-native | NO LINT ERRORS |
| GoalSimulator widget | `frontend/src/views/web/GoalSimulator.tsx` | ~160 | API, react-native | NO LINT ERRORS |
| Dashboard integration | `frontend/src/views/web/StudentDashboardView.tsx` | ~3 edits | Pred components | NO LINT ERRORS |
| Career AI integration | `frontend/app/career-ai.tsx` | ~2 edits | Pred components | NO LINT ERRORS |

---

## 6. Final Validation Summary

| Check | Result |
|-------|--------|
| All prediction formulas verified | ✅ PASS |
| All backend unit tests pass | ✅ PASS |
| server.py syntax valid | ✅ PASS |
| No new TypeScript errors introduced | ✅ PASS |
| No existing UI redesign | ✅ PASS (additions only) |
| No mock ML used | ✅ PASS (all real calculations) |
| No fabricated numbers | ✅ PASS (all from existing backend data) |
| Explainable predictions | ✅ PASS (time-based gain accumulation) |
| Goal simulator is read-only | ✅ PASS (no DB writes) |
| Backward compatible | ✅ PASS (new fields only) |
