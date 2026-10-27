import type React from 'react';
import type { PortalKey } from '../theme';

/** A leaf navigation entry. */
export type NavItem = {
  id: string;
  label: string;
  Icon: any;
  /** Small pill after the label ("NEW", "CMS", "v2.0"). */
  tag?: string;
  /** Key into PortalShell `counts` for a live numeric pill. */
  countKey?: string;
  /** Pulse the count pill (pending requests etc.). */
  alert?: boolean;
  /** Animated sparkle icon (Career AI). */
  spark?: boolean;
  /** Keep out of the phone hamburger menu. */
  hideOnMobile?: boolean;
};

/** A collapsible group whose children can be loaded at runtime (ECHO showcases). */
export type NavGroup = {
  group: string;
  label: string;
  Icon: any;
  tag?: string;
  children?: { id: string; label: string }[];
  loadChildren?: () => Promise<{ id: string; label: string }[]>;
  /** Decide whether `active` belongs to this group (defaults to child-id match). */
  isChildActive?: (active: string) => boolean;
};

export type NavEntry = NavItem | NavGroup;

export const isGroup = (e: NavEntry): e is NavGroup => (e as NavGroup).group !== undefined;

export type PortalProfile = {
  name: string;
  subtitle: string;
  initials: string;
  photo?: string | null;
  email?: string;
};

export type PortalConfig = {
  portal: PortalKey;
  /** URL base segment, e.g. 'student-portal'. */
  base: string;
  defaultTab: string;
  brand: { title: string; subtitle: string };
  nav: NavEntry[];
  /** Ids shown in the phone bottom tab bar (max 5). */
  mobileTabs?: string[];
  /** Tour / help key; also drives PromoBanner + DashboardFooter when set. */
  tour?: 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin';
  /** Sidebar id-card pill (student / alumni / mentor card). */
  idCard?: { label: string; route: string };
  /** Agent K launcher card in the sidebar. */
  agentK?: boolean;
  /** Floating AI copilot button over content. */
  aiFab?: boolean;
  /** Profile block in the sidebar. */
  profile: (user: any) => PortalProfile;
  /** Nav id opened by the top-bar avatar. */
  profileTab: string;
  topbar?: {
    /** Show "Good morning, X" instead of the page title when on this tab. */
    greetingTab?: string;
    greetingSub?: string;
    /** false hides the search box. */
    search?: { placeholder?: string } | false;
    themeToggle?: boolean;
    /** false hides the notifications bell. */
    bell?: boolean;
    /** Extra controls between search and the bell. */
    extra?: React.ReactNode;
  };
  /** Where logout sends the user. */
  logoutTo?: string;
  /** Hide the promo banner on these tabs. */
  promoHiddenOn?: string[];
  /** Sidebar width when expanded. */
  railWidth?: number;
  /** Sidebar can collapse to an icon rail (persisted). */
  collapsible?: boolean;
  /** Views are not yet theme-aware: pin the portal to dark tokens and hide the theme toggle. */
  darkOnly?: boolean;
};

export type PortalShellProps = {
  config: PortalConfig;
  active: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  /** Page title shown in the top bar when not on the greeting tab. */
  title?: string;
  /** Live counts keyed by NavItem.countKey. */
  counts?: Record<string, number>;
  /** Override the profile block (portals that don't use authStore, e.g. vendor). */
  profile?: PortalProfile;
  /** Top-bar search state; omit to use local state. */
  search?: { value: string; onChange: (v: string) => void; onSubmit: () => void };
  /** Override the unread badge (shell polls /notifications otherwise). */
  unread?: number;
  /** Called when the bell is pressed; the shell toggles `notificationsOpen` and renders `notifications`. */
  notifications?: (close: () => void) => React.ReactNode;
  onBellPress?: () => void;
  children: React.ReactNode;
  /** Padding around page content; defaults to responsive. */
  contentPadding?: number;
  /** Scroll container ref for scroll-to-top. */
  scrollRef?: React.RefObject<any>;
  /** Hide the whole sidebar (vendor on phone etc.). */
  hideSidebar?: boolean;
  /** Content sits directly in the scroll view with no RouteTransition. */
  plain?: boolean;
};
