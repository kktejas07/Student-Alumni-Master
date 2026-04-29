# Student Alumni Platform - PRD

## Overview
A comprehensive React Native (Expo) mobile-first cross-platform app (iOS/Android/Web) that bridges students, alumni, mentors, and colleges. Provides AI-powered career guidance based on user-selected career paths during registration.

## Brand Identity
- **Brand Name**: Student Alumni
- **Logo**: SA shield (purple gradient)
- **Style**: Glass + Gradient + Purple
- **Primary Palette**: 
  - Brand Purple `#5F259F`
  - Deep Purple `#3D1468`
  - Mid Purple `#7B3DBF`
  - Light Purple `#B07FDF`
  - Pale Purple `#EDE0F7`
- **Typography**: DM Sans (400, 500, 600, 700)

## Tech Stack
- **Frontend**: React Native + Expo SDK 54, TypeScript, Expo Router (file-based routing)
- **Architecture**: MVVM (Models - ViewModels - Views)
- **State**: Zustand stores + custom hooks
- **Data Fetching**: Custom typed `api` service layer
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Authentication**: JWT (email/password) with bcrypt; Google + LinkedIn OAuth (later phases)
- **AI**: Claude Sonnet 4.5 via emergentintegrations (Emergent LLM Key)
- **Mobile**: expo-camera, expo-image-picker, expo-linear-gradient, expo-secure-store
- **Forms**: react-hook-form + zod (where needed)

## Core User Roles
1. **Student** (Class 11+ / Grade +1 onwards)
2. **Alumni** (graduated from a college/school)
3. **Mentor** (industry / faculty professionals)
4. **College / Tenant** (institution admins)

## Phase 1 Features (Current)
### Authentication & Onboarding
- Email/password registration & login (JWT)
- Multi-role registration with role-specific fields
- Class 11+ validation for students
- Complete school/college info capture
- Face registration via camera
- **Unique ID generation** (e.g., `SCD-2026-XXXXXX`)
- **QR code generation** containing unique ID
- Career path selection: Job / Higher Education / Startup / Business

### Career Path Engine
- AI-powered personalized career suggestions (Claude)
- Education-level appropriate recommendations
- Roadmap with milestones based on chosen path

### Dashboard (Role-specific)
- Student dashboard: career roadmap, courses, mentors, deals
- Alumni dashboard: networking, mentorship offers
- Mentor dashboard: mentee management
- College dashboard: institutional overview

### AI Chatbot Assistant
- Real-time career queries
- Personalized suggestions
- Course/mentor recommendations

### Placeholder Modules (Phase 2+)
- Courses (Coursera, Udemy, edX, YouTube, Khan Academy APIs)
- Mentor & Alumni networking
- Internships (LinkedIn, Indeed, RemoteOK, AngelList)
- Student Resources (insurance, housing, loans)
- **Deals & Coupons** (exclusive student offers)

## MVVM Folder Structure
```
frontend/
├── app/                          # Expo Router routes
│   ├── (auth)/                   # Auth flow
│   ├── (onboarding)/             # Onboarding flow
│   └── (tabs)/                   # Main app tabs
├── src/
│   ├── models/
│   │   ├── entities/             # User, Student, CareerPath, Course, Deal types
│   │   ├── services/             # API clients (auth, user, ai, course, deal)
│   │   └── types/                # DTOs, enums
│   ├── viewmodels/
│   │   ├── stores/               # Zustand stores
│   │   └── hooks/                # Business-logic hooks
│   ├── views/
│   │   └── components/           # Reusable UI components
│   ├── theme/                    # Design tokens (colors, typography, spacing)
│   └── utils/                    # Helpers, constants, validators
```

## Future Phases
- **Phase 2**: Course APIs, Mentor matching, Alumni directory
- **Phase 3**: Internship listings, Student resources (insurance/housing/loans)
- **Phase 4**: Deals/Coupons platform with exclusive student offers
- **Phase 5**: Recruitment/ATS module (full job posting + candidate pipeline)
- **Phase 6**: Google + LinkedIn OAuth, advanced AI features (resume parser, interview prep)
