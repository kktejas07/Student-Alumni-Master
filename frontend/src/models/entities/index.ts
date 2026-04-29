/**
 * MODEL LAYER - Entity Type Definitions
 * Pure TypeScript interfaces for the Student Alumni platform.
 * No business logic — this layer ONLY defines data shapes.
 */

// 5 user types — students/alumni/mentors register publicly,
// college/admin are managed accounts.
export type UserRole = 'student' | 'alumni' | 'mentor' | 'college' | 'admin';

// 4 career paths drive ALL personalization on the platform.
export type CareerPath = 'job' | 'higher_education' | 'startup' | 'business';

// Education levels per spec — used for content segmentation.
// (Class 11/12 students see scholarships + campus tours,
//  university students see internships + hackathons.)
export type EducationLevel =
  | 'plus_one'   // Class 11
  | 'plus_two'   // Class 12
  | 'btech'      // Engineering UG
  | 'bachelors'  // Other UG
  | 'masters'
  | 'phd'
  | 'other';

// Mentors must select 1 specialization; students filter mentors by these.
export type MentorCategory =
  | 'it_software'
  | 'higher_education'
  | 'startup_business'
  | 'education';

// Mentor accounts go through admin review before being visible to students.
export type MentorStatus = 'pending' | 'approved' | 'rejected';

export type InstitutionType = 'school' | 'college' | 'university';

export interface SchoolInfo {
  institution_name: string;
  institution_type: InstitutionType;
  class_or_year: string;
  degree?: string;             // e.g., B.Tech, B.Sc, MBA, PhD
  branch_or_stream?: string;
  board_or_university?: string;
  city?: string;
  state?: string;
  country?: string;
  graduation_year?: number;    // Pass-out year for alumni/mentor
}

/** Student-only profile fields (collected during onboarding). */
export interface StudentInfo {
  age: number;                 // Spec: minimum age 10+
  education_level: EducationLevel;
  career_interests: string[];
}

/** Alumni-only profile fields. */
export interface AlumniInfo {
  graduation_year: number;
  university: string;
  current_employer?: string;
  current_role?: string;
  employment_status: 'employed' | 'self_employed' | 'studying' | 'between_jobs';
}

/** Mentor-only profile fields. Account requires admin approval. */
export interface MentorInfo {
  category: MentorCategory;
  organization: string;     // Mandatory
  job_title: string;        // Mandatory
  linkedin_url?: string;    // Highly recommended for credibility
  years_of_experience?: number;
  bio?: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  unique_id?: string;
  qr_code_base64?: string;
  school_info?: SchoolInfo;
  career_path?: CareerPath;
  student_info?: StudentInfo;
  alumni_info?: AlumniInfo;
  mentor_info?: MentorInfo;
  mentor_status?: MentorStatus;
  interests: string[];
  skills: string[];
  bio?: string;
  face_image_base64?: string;
  onboarding_completed: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface CareerSuggestion {
  summary: string;
  milestones: { title: string; timeframe: string; actions: string[] }[];
  recommended_skills: string[];
  recommended_courses: string[];
  mentor_traits: string[];
  career_path?: CareerPath;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  url: string;
  image: string;
  duration: string;
  level: string;
  is_free: boolean;
  career_paths: CareerPath[];
}

export interface Mentor {
  id: string;
  full_name: string;
  title: string;
  expertise: CareerPath[];
  category?: MentorCategory;
  tags: string[];
  avatar: string;
  bio: string;
  rating: number;
  sessions: number;
  linkedin_url?: string;
}

export interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  stipend: string;
  duration: string;
  skills: string[];
  url: string;
  image: string;
  career_paths: CareerPath[];
}

export interface Deal {
  id: string;
  title: string;
  brand: string;
  category: string;
  discount: string;
  code: string;
  expires: string;
  image: string;
  url: string;
}

/** Hackathons, workshops, fests, networking meets. */
export interface CampusEvent {
  id: string;
  title: string;
  category: 'hackathon' | 'workshop' | 'fest' | 'networking' | 'startup' | 'campus_tour';
  organizer: string;
  image: string;
  venue: string;
  start_date: string;
  registration_deadline: string;
  url: string;
  tags: string[];
}

export interface Resource {
  id: string;
  category: 'insurance' | 'housing' | 'loans';
  title: string;
  provider: string;
  description: string;
  url: string;
  highlight: string;
}

export interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

export interface DashboardData {
  user: User;
  stats: {
    courses_available: number;
    mentors_available: number;
    internships_available: number;
    deals_available: number;
    events_available?: number;
  };
  featured_courses: Course[];
  featured_deals: Deal[];
  featured_internships: Internship[];
  featured_events?: CampusEvent[];
  career_suggestions?: CareerSuggestion | null;
  personalization?: {
    career_path?: CareerPath;
    education_level?: EducationLevel;
    is_school_student: boolean;
    priority_modules: string[];
  };
}
