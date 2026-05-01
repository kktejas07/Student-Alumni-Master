/**
 * useCurrentUser — small hook that returns the logged-in user from
 * the Zustand auth store. Falls back to a sensible persona email so
 * dev/demo screens still render before login is implemented portal-side.
 *
 * Usage:
 *   const { email, role, name } = useCurrentUser('booked1@persona.demo');
 */
import { useAuthStore } from '@/src/viewmodels/stores/authStore';

export function useCurrentUser(fallbackEmail?: string) {
  const user = useAuthStore((s) => s.user);
  return {
    user,
    email: user?.email || fallbackEmail || '',
    role:  user?.role  || 'student',
    name:  user?.full_name || user?.email?.split('@')[0] || 'Guest',
    isAuthed: !!user,
  };
}
