/**
 * tours.config.ts — per-portal product tour definitions.
 *
 * Each tour is a list of steps. Each step targets a DOM element via a
 * `data-tour-id="..."` attribute set on the element in the portal code.
 *
 * Steps work on Expo Web (use document.querySelector). On native, the tour
 * gracefully no-ops.
 */
export type TourStep = {
  id: string;
  /** CSS selector — typically a [data-tour-id="xxx"] attr. */
  target: string;
  title: string;
  body: string;
  /** Preferred tooltip placement; falls back if it would overflow. */
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'center';
  /** If true, allow the step to advance only after the user interacts. */
  spotlightOnly?: boolean;
};

export type TourKey =
  | 'student' | 'alumni' | 'college' | 'mentor' | 'super_admin' | 'landing';

export type TourConfig = {
  key: TourKey;
  /** Accent color used for tooltip ring + Next button (matches portal accent). */
  accent: string;
  /** Human label used in the Help menu. */
  label: string;
  steps: TourStep[];
};

/* ────────────────────────────────────────────────────────────────────
 * Tour definitions — keep step counts reasonable (~5–7) so the user
 * doesn't abandon it.
 * ────────────────────────────────────────────────────────────────── */
export const TOURS: Record<TourKey, TourConfig> = {
  student: {
    key: 'student',
    label: 'Student portal tour',
    accent: '#A78BFA',
    steps: [
      { id: 'welcome',    target: '[data-tour-id="student-brand"]',     title: 'Welcome to your Student portal',
        body: 'Your home base for jobs, mentors, events and AI-powered career guidance. Let\'s look around — takes 30 seconds.', placement: 'right' },
      { id: 'nav',        target: '[data-tour-id="student-nav-dashboard"]', title: 'Navigation', placement: 'right',
        body: 'Jump between Dashboard, Jobs, Mentors, Events, and your Profile from this sidebar.' },
      { id: 'jobs',       target: '[data-tour-id="student-nav-jobs"]',   title: 'Jobs & Internships', placement: 'right',
        body: 'Curated, ATS-friendly listings tailored to your profile. New roles since your last visit are highlighted.' },
      { id: 'mentors',    target: '[data-tour-id="student-nav-mentors"]', title: 'Mentors', placement: 'right',
        body: 'Book 1:1 sessions with alumni and industry mentors. They\'ve walked the path you\'re on.' },
      { id: 'agentk',     target: '[data-tour-id="agentk-launcher"]',    title: 'Meet Agent K', placement: 'right',
        body: 'Press ⌘+K anytime to ask Agent K for help — resume rewrites, job matching, interview prep, anything.' },
      { id: 'help',       target: '[data-tour-id="help-menu"]',          title: 'Need help later?', placement: 'bottom',
        body: 'You can replay this tour any time from the Help menu in the top bar.' },
    ],
  },

  alumni: {
    key: 'alumni',
    label: 'Alumni portal tour',
    accent: '#3B82F6',
    steps: [
      { id: 'welcome',    target: '[data-tour-id="alumni-brand"]',       title: 'Welcome back, alum', placement: 'right',
        body: 'Stay connected with your network, mentor students, and discover senior opportunities through StudentAlumni.' },
      { id: 'nav',        target: '[data-tour-id="alumni-nav-dashboard"]', title: 'Quick navigation', placement: 'right',
        body: 'Your dashboard, events, internships you\'re hiring for, and your alumni network — all one click away.' },
      { id: 'network',    target: '[data-tour-id="alumni-nav-network"]', title: 'Your network', placement: 'right',
        body: 'Reconnect with batchmates, search alumni by company or city, and message peers directly.' },
      { id: 'events',     target: '[data-tour-id="alumni-nav-events"]',  title: 'Reunions & events', placement: 'right',
        body: 'RSVP to reunions, talks, and alumni meets — or host your own and invite the community.' },
      { id: 'help',       target: '[data-tour-id="help-menu"]',          title: 'Need help later?', placement: 'bottom',
        body: 'Replay this tour any time from the Help menu in the top bar.' },
    ],
  },

  college: {
    key: 'college',
    label: 'College portal tour',
    accent: '#6366F1',
    steps: [
      { id: 'welcome',    target: '[data-tour-id="college-brand"]',      title: 'Welcome, College Admin', placement: 'right',
        body: 'Manage your students, alumni, placements and approvals from a single command center.' },
      { id: 'nav',        target: '[data-tour-id="college-nav-dashboard"]', title: 'Sidebar navigation', placement: 'right',
        body: 'Switch between dashboards: Students, Alumni, Placements, Events, and Settings.' },
      { id: 'students',   target: '[data-tour-id="college-nav-students"]', title: 'Student directory', placement: 'right',
        body: 'Search, filter and onboard students. Bulk-import via Excel/CSV.' },
      { id: 'placements', target: '[data-tour-id="college-nav-placements"]', title: 'Placement tracker', placement: 'right',
        body: 'Track ongoing drives, offers, packages, and historical placement statistics.' },
      { id: 'help',       target: '[data-tour-id="help-menu"]',          title: 'Need help later?', placement: 'bottom',
        body: 'Replay this tour any time from the Help menu in the top bar.' },
    ],
  },

  mentor: {
    key: 'mentor',
    label: 'Mentor portal tour',
    accent: '#14B8A6',
    steps: [
      { id: 'welcome',    target: '[data-tour-id="mentor-brand"]',       title: 'Welcome, mentor', placement: 'right',
        body: 'Help students grow, host sessions, and track your impact — all from your mentor dashboard.' },
      { id: 'nav',        target: '[data-tour-id="mentor-nav-dashboard"]', title: 'Quick navigation', placement: 'right',
        body: 'Dashboard, Bookings, Availability, Earnings, and your Mentees — all in the sidebar.' },
      { id: 'bookings',   target: '[data-tour-id="mentor-nav-bookings"]', title: 'Bookings', placement: 'right',
        body: 'See upcoming 1:1 sessions, accept or decline new requests, and join calls in one click.' },
      { id: 'availability', target: '[data-tour-id="mentor-nav-availability"]', title: 'Availability', placement: 'right',
        body: 'Set the slots you\'re open for. Students can only book within those windows.' },
      { id: 'help',       target: '[data-tour-id="help-menu"]',          title: 'Need help later?', placement: 'bottom',
        body: 'Replay this tour any time from the Help menu in the top bar.' },
    ],
  },

  super_admin: {
    key: 'super_admin',
    label: 'Super Admin tour',
    accent: '#F59E0B',
    steps: [
      { id: 'welcome',    target: '[data-tour-id="superadmin-brand"]',   title: 'Super Admin Console', placement: 'right',
        body: 'You have full control over the StudentAlumni platform. Let\'s look at the key sections — 30 seconds.' },
      { id: 'overview',   target: '[data-tour-id="superadmin-nav-overview"]', title: 'Platform overview', placement: 'right',
        body: 'Live KPIs across users, mentors, colleges, payments and growth signals.' },
      { id: 'imports',    target: '[data-tour-id="superadmin-nav-imports"]', title: 'Bulk imports', placement: 'right',
        body: 'Upload spreadsheets to onboard students, mentors and alumni in bulk — with AI categorisation.' },
      { id: 'partners',   target: '[data-tour-id="superadmin-nav-partners"]', title: 'Collaboration Partners', placement: 'right',
        body: 'Manage the partner logos shown on the landing page and dashboard footers. Drag-drop or arrow-reorder.' },
      { id: 'approvals',  target: '[data-tour-id="superadmin-nav-approvals"]', title: 'Approvals queue', placement: 'right',
        body: 'Review new mentors, colleges, and high-trust profile changes that require manual approval.' },
      { id: 'help',       target: '[data-tour-id="help-menu"]',          title: 'Need help later?', placement: 'bottom',
        body: 'Replay this tour any time from the Help menu in the top bar.' },
    ],
  },

  landing: {
    key: 'landing',
    label: 'Landing tour',
    accent: '#A78BFA',
    steps: [],   // not used right now; reserved for future
  },
};
