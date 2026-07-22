# Career Prediction Audit

## Overview
Complete trace of every calculation, API, backend function, Mongo collection, cache, and mathematical formula involved in the existing career intelligence system.

---

## 1. Readiness Score

### API Endpoint
- `GET /api/users/me/skill-intelligence` → returns `readiness_score` (object with `score`, `level`, `next_level`, `next_threshold`)
- `GET /api/dashboard/student-summary` → bundles the above via `skill_intelligence.readiness_score`

### Backend Function
`server.py:3451-3896` — `get_my_skill_intelligence(user)`

### Mathematical Formula
```
overall_score = (
  tech_score    * weights["Technical Excellence"] +
  comm_score    * weights["Professional Communication"] +
  brand_score   * weights["Personal Brand"] +
  lead_score    * weights["Leadership & Collaboration"] +
  prep_score    * weights["Career Preparation"] +
  industry_score * weights["Industry Presence"]
)
overall_score = min(100, max(20, round(overall_score)))
```

#### Sub-scores (all 0-100, min/max clamped):
- **Technical Excellence**: `35 + (matched_tech * 10) + (15 if projects>0) + (15 if github)` — keywords in skills[]
- **Professional Communication**: `40 + (matched_comm * 15)` — communication keywords
- **Personal Brand**: `20 + (25 if resume) + (25 if portfolio) + (15 if linkedin) + (15 if github)`
- **Leadership & Collaboration**: `40 + (matched_lead * 20)` — leadership keywords
- **Career Preparation**: `35 + (matched_prep * 15) + (20 if bookings>0)` — DSA/interview keywords
- **Industry Presence**: `30 + min(40, connections*10) + (15 if certs>0)`

#### Goal-based weights (4 profiles):
| Goal Type | Technical | Communication | Brand | Leadership | Career Prep | Industry |
|-----------|-----------|---------------|-------|------------|-------------|----------|
| Technical Engineer | 0.40 | 0.10 | 0.15 | 0.05 | 0.25 | 0.05 |
| PM/Business Analyst | 0.10 | 0.25 | 0.10 | 0.25 | 0.20 | 0.10 |
| Creative Designer | 0.20 | 0.20 | 0.30 | 0.10 | 0.10 | 0.10 |
| Default Professional | 0.25 | 0.15 | 0.20 | 0.15 | 0.15 | 0.10 |

### Level Mapping
| Score Range | Level |
|-------------|-------|
| 0-20 | Explorer |
| 21-40 | Builder |
| 41-60 | Developing Professional |
| 61-80 | Career Ready |
| 81-100 | Industry Ready |

### Data Sources
- `users` collection: `skills[]`, `projects[]`, `resume_documents[]`, `github_url`, `linkedin_url`, `portfolio_url`, `certificates[]`
- `connections` collection: count of accepted connections
- `bookings` collection: count of bookings where `student_id = uid`
- `career_roadmaps` collection: `target_role` for goal detection

### Cache
In-memory dict `_SKILL_INTEL_CACHE[uid]` with TTL of 5 minutes (300 seconds). Invalidated on profile changes.

---

## 2. Potential Score

### API Endpoint
- `GET /api/users/me/skill-intelligence` → returns `potential_score` (int 0-100)

### Backend Function
`server.py:3728-3736` — inline calculation at end of `get_my_skill_intelligence`

### Mathematical Formula
```
remaining_gains = sum(gain for all unique ranked_actions)
potential_score = min(100, overall_score + remaining_gains)
readiness_gap = potential_score - overall_score
```

### Logic
If `overall_score >= 100`, potential = 100. Otherwise potential is current + sum of all pending action gains (capped at 100).

---

## 3. Profile Completion

### API Endpoint
- `GET /api/users/me/completion` → returns `{ percentage, items[] }`

### Backend Function
`server.py:3042-3064` — `_compute_profile_completion(u)`

### Mathematical Formula
```
items = [
  {key:"skills",     weight:25, done: len(skills) > 0},
  {key:"resume",     weight:20, done: resume_documents or resume_url or resume_data},
  {key:"projects",   weight:20, done: len(projects) > 0},
  {key:"socials",    weight:15, done: linkedin_url or github_url},
  {key:"education",  weight:10, done: institution && branch},
  {key:"bio",        weight: 5, done: bio or headline},
  {key:"photo",      weight: 5, done: face_image_base64 or photo_data},
]
percentage = sum(weight for each done item)  // range 0-100
```

### Data Sources
- `users` collection: all fields listed above

---

## 4. Career Journey / Roadmap

### API Endpoints
- `POST /api/ai/career-roadmap` → generates LLM-based roadmap with milestones
- `GET /api/dashboard/student-summary` → returns `career_roadmap` summary from cache

### Backend Functions
- `server.py:7053-7076` — `_get_roadmap_summary()` for dashboard
- `core/roadmap_engine.py` — `evaluate_roadmap_milestones(user, milestones, db)`
- `core/roadmap_evaluator.py` — `evaluate_roadmap_progress(user_id)`

### Formula (Progress %)
```
progress_pct = round(len(completed_milestones) / len(total_milestones) * 100)
```

### Milestone Types
RESUME, PROJECT, PROFILE, NETWORKING, SKILLS, MOCK_INTERVIEW, PORTFOLIO, CERTIFICATION, JOB_APPLICATION, LINKEDIN

### Data Sources
- `career_roadmaps` collection: `milestones[]`, `weekly_plan[]`, `target_role`
- `users` collection: auto-evaluation against user fields
- `connections`, `bookings`, `applications` collections: for dynamic milestone evaluation

---

## 5. Skill Scores

### API Endpoint
- `GET /api/users/me/skill-intelligence` → returns `skill_scores` dict with 6 categories

### Backend Functions (dual system)

#### Primary: `server.py:3497-3540` — inline keyword-based scoring
Uses keyword matching against user's `skills[]` array. See Readiness Score section for formulas.

#### Secondary: `core/skill_score_engine.py` — `calculate_skill_scores(user_id)`
```
earned_points[category] += weight * confidence  // from user_skill_categories
normalized[category] = min(100, max(0, round(earned_points / CATEGORY_TARGETS[category] * 100)))
```

### Category Targets
| Category | Target |
|----------|--------|
| Technical Excellence | 100 |
| Professional Communication | 50 |
| Personal Brand | 50 |
| Leadership & Collaboration | 60 |
| Career Preparation | 50 |
| Industry Presence | 40 |

### Data Sources
- `users` collection: `skills[]` array
- `user_skill_categories` collection: categorized skills with weights and confidence

---

## 6. Recommendations / Ranked Actions

### API Endpoint
- `GET /api/users/me/skill-intelligence` → returns `ranked_actions[]`

### Backend Function
`server.py:3656-3726` — creates deduplicated, sorted action list

### Generation Logic
1. Collect all pending roadmap milestones as actions
2. Collect all incomplete profile completion items as actions
3. Compute dynamic impact for each via `_compute_dynamic_action_impact()`
4. Deduplicate by `type`
5. Sort by `gain` descending
6. Return top 4

### Dynamic Impact Formula (`server.py:3289-3365`)
Each milestone type has a base gain calculated from weights + bonus:

| Type | Base Gain Formula | Range |
|------|------------------|-------|
| RESUME | `round(25 * w_brand) + (3 if brand < 50 else 0)` | 5-15 |
| PROJECT | `round(15 * w_tech) + int((100-tech)*0.15 if tech<60)` | 6-20 |
| SKILLS | `int((100-score)*0.12) if skills<3 else int((100-score)*0.08)` | 3-12 |
| MOCK_INTERVIEW | `round(20 * w_prep) + (4 if prep<50)` | 6-15 |
| PORTFOLIO | `round(25 * w_brand) + (3 if brand < 50)` | 6-15 |
| LINKEDIN | `round(15 * w_brand) + 2` | 5-10 |
| NETWORKING | `round(15 * w_industry) + (4 if connections=0)` | 4-12 |
| CERTIFICATION | `round(15 * w_industry) + (4 if industry<50)` | 6-14 |
| JOB_APPLICATION | `int((100-score)*0.08)` | 4-10 |
| EDUCATION | `int((100-score)*0.05)` | 3-6 |
| PHOTO | 3 (fixed) | 3 |
| PROFILE/bio | `int((100-score)*0.06)` | 3-8 |

### Data Sources
- Same as Readiness Score + Profile Completion + Roadmap Milestones

---

## 7. Roadmap Progress

### API Endpoints
- `POST /api/ai/career-roadmap` — full roadmap with milestones
- `GET /api/dashboard/student-summary` → `career_roadmap.progress_pct`

### Backend Functions
- `core/roadmap_evaluator.py:evaluate_roadmap_progress()` — dynamic evaluation with persistence
- `core/roadmap_engine.py:evaluate_roadmap_milestones()` — stateless evaluation

### Data Sources
- `career_roadmaps` collection
- `users`, `connections`, `bookings`, `applications` collections

### Cache
Results cached in `career_roadmaps` document (milestones + milestone_completed indices). No in-memory TTL cache.

---

## Mongo Collections Summary

| Collection | Used For | Updated By |
|-----------|----------|------------|
| `users` | All profile data, skills, projects, resumes | User profile updates |
| `user_skill_categories` | Categorized skills with weights | Skill scoring pipeline |
| `career_roadmaps` | Roadmap milestones and progress | AI roadmap generation |
| `connections` | Network connections count | Network operations |
| `bookings` | Mentor session bookings | Booking operations |
| `applications` | Job/internship applications | Application operations |
| `user_career_snapshots` | Historical readiness snapshots | `snapshot_career_readiness()` |

---

## Cache Summary

| Cache | Type | Location | TTL | Invalidation |
|-------|------|----------|-----|-------------|
| `_SKILL_INTEL_CACHE` | In-memory dict | `server.py` | 300s | On profile update, resume upload |
| `career_roadmaps` | MongoDB document | `career_roadmaps` collection | N/A (persistent) | Roadmap regeneration |
| `skill_taxonomy_cache` | MongoDB collection | `skill_taxonomy_cache` | N/A (persistent) | Manual refresh |

---

## Existing Prediction Gaps

1. **No time-based predictions** — All scores are current-state only
2. **No trend analysis** — No historical comparison or trajectory
3. **No readiness estimations** — No "when will I be ready for X"
4. **No goal simulation** — No what-if scenario modeling
5. **No explainable timelines** — Cannot answer "how long until I'm Career Ready?"
