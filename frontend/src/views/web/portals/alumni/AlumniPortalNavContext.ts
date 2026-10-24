import { createContext, useContext } from 'react';
import { StudentNavId } from './Sidebar';

export const AlumniPortalNavContext = createContext<{
  navigate: (id: StudentNavId, params?: { q?: string }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
} | null>(null);

export const useAlumniPortalNav = () => {
  const ctx = useContext(AlumniPortalNavContext);
  if (!ctx) throw new Error('useAlumniPortalNav must be used inside AlumniPortalRN');
  return ctx;
};
