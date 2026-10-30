/**
 * RoleThemeContext — propagates the active role's gradient pair through the
 * onboarding/auth tree so that PrimaryButton + accent UI reads the right
 * colors automatically.
 *
 * Provided by `<AuthShell role="mentor">` (and similar). Consumed by
 * `<PrimaryButton />` and any custom widget that wants to honour the
 * role-specific brand.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { ROLE_GRADIENTS } from './tokens';

export type Role = 'student' | 'mentor' | 'alumni' | 'college' | null | undefined;

export type RoleTheme = {
  role: Role;
  primary: string;
  primaryL: string;
  /** Gradient pair, [start, end] */
  gradient: [string, string];
};

const RoleThemeContext = createContext<RoleTheme>({
  role: null,
  primary: ROLE_GRADIENTS.student[0],
  primaryL: ROLE_GRADIENTS.student[1],
  gradient: ROLE_GRADIENTS.student,
});

export function RoleThemeProvider({ role, children }: { role?: Role; children: React.ReactNode }) {
  const value = useMemo<RoleTheme>(() => {
    const key = (role && ROLE_GRADIENTS[role]) ? role! : 'student';
    const gradient = ROLE_GRADIENTS[key];
    return { role: role ?? null, primary: gradient[0], primaryL: gradient[1], gradient };
  }, [role]);
  return <RoleThemeContext.Provider value={value}>{children}</RoleThemeContext.Provider>;
}

export function useRoleTheme(): RoleTheme {
  return useContext(RoleThemeContext);
}
