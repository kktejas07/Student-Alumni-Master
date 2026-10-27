/**
 * src/ui — StudentAlumni component kit.
 *
 *   import { Button, Card, Txt, usePortalTheme } from '@/src/ui';
 *
 * Components are token-driven: wrap a tree in <PortalThemeProvider portal=…>
 * (PortalShell does this for you) and every primitive picks up that portal's
 * accent in light or dark.
 */
export * from './theme';
export * from './primitives';
export { Table, type Column } from './Table';
export { Modal } from './Modal';
export { PortalShell } from './shell/PortalShell';
export type { PortalConfig, NavItem, NavGroup, NavEntry, PortalShellProps } from './shell/types';
export * from './motion';
