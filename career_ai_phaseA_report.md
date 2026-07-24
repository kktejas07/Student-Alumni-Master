# Career AI Refactor — Phase A Report

## Objective

Extract the Skill Intelligence module from `backend/server.py` into a dedicated
service under `backend/services/career_ai/`, preserving every API contract,
response shape, cache behaviour, score formula, explanation engine, and
recommendation logic exactly as-is.

---

## Files Created

| File | Purpose |
|---|---|
| `backend/services/career_ai/__init__.py` | Package marker for the `career_ai` service subpackage |
| `backend/services/career_ai/skill_intelligence_service.py` | Canonical Skill Intelligence pipeline — all scoring, caching, categorization, explainability, ranked actions, and the `compute_full_intelligence()` entry point |

## Files Modified

| File | Change |
|---|---|
| `backend/services/career_intelligence_service.py` | Converted to a re‑export shim — imports every public symbol from `career_ai.skill_intelligence_service` and re‑exports through the original module path so all existing importers continue to resolve without edits |

## Files Unchanged

| File | Reason |
|---|---|
| `backend/routers/career_ai.py` | Already imports from `services.career_intelligence_service` — the re‑export shim resolves identically |
| `backend/server.py` | Already imports `compute_full_intelligence`/`invalidate_intel_cache` from the same shim, and already includes the router at lines 6949‑6950 |

---

## Functions Moved

Every function listed below migrated from `services/career_intelligence_service.py`
(originally extracted from `server.py`) into
`services/career_ai/skill_intelligence_service.py`:

### Cache layer
- `invalidate_intel_cache(uid)`
- `_check_cache(uid)` (internal)
- `_store_cache(uid, data)` (internal)

### Skill categorization
- `categorize_skill(skill_name) → (category, weight)`
- `_CATEGORY_KEYWORDS` (keyword map)
- `_CATEGORY_WEIGHTS` (weight map)

### Goal‑weight detection
- `_detect_goal_weights(goal) → (weights_dict, profile_name)`

### 6‑dimension scoring engine
- `_compute_skill_dimensions(...) → (scores_dict, match_data_dict)`

### Action‑impact simulation
- `compute_dynamic_action_impact(...) → impact_dict`
- `_MILESTONE_TYPE_MAP`
- `_ACTION_TITLES`

### Readiness level
- `get_readiness_level(score) → level_str`
- `_get_next_level_info(score) → (next_level, next_threshold)`
- `_LEVEL_THRESHOLDS`

### Score explanations
- `_build_score_explanations(...) → explanations_dict`

### Canonical pipeline
- `compute_full_intelligence(user, uid, db, force_refresh=False) → result_dict`
  - Steps 1‑16: cache check → data gathering → dimension scoring → goal weights
    → overall readiness → recommendation → profile completion → milestone evaluation
    → ranked actions → potential score → analyzed skills → score explanations
    → top‑action recommendation → predictions injection → cache store

---

## Imports Updated

### Legacy module (`services/career_intelligence_service.py`)

```python
# Was: ~640 lines of business logic
# Now: 30‑line re‑export shim
from services.career_ai.skill_intelligence_service import (
    invalidate_intel_cache, compute_full_intelligence, categorize_skill,
    get_readiness_level, compute_dynamic_action_impact,
    _ALL_STANDARD_MILESTONES, _SKILL_INTEL_CACHE, _SKILL_INTEL_TTL_SECS,
    _check_cache, _store_cache, _CATEGORY_KEYWORDS, _CATEGORY_WEIGHTS,
    _LEVEL_THRESHOLDS, _MILESTONE_TYPE_MAP, _ACTION_TITLES,
    _detect_goal_weights, _compute_skill_dimensions,
    _build_score_explanations, _get_next_level_info,
)
```

### No changes required to:
- `backend/routers/career_ai.py` — imports `compute_full_intelligence`, `invalidate_intel_cache` from the shim
- `backend/server.py` — same two imports from the shim + router registration
- `backend/services/career_roadmap_service.py` — imports `_ALL_STANDARD_MILESTONES` from the shim

---

## Regression Results

### Syntax & import verification
```
py_compile services/career_ai/skill_intelligence_service.py  →  PASS
py_compile services/career_intelligence_service.py           →  PASS
py_compile routers/career_ai.py                              →  PASS
Server import with 475 routes                                →  PASS
```

### Endpoint route registration
| Route | Method | Status |
|---|---|---|
| `/api/users/me/skill-intelligence` | GET | Registered |
| `/api/career/simulate` | POST | Registered |
| `/api/career/predictions` | POST | Registered |
| `/api/ai/career-suggestions` | POST | Registered |
| `/api/ai/career-suggestions/cached` | GET | Registered |
| `/api/ai/career-roadmap` | POST | Registered |
| `/api/ai/career-roadmap/milestone/{milestone_id}/complete` | POST | Registered |

### Cross‑module import resolution
```
From services.career_intelligence_service:
  compute_full_intelligence     →  <function>  │  OK
  invalidate_intel_cache        →  <function>  │  OK
  _ALL_STANDARD_MILESTONES      →  10 items    │  OK
From services.career_ai.skill_intelligence_service:
  categorize_skill('python')    →  ('technical_skills', 10)  │  OK
  get_readiness_level(50)       →  'Developing Professional'  │  OK
```

### Test results (known infrastructure limitations)
- Backend tests run with `test_career_platform.py` and `test_events_unit.py`
- Registration tests fail with `429 Rate limit exceeded` (pre‑existing — shared server throttling)
- Downstream tests fail with `401 Invalid token` (pre‑existing — cascades from registration failure)
- **No failures attributable to this refactor**

---

## Risk Assessment

| Risk | Mitigation |
|---|---|
| Existing importers break | Re‑export shim preserves the `services.career_intelligence_service` namespace — zero import changes needed |
| API response shape changes | `compute_full_intelligence()` body is byte‑identical to the original — only the file location changed |
| Cache behaviour changes | `_SKILL_INTEL_CACHE` dict and `_SKILL_INTEL_TTL_SECS` are module‑level globals in the new location; the re‑export shim provides the same symbol references |
| Roadmap/Prediction features affected | Not touched — milestone evaluation (`core.roadmap_engine`), predictions (`core.career_prediction`), and the roadmap router endpoints remain in their original locations |

---

## What Was NOT Touched

- Career Roadmap endpoints & logic
- Career Prediction endpoints & logic
- Career Suggestions (LLM) endpoints & logic
- Daily Brief endpoint & logic
- Student Dashboard endpoint & logic
- Profile service (`services/profile_service.py`)
- Core modules (`core/roadmap_engine.py`, `core/career_prediction.py`, etc.)
- Any frontend code

---

*Generated 2026‑07‑06*
