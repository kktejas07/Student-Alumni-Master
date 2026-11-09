import React from 'react';
import { Navbar, NavbarProps } from '@/src/views/web/nexus-glow-landing/Navbar';

export { NavbarProps };

/**
 * PublicHeader — Standardized public navigation header with integrated
 * continuous AnnouncementTicker, responsive navigation tabs, theme toggle,
 * and authentication status actions.
 */
export function PublicHeader(props: NavbarProps) {
  return <Navbar {...props} />;
}

export default PublicHeader;

