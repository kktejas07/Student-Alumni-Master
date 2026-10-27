# Careers / Opportunities Module — Implementation Plan

## Executive Summary
This document establishes the architectural blueprint for introducing a **First-Party Careers / Opportunities Module** to the StudentAlumni platform, strictly separated from the existing **External Jobs & Internships Aggregator**.

---

## 1. Existing Jobs & Internships Architecture Audit

| Attribute | Existing System (External Aggregator) | New System (First-Party Careers) |
| :--- | :--- | :--- |
| **Origin / Source** | Third-party job boards via public APIs | StudentAlumni Super Admin team |
| **Purpose** | Broad opportunity aggregation & discovery | Direct hiring / official partner campus openings |
| **Data Storage** | Ephemeral cache (`jobs_cache`) with 1hr TTL | Persistent collections (`career_openings`, `career_applications`) |
| **Backend Code** | `backend/jobs_feed.py`, `backend/integrations_base.py` | Dedicated router `backend/routers/careers.py` |
| **Frontend Location** | Student Portal (`InternshipsView.tsx`, `app/internships.tsx`) | Public `/careers` + Super Admin Portal (`CareersAdminView.tsx`) |
| **Applications** | External URL redirects or click tracking (`job_apply_audit`) | In-app submission, server-side duplicate protection, review workflow |
| **Management** | Automated fetch cron / live endpoint query | Super Admin CRUD, publish/close controls, applicant review |

### Existing External APIs Called
1. **RemoteOK**: `https://remoteok.com/api` (remote software/design roles)
2. **ArbeitNow**: `https://www.arbeitnow.com/api/job-board-api` (European/remote jobs)
3. **The Muse**: `https://www.themuse.com/api/public/jobs` (vetted enterprise jobs)
4. **Remotive**: `https://remotive.com/api/remote-jobs` (remote tech roles)
5. **Jobicy**: `https://jobicy.com/api/v2/remote-jobs` (remote positions)
6. **Adzuna**: `https://api.adzuna.com/v1/api/jobs/in/search` (India internships via `integrations_base.py`)

### Existing Backend Endpoints Preserved Without Change
- `GET /api/jobs/feed`
- `POST /api/jobs/save`
- `POST /api/jobs/unsave`
- `GET /api/jobs/saved`
- `POST /api/jobs/track-apply`
- `GET /api/jobs/trending-companies`
- `GET /api/jobs/new-since-last-visit`

---

## 2. New First-Party Careers Architecture

```text
               SUPER ADMIN
                    │ (Create, Publish, Manage)
                    ▼
          [career_openings] (MongoDB)
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
  PUBLIC VISITOR         LOGGED-IN STUDENT
  Browse /careers       View details & Apply
                                │ (Server-side validation)
                                ▼
                    [career_applications] (MongoDB)
                                │ (Compound unique index)
                                ▼
                    SUPER ADMIN DASHBOARD
               (Review, Status Update, History)
```

---

## 3. Data Models & Database Schemas (MongoDB)

### A. Collection: `career_openings`
Stores first-party opportunities authored by Super Admin.
```json
{
  "_id": "ObjectId",
  "id": "string (uuid/str)",
  "title": "string (required)",
  "company_name": "string (required)",
  "company_logo": "string (optional url)",
  "description": "string (required)",
  "responsibilities": ["string"],
  "requirements": ["string (required)"],
  "skills": ["string"],
  "employment_type": "FULL_TIME | PART_TIME | INTERNSHIP | CONTRACT",
  "work_mode": "REMOTE | HYBRID | ON_SITE",
  "location": "string (required, e.g. 'Bengaluru, India' or 'Remote')",
  "experience_level": "ENTRY | MID | SENIOR | LEAD | ANY",
  "salary_range": "string (optional, e.g. '₹12,00,000 - ₹18,00,000 P.A.' or '₹25,000/mo')",
  "application_deadline": "ISODate (optional)",
  "number_of_openings": "integer (optional, default 1)",
  "status": "DRAFT | PUBLISHED | CLOSED",
  "featured": "boolean (default false)",
  "application_url": "string (optional external redirect)",
  "benefits": ["string"],
  "created_by": "string (superadmin user _id)",
  "created_at": "ISODate",
  "updated_at": "ISODate",
  "published_at": "ISODate (optional)",
  "closed_at": "ISODate (optional)"
}
```

### B. Collection: `career_applications`
Stores candidate applications submitted by authenticated students.
```json
{
  "_id": "ObjectId",
  "id": "string (uuid/str)",
  "career_opening_id": "string (foreign key to career_openings.id)",
  "student_id": "string (user _id)",
  "student_name": "string",
  "student_email": "string",
  "student_phone": "string (optional)",
  "resume_url": "string (optional/student resume ref)",
  "cover_letter": "string (optional)",
  "status": "APPLIED | UNDER_REVIEW | SHORTLISTED | INTERVIEW | SELECTED | REJECTED | WITHDRAWN",
  "admin_notes": "string (internal private notes, NOT exposed to students)",
  "reviewed_at": "ISODate (optional)",
  "reviewed_by": "string (admin user _id, optional)",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

### C. Collection: `career_application_history`
Audit trail of status transitions for each application.
```json
{
  "_id": "ObjectId",
  "application_id": "string",
  "previous_status": "string (optional)",
  "new_status": "string",
  "changed_by": "string (user _id)",
  "changed_at": "ISODate",
  "note": "string (optional)"
}
```

---

## 4. Database Indexes & Constraints

1. **`career_openings`**:
   - `[("status", 1), ("published_at", -1)]` — For public listing queries.
   - `[("featured", -1), ("published_at", -1)]` — For featured sorting.
   - `[("application_deadline", 1)]` — For deadline checking.
   - `[("created_at", -1)]` — For admin sorting.

2. **`career_applications`**:
   - `[("career_opening_id", 1), ("student_id", 1)]` with `unique=True` — **Mandatory server-side duplicate application prevention**.
   - `[("student_id", 1), ("created_at", -1)]` — For student's "My Applications" view.
   - `[("career_opening_id", 1), ("status", 1)]` — For admin filtering.
   - `[("created_at", -1)]` — For admin sorting.

3. **`career_application_history`**:
   - `[("application_id", 1), ("changed_at", -1)]` — For status history timeline.

---

## 5. API Routes Specification

All endpoints mounted under `/api/careers` via `backend/routers/careers.py`.

### Public Endpoints (No Auth Required)
- `GET /api/careers`: Browse published openings.
  - Query params: `search`, `work_mode`, `employment_type`, `experience_level`, `skip`, `limit`.
  - Filters out `status != "PUBLISHED"`.
- `GET /api/careers/{id}`: Detailed view of a single opening.
  - Returns 404 if draft/closed (unless requested by admin).

### Student Endpoints (Authenticated, Student Role)
- `POST /api/careers/{id}/apply`: Apply to a career opening.
  - Verifies: User is logged in, role is student/user, opening exists, is PUBLISHED, deadline has not passed.
  - Atomic insertion with unique index handling to prevent duplicate submission and race conditions.
- `GET /api/careers/student/my-applications`: Fetch all career applications submitted by the logged-in student.
  - Never includes `admin_notes`.
- `GET /api/careers/student/my-applications/{id}`: Fetch single application detail with status history.
- `POST /api/careers/student/my-applications/{id}/withdraw`: Withdraw an active application.

### Super Admin Endpoints (Authenticated, Super Admin Role)
- `GET /api/careers/admin/stats`: Aggregate counts (total, published, draft, closed, total applications).
- `GET /api/careers/admin/openings`: List all openings with admin metadata, counts of applicants, and filters.
- `POST /api/careers/admin/openings`: Create a new opening (draft or published).
- `GET /api/careers/admin/openings/{id}`: Get complete opening details.
- `PUT /api/careers/admin/openings/{id}`: Edit opening details.
- `POST /api/careers/admin/openings/{id}/publish`: Change status to PUBLISHED, stamp `published_at`.
- `POST /api/careers/admin/openings/{id}/close`: Change status to CLOSED, stamp `closed_at`.
- `DELETE /api/careers/admin/openings/{id}`: Delete an opening (only if draft or zero applications).
- `GET /api/careers/admin/applications`: View all applications across openings with pagination and filters.
- `GET /api/careers/admin/applications/{id}`: View candidate application, student profile, status history, admin notes.
- `PATCH /api/careers/admin/applications/{id}/status`: Update status, append status history record, optional internal note.

---

## 6. Frontend Routes & UI Changes

### A. Public Careers Page (`frontend/app/careers.tsx`)
- Accessible to anyone without login.
- Matches Nexus Glow / SA Theme with responsive layout.
- Hero header: "Careers & Direct Opportunities" with badge "First-Party Openings".
- Search bar (role, company, keyword).
- Filter pills: Work Mode (All, Remote, Hybrid, On-site), Employment Type (Full-time, Internship, Contract), Experience Level.
- Opening card: Company logo, title, company name, location badge, work mode pill, compensation badge, deadline notice.
- Detail Modal: Shows full description, responsibilities, requirements, skills tags, benefits.
- Primary CTA: "Apply Now"
  - If unauthenticated: triggers standard SA login flow, redirecting back upon success.
  - If authenticated: opens application sheet with pre-populated student profile data (name, email, phone, existing resume picker/URL, cover letter input).
  - Validation handles already-applied state gracefully.

### B. Landing Page Navbar (`frontend/src/views/web/nexus-glow-landing/Navbar.tsx`)
- Add "Careers" to the navbar menu tabs.
- Smooth navigation to `/careers`.

### C. Super Admin Portal (`frontend/src/views/web/portals/superadmin/`)
- **Sidebar**: Add `Careers` nav item with `Briefcase` icon from `lucide-react-native`.
- **View**: `CareersAdminView.tsx`
  - Stat cards: Total Openings, Published, Drafts, Closed, Total Applications.
  - Openings Tab: Table with Title, Company, Type, Mode, Status, Applications count, Actions (Edit, Publish/Close, View Applicants).
  - Create/Edit Opening Modal: Comprehensive form with required and optional fields.
  - Applications Tab: Table of applicants with candidate name, email, opening title, applied date, status badge.
  - Application Detail Modal: Candidate info, resume link, cover letter, status change dropdown with confirmation, status history timeline, private admin notes input.

### D. Student Portal Integration
- In `frontend/src/views/web/portals/student/views/InternshipsView.tsx`:
  - Preserve the existing external aggregator tabs completely.
  - Provide a clear tab/badge toggle: "Live Job Feed (External)" vs "My First-Party Career Applications".
  - Displays submitted applications with status badges (e.g. Under Review, Shortlisted, Interview) without contaminating the external feed.

---

## 7. Security & Anti-Overengineering (Ponytail Compliance)

1. **Anti-BOLA / IDOR Protection**:
   - All student application endpoints enforce `student_id == current_user["_id"]`.
   - Admin notes are explicitly excluded from student serialization projections (`projection={"admin_notes": 0}`).
   - Admin routes strictly gated with `require_role("admin", "superadmin", "super_admin")`.
2. **Anti-Overengineering**:
   - Zero external libraries or heavy form frameworks introduced.
   - Reuses existing `lucide-react-native` icons (No emojis).
   - Reuses existing AppleKit & SAC design tokens for Super Admin.
   - Clean, standard Pydantic schemas and Motor queries.

---

## 8. Exact Files Expected to Change

### New Files
1. `backend/routers/careers.py` — Dedicated backend router for Careers & Applications.
2. `backend/tests/test_careers.py` — Unit tests for Careers module.
3. `frontend/app/careers.tsx` — Public Careers page.
4. `frontend/src/views/web/portals/superadmin/views/CareersAdminView.tsx` — Super Admin Career management view.
5. `docs/CAREERS_MODULE_IMPLEMENTATION_PLAN.md` — This comprehensive plan.

### Modified Files
1. `backend/server.py` — Mount `careers_router` under `api_router`.
2. `frontend/src/views/web/nexus-glow-landing/Navbar.tsx` — Add "Careers" navigation item.
3. `frontend/src/views/web/portals/superadmin/Sidebar.tsx` — Add "Careers" to `SuperAdminNavId` and `NAV`.
4. `frontend/src/views/web/portals/superadmin/SuperAdminPortalRN.tsx` — Add active tab rendering for `'careers'`.
5. `frontend/src/views/web/portals/student/views/InternshipsView.tsx` — Add tab/section to view First-Party Career Applications without altering external feed.

---

## 9. Verification & Testing Plan
1. **Preservation of Existing Systems**:
   - Verify `GET /api/jobs/feed` continues to fetch from external APIs and returns active external jobs.
   - Verify `InternshipsView` loads external jobs/internships properly.
2. **New Careers Public Page**:
   - Verify unauthenticated visitor can browse published openings.
   - Verify draft and closed openings do not appear to the public.
3. **Application & Duplicate Protection**:
   - Test application submission with valid student token.
   - Test duplicate submission; confirm HTTP 409 and error message "You have already applied to this opportunity."
   - Test server-side validation when opening is closed or deadline passed.
4. **Super Admin Capabilities**:
   - Create draft opening, publish opening, edit opening, close opening.
   - View applications, filter by opening and status.
   - Update application status, verify status history audit record is created.
   - Add private admin notes; verify they are never returned to the student.
