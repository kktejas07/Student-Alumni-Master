/**
 * MODEL LAYER - Entity Type Definitions
 * Pure TypeScript interfaces. No business logic.
 */

export type UserRole = 'student' | 'alumni' | 'mentor' | 'college' | 'admin';
export type CareerPath = 'job' | 'higher_education' | 'startup' | 'business';
export type InstitutionType = 'school' | 'college' | 'university';

export interface SchoolInfo {
  institution_name: string;
  institution_type: InstitutionType;
  class_or_year: string;
  branch_or_stream?: string;
  board_or_university?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  graduation_year?: number;
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
  tags: string[];
  avatar: string;
  bio: string;
  rating: number;
  sessions: number;
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
  };
  featured_courses: Course[];
  featured_deals: Deal[];
  featured_internships: Internship[];
  career_suggestions?: CareerSuggestion | null;
}
