/**
 * PortalNavContext — in-shell navigation handed to views (search hand-off,
 * course detail hand-off). Student and alumni portals both provide it, so
 * views such as NetworkView can be shared between them.
 */
import { createContext, useContext } from 'react';

export type PortalNavValue = {
  navigate: (id: string, params?: { q?: string; detailCourse?: any }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  detailCourse?: any;
  setDetailCourse?: (c: any) => void;
};

export const PortalNavContext = createContext<PortalNavValue | null>(null);

export function usePortalNav(): PortalNavValue {
  const ctx = useContext(PortalNavContext);
  if (!ctx) throw new Error('usePortalNav must be used inside a portal shell');
  return ctx;
}
