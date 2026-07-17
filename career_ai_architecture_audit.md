# Career AI Architecture Audit

## File Analyzed
- `backend/server.py` — 8119 lines
- `backend/core/career_intelligence.py` — 229 lines
- `backend/core/skill_score_engine.py` — 58 lines
- `backend/core/skill_analytics.py` — 46 lines (contains BUG)
- `backend/core/skill_recommendations.py` — 70 lines (dead code)
- `backend/core/roadmap_engine.py` — 83 lines
- `backend/core/roadmap_evaluator.py` — 89 lines (dead code)
- `backend/core/career_prediction.py` — 182 lines
- `backend/career_intel.py` — 133 lines (mocked adapters)

---

## 1. Current Architecture

```
server.py (8119 lines — monolithic)
├── Auth & User CRUD (~3000 lines)
├── Career AI Logic (~2500 lines, interspersed)
│   ├── get_my_skill_intelligence()       [457 lines — L3454-L3910]
│   ├── _compute_profile_completion()     [23 lines — L3045-L3067]
│   ├── _compute_dynamic_action_impact()  [77 lines — L3292-L3368]
│   ├── _enhance_roadmap_milestones()     [81 lines — L3371-L3451]
│   ├── _categorize_skill()               [25 lines — L3191-L3215]
│   ├── _roadmap_is_stale()               [19 lines — L5135-L5153]
│   ├── get_claude_chat()                 [45 lines — L4998-L5042]
│   ├── GAINS dict                        [14 lines — L3659-L3672, DEAD]
│   ├── _ALL_STANDARD_MILESTONES          [12 lines — L3280-L3291]
│   └── _SKILL_INTEL_CACHE                [3 lines — L3275-L3277]
├── Mentor/Booking Logic
├── Network Logic
├── Admin Logic
├── Catalog / Marketplace Logic
└── External Integrations
```

**All Career AI endpoints live inline in server.py with mixed responsibilities:**
- `GET /users/me/completion` (L3070)
- `GET /users/me/stats` (L3078)
- `POST /users/me/skills` (L3218)
- `DELETE /users/me/skills/{skill_name}` (L3263)
- `GET /users/me/skill-intelligence` (L3454)
- `POST /career/simulate` (L3916)
- `POST /career/predictions` (L3957)
- `POST /ai/career-suggestions` (L5043)
- `GET /ai/career-suggestions/cached` (L5121)
- `POST /ai/career-roadmap` (L5156)
- `POST /ai/career-roadmap/milestone/{id}/complete` (L5366)
- `POST /ai/daily-brief` (L5443)
- `POST /ai/chat` (L5557)
- `GET /ai/chat/history` (L5584)
- `POST /ai/generate-bio` (L5596)
- `GET /dashboard/student-summary` (L7043)

---

## 2. Problems

### P1: Monolithic server.py (8119 lines)
- 25% of the file is Career AI logic (~2000 lines)
- Single Responsibility Violation: server.py handles auth, user CRUD, AI scoring, bookings, networking, admin, catalog, etc.
- 15+ Career AI endpoints, 6 helper functions, 3 caches, all inline
- No separation between routing, business logic, and data access

### P2: Duplicate Scoring Engines (CRITICAL)
| Scoring Engine | Location | Production Usage | Algorithm |
|---------------|----------|-----------------|-----------|
| `calculate_career_readiness` | `career_intelligence.py:42` | **None** (dead code) | skill_score_engine + equal-weighted profile |
| `get_my_skill_intelligence` | `server.py:3454` | **Primary** (live) | Inline keyword-based + weighted profile |
| Result | **Two completely different readiness scores** for the same user | | |

### P3: Duplicate Skill Scoring

| Function | File | Data Source | Algorithm | Production? |
|----------|------|-------------|-----------|-------------|
| `calculate_skill_scores` | `skill_score_engine.py:18` | `user_skill_categories` | `weight*confidence / target` | No (only dead code paths) |
| Inline scoring | `server.py:3500-3543` | `user.skills[]` | Keyword matching + profile signals | **YES** — main production path |

### P4: Duplicate Profile Completion (5 implementations!)

| # | File | Fields Checked | Weighting | Production? |
|---|------|---------------|-----------|-------------|
| 1 | `career_intelligence.py:88-91` | 7 basic fields | Equal | No (dead) |
| 2 | `server.py:3045-3067` | 7 weighted items | Skills=25, Resume=20, etc. | **YES** |
| 3 | `roadmap_evaluator.py:35-37` | Same 7 fields as #1 | Equal | No (dead) |
| 4 | `portals.py:976` | Skills + photo | Custom formula | Yes (portal dashboards) |
| 5 | `tier_logic.py:82-91` | Photo, github, projects, etc. | Max 20 pts to tier | Yes (tier computation) |

### P5: Duplicate Roadmap Evaluation

| Function | File | Milestones Field | DB Writes? | Production? |
|----------|------|-----------------|-----------|-------------|
| `evaluate_roadmap_milestones` | `roadmap_engine.py:17` | `milestones[]` | No | **YES** (4 call sites) |
| `evaluate_roadmap_progress` | `roadmap_evaluator.py:7` | `weekly_plan[]` | Yes | **No** (dead/migration) |

### P6: Dead Code
| Function | File | Lines | Status |
|----------|------|-------|--------|
| `calculate_career_readiness` | `career_intelligence.py` | 103 | Unused in production |
| `detect_career_path` | `career_intelligence.py` | 70 | Unused in production |
| `snapshot_career_readiness` | `career_intelligence.py` | 13 | Unused in production |
| `generate_skill_analytics` | `skill_analytics.py` | 36 | BROKEN (missing import) |
| `generate_skill_recommendations` | `skill_recommendations.py` | 64 | Unused in production |
| `evaluate_roadmap_progress` | `roadmap_evaluator.py` | 83 | Unused in production |
| `GAINS` dict | `server.py:3659-3672` | 14 | Defined but never referenced |

### P7: Bugs
| Bug | File | Line | Impact |
|-----|------|------|--------|
| Missing import in `skill_analytics.py` | `skill_analytics.py` | 16 | `generate_skill_analytics` will crash at runtime with `NameError` |
| Missing logger in `career_intelligence.py` | `career_intelligence.py` | 143 | Exception handler will crash with `NameError` |
| Inconsistent milestone type casing | Multiple | Various | Same milestone may evaluate differently across engines |

### P8: Cache Design Issues
- `_SKILL_INTEL_CACHE` is an unbounded in-memory dict (memory leak risk)
- No eviction policy (LRU, TTL sweep, or max size)
- 11 invalidation points scattered across 5+ endpoints

### P9: Dynamic Imports
- `evaluate_roadmap_milestones` imported inside 3 different function bodies
- `emergentintegrations.llm.chat` imported inside 5 different function bodies
- Import errors surface at runtime, not at startup

---

## 3. Dependency Graph (Current)

```
server.py
│
├──→ core/roadmap_engine.py
│     └── evaluate_roadmap_milestones()
│
├──→ core/career_prediction.py
│     ├── compute_predictions()
│     ├── estimate_placement_readiness()
│     └── simulate_goal_impact()
│
├──→ [inline] _compute_profile_completion()
├──→ [inline] _compute_dynamic_action_impact()
├──→ [inline] _categorize_skill()
├──→ [inline] _enhance_roadmap_milestones_with_context()
├──→ [inline] _roadmap_is_stale()
├──→ [inline] get_claude_chat()
│
├──→ db.users, db.connections, db.bookings, db.applications
├──→ db.career_roadmaps, db.career_suggestions
├──→ db.mentor_sessions, db.activity_events
│
└──→ (ORPHANED) career_intelligence.py → skill_score_engine.py
                                          └→ skill_analytics.py (BROKEN)
                                               └→ skill_recommendations.py
```

---

## 4. Single Responsibility Violations

| Function | Lines | Responsibilities |
|----------|-------|-----------------|
| `get_my_skill_intelligence` | 457 | Scoring (6 categories), goal detection, profile completion, milestone evaluation, action impact, potential calc, skill analysis, score explanations, predictions, caching |
| `student_dashboard_summary` | 433 | Intelligence fetching, profile completion, stats, roadmap, featured content, coaching data, insights, activity wins, predictions, notification count |
| `ai_career_roadmap` | 204 | Cache checking, stale detection, milestone merging, LLM calling, profile enrichment, response parsing, fallback generation, DB persistence |

---

## 5. Large File Analysis (server.py)

| Section | Lines | % of File |
|---------|-------|-----------|
| Imports & Setup | 130 | 1.6% |
| Auth (register, login, OAuth, 2FA, etc.) | ~1200 | ~15% |
| User CRUD (profile, skills, resume, etc.) | ~1200 | ~15% |
| **Career AI (scoring, roadmaps, chat, briefs, etc.)** | **~2000** | **~25%** |
| Mentor / Booking | ~600 | ~7% |
| Network | ~500 | ~6% |
| Admin | ~1000 | ~12% |
| Catalog / Marketplace | ~1000 | ~12% |
| Dashboard | ~500 | ~6% |
| Health / Other | ~89 | ~1% |

---

## 6. Future Scalability Problems

1. **No cache eviction**: `_SKILL_INTEL_CACHE` grows unbounded with active users
2. **No background refresh**: Cache is populated synchronously on first request
3. **No skill scoring standardization**: Two engines produce different scores
4. **No profile completion standardization**: 5 implementations give 5 different answers
5. **No prediction persistence**: Predictions are re-computed every 5 minutes; no history or trend
6. **No read-replica awareness**: All DB queries go to primary
7. **No structured logging**: Print-based tracing in roadmap/brief endpoints
8. **Mock-dependent AI**: Without `EMERGENT_LLM_KEY`, all AI endpoints return hardcoded data
