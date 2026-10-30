# Student Alumni Platform - PRD

## Overview
A React Native (Expo) cross-platform app (iOS / Android / Web) that bridges students, alumni, mentors, and colleges through AI-powered career guidance.

## Brand Identity
- **Brand Name**: Student Alumni
- **Logo**: SA shield (purple gradient)
- **Style**: Glass + Gradient + Purple
- **Palette**: `#5F259F` (Brand), `#3D1468` (Deep), `#7B3DBF` (Mid), `#B07FDF` (Light), `#EDE0F7` (Pale)
- **Typography**: DM Sans (400 / 500 / 600 / 700)

## Tech Stack
- **Frontend**: React Native + Expo SDK 54, TypeScript, Expo Router (file-based routing)
- **Architecture**: MVVM (`models/` → `viewmodels/` → `views/`)
- **State**: Zustand stores + custom hooks
- **Backend**: FastAPI + MongoDB (Motor async)
- **Auth**: JWT (email/password) with bcrypt — Google + LinkedIn OAuth in Phase 2
- **AI**: Claude Sonnet 4.5 via emergentintegrations (Emergent LLM Key)
- **Mobile**: expo-camera, expo-image-picker, expo-linear-gradient, expo-secure-store

## User Roles & Validation Rules
| Role | Required fields | Status flow |
|------|-----------------|-------------|
| **Student** | age (10+), education_level, career_interests, school | Active immediately |
| **Alumni** | graduation_year, university, employment_status | Active immediately |
| **Mentor** | category (IT/HE/Startup/Edu), organization*, job_title*, linkedin_url | **Pending → Approved by admin** |
| **College** | (Tenant admin) | Managed |
| **Admin** | (Platform owner) | Seeded |

## 8 Dashboard Modules (Spec)
1. **Career Guidelines** — latest jobs, internships, AI roadmap (Claude)
2. **Events** — hackathons, workshops, fests, networking meets, with QR registration
3. **Courses** — MIT, Harvard, Coursera, Udemy, edX, Khan Academy, K12 Academy
4. **Networking** — knowledge rooms, mentor & alumni discovery, chat
5. **Financial Services** — education loans + scholarships
6. **Insurance** — medical, bike, travel, loan protection
7. **Housing** — global student accommodation (India / US / Canada)
8. **Deals** — exclusive student coupons (GitHub, Notion, Figma, Spotify, etc.)

## Content Prioritization Logic (per spec)
1. **Interest-based filter**: career_path (Job / HE / Startup / Business) drives content
2. **Education-level segmentation**:
   - Class 11/12 → prioritize Scholarships, Campus Tours
   - University → prioritize Internships, Hackathons, Higher Ed (i20)
3. **Real-time event priority** — events with imminent deadlines surface first
4. **8 modules** visible per role-specific dashboard

## Mentor Booking System
- Mentor discovery (only `mentor_status='approved'` mentors visible)
- Profile with name, title, LinkedIn, ratings, sessions
- Time-slot booking (`POST /api/bookings`)
- Mentor sees own appointments (`GET /api/bookings/me`)

## Multi-Tenant / Admin
- Admin endpoints: `/admin/mentors/pending`, `/approve`, `/reject`
- College/Tenant dashboards in Phase 2

## Backend Endpoints (Tested 29/29 ✅)
- Auth: `/auth/register`, `/login`, `/me`, `/refresh`
- Onboarding: `/users/onboarding`, `/users/me`
- AI: `/ai/career-suggestions`, `/ai/chat`, `/ai/chat/history`
- Catalog: `/catalog/{courses,mentors,internships,events,deals,financial,insurance,housing,resources}`
- Bookings: `/bookings`, `/bookings/me`
- Admin: `/admin/mentors/pending`, `/{id}/approve`, `/{id}/reject`
- Dashboard: `/dashboard`

## Unique ID Format
`SA-{YEAR}-{ROLE}-{6-CHAR}` (e.g., `SA-2026-STU-A7B2X9`) — encoded in QR code

## File Layout (MVVM)
```
frontend/
├── app/                          # Expo Router routes
│   ├── (auth)/                   # login, register
│   ├── (onboarding)/             # role-info, school-info, role-details, career-path, face-capture, success
│   └── (tabs)/                   # index, courses, network, deals, profile
├── src/
│   ├── models/
│   │   ├── entities/             # User, Course, Mentor, Deal, CampusEvent, Resource types
│   │   └── services/             # api.ts (typed HTTP client + token store)
│   ├── viewmodels/
│   │   ├── stores/               # authStore, onboardingStore (Zustand)
│   │   └── hooks/                # useAuth, useDashboard, useCareerSuggestions, useCatalog
│   ├── views/components/         # SALogo, GlassCard, GradientCard, Button, Input, NeoCard, Chip
│   └── theme/                    # Colors, Gradients, Spacing, Radius, Typography
```

## Future Phases
- **Phase 2**: Google + LinkedIn OAuth, Knowledge Rooms (live chat), College/Tenant dashboards
- **Phase 3**: Event registration with QR, automated reminders
- **Phase 4**: Recruiting/ATS module (job posting, candidate pipeline, resume parser)
- **Phase 5**: Real APIs (Coursera, Udemy, Adzuna, Zillow, Stanza Living)
