/**
 * Onboarding state store - keeps in-progress onboarding data across screens.
 */
import { create } from 'zustand';
import type { CareerPath, MentorCategory, SchoolInfo } from '@/src/models/entities';

interface OnboardingState {
  school_info: Partial<SchoolInfo>;
  career_path?: CareerPath;
  // Role-specific fields per spec
  student_age?: number;
  student_education_level?: 'plus_one' | 'plus_two' | 'btech' | 'bachelors' | 'masters' | 'phd' | 'other';
  // Mentor-specific fields — 10-category taxonomy (single-select for mentor role)
  mentor_category?: MentorCategory;
  mentor_organization?: string;
  mentor_job_title?: string;
  mentor_linkedin_url?: string;
  mentor_years_of_experience?: number;
  // Per HTML spec — 1:1 session price in INR (revenue-critical).
  mentor_session_price_inr?: number;
  // Alumni-specific fields (per spec — LinkedIn highly recommended; opt-in mentor)
  alumni_employment_status?: 'employed' | 'self_employed' | 'studying' | 'between_jobs';
  alumni_employer?: string;
  alumni_role?: string;
  alumni_linkedin_url?: string;
  alumni_wants_to_mentor?: boolean;
  alumni_mentor_category?: MentorCategory;          // legacy single (kept for back-compat)
  alumni_mentor_categories?: MentorCategory[];      // multi-select (preferred)
  // Student-specific fields (per spec — specific career goal e.g. "Web Developer")
  student_career_goal?: string;
  // Per HTML spec — Academic CGPA (0.0–10.0 scale; optional).
  student_cgpa?: number;
  // Common
  phone?: string;   // E.164 or +91 99999 99999 format — collected for all roles per spec
  interests: string[];
  skills: string[];
  bio: string;
  face_image_base64?: string;
  // Setters
  setSchoolInfo: (patch: Partial<SchoolInfo>) => void;
  setCareerPath: (cp: CareerPath) => void;
  setStudentInfo: (patch: { age?: number; education_level?: any; career_goal?: string; cgpa?: number }) => void;
  setMentorInfo: (patch: any) => void;
  setAlumniInfo: (patch: any) => void;
  setPhone: (v: string) => void;
  setInterests: (v: string[]) => void;
  setSkills: (v: string[]) => void;
  setBio: (v: string) => void;
  setFaceImage: (v?: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  school_info: { country: 'India', institution_type: 'college' },
  career_path: undefined,
  phone: undefined,
  interests: [],
  skills: [],
  bio: '',
  face_image_base64: undefined,
  setSchoolInfo: (patch) => set((s) => ({ school_info: { ...s.school_info, ...patch } })),
  setCareerPath: (cp) => set({ career_path: cp }),
  setStudentInfo: (patch) =>
    set((s) => ({
      student_age: patch.age ?? s.student_age,
      student_education_level: patch.education_level ?? s.student_education_level,
      student_career_goal: patch.career_goal ?? s.student_career_goal,
      student_cgpa: patch.cgpa ?? s.student_cgpa,
    })),
  setMentorInfo: (patch) => set((s) => ({ ...s, ...patch })),
  setAlumniInfo: (patch) => set((s) => ({ ...s, ...patch })),
  setPhone: (v) => set({ phone: v }),
  setInterests: (v) => set({ interests: v }),
  setSkills: (v) => set({ skills: v }),
  setBio: (v) => set({ bio: v }),
  setFaceImage: (v) => set({ face_image_base64: v }),
  reset: () =>
    set({
      school_info: { country: 'India', institution_type: 'college' },
      career_path: undefined,
      student_age: undefined,
      student_education_level: undefined,
      student_career_goal: undefined,
      student_cgpa: undefined,
      mentor_category: undefined,
      mentor_organization: undefined,
      mentor_job_title: undefined,
      mentor_linkedin_url: undefined,
      mentor_years_of_experience: undefined,
      mentor_session_price_inr: undefined,
      alumni_employment_status: undefined,
      alumni_employer: undefined,
      alumni_role: undefined,
      alumni_linkedin_url: undefined,
      alumni_wants_to_mentor: undefined,
      alumni_mentor_category: undefined,
      phone: undefined,
      interests: [],
      skills: [],
      bio: '',
      face_image_base64: undefined,
    }),
}));
