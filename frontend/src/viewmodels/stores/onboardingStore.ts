/**
 * Onboarding state store - keeps in-progress onboarding data across screens.
 */
import { create } from 'zustand';
import type { CareerPath, SchoolInfo } from '@/src/models/entities';

interface OnboardingState {
  school_info: Partial<SchoolInfo>;
  career_path?: CareerPath;
  interests: string[];
  skills: string[];
  bio: string;
  face_image_base64?: string;
  setSchoolInfo: (patch: Partial<SchoolInfo>) => void;
  setCareerPath: (cp: CareerPath) => void;
  setInterests: (v: string[]) => void;
  setSkills: (v: string[]) => void;
  setBio: (v: string) => void;
  setFaceImage: (v?: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  school_info: { country: 'India', institution_type: 'college' },
  career_path: undefined,
  interests: [],
  skills: [],
  bio: '',
  face_image_base64: undefined,
  setSchoolInfo: (patch) => set((s) => ({ school_info: { ...s.school_info, ...patch } })),
  setCareerPath: (cp) => set({ career_path: cp }),
  setInterests: (v) => set({ interests: v }),
  setSkills: (v) => set({ skills: v }),
  setBio: (v) => set({ bio: v }),
  setFaceImage: (v) => set({ face_image_base64: v }),
  reset: () =>
    set({
      school_info: { country: 'India', institution_type: 'college' },
      career_path: undefined,
      interests: [],
      skills: [],
      bio: '',
      face_image_base64: undefined,
    }),
}));
