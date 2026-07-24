import { createContext, useContext } from 'react';
import { StudentNavId } from './Sidebar';

export const StudentPortalNavContext = createContext<{
  navigate: (id: StudentNavId, params?: { q?: string; detailCourse?: any }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  detailCourse?: any;
  setDetailCourse?: (c: any) => void;
} | null>(null);

export const useStudentPortalNav = () => {
  const ctx = useContext(StudentPortalNavContext);
  if (!ctx) throw new Error('useStudentPortalNav must be used inside StudentPortalRN');
  return ctx;
};
