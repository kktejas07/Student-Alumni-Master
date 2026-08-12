/**
 * Portal URL routing — deep-linkable path segments for every portal.
 *
 * Portals are rendered through a catch-all `[...segments]` route (e.g.
 * `/super-admin` → `app/super-admin/[...segments].tsx`) so the browser URL
 * mirrors the active view:
 *
 *   /super-admin                       → index redirect → /super-admin/overview
 *   /super-admin/newsletter            → top-level tab
 *   /super-admin/certificates          → top-level tab (sub resets to default)
 *   /super-admin/certificates/registry → view sub-tab (2nd segment)
 *   /super-admin/echo-showcase/editor  → deeper nested state (3rd+ segments)
 *
 * The shell component books the single source of truth from the URL and
 * navigates via `go(tab, sub?, deeper?)`. Browser back/forward and direct
 * deep-links work because the SPA history fallback (nginx try_files) serves
 * index.html for any unknown path.
 */
import React, { createContext, useContext, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

type Segments = string | string[] | undefined;

export interface PortalUrl {
  /** Catch-all segment array, e.g. ['certificates','registry'] */
  segs: string[];
  /** First segment → active top-level tab */
  tab: string;
  /** Second segment → active sub-tab within the view */
  sub: string;
  /** Third+ segments → nested state (forms, editors, detail modals) */
  deeper: string[];
  /** Push navigation to a new path under this portal (browser history entry). */
  go: (tab: string, sub?: string, deeper?: string[]) => void;
}

const PortalUrlContext = createContext<PortalUrl | null>(null);

function toSegs(segments: Segments): string[] {
  if (Array.isArray(segments)) return segments;
  if (typeof segments === 'string' && segments.length > 0) return [segments];
  return [];
}

function makeUrl(base: string, defaultTab: string, valid: string[], raw: string[]): PortalUrl {
  const rawTab = raw.length > 0 ? raw[0] : defaultTab;
  const activeTab = valid.includes(rawTab) ? rawTab : defaultTab;
  return {
    segs: raw,
    tab: activeTab,
    sub: raw[1] || '',
    deeper: raw.slice(2),
    go: () => {}, // real go injected by the provider
  };
}

/**
 * The shell that owns the URL. Provides `usePortalUrl()` to every nested view
 * (top bar, sidebar, view components) without prop drilling. Wraps a child
 * render function so the shell can hand in its router-aware `go()`.
 */
export function PortalUrlProvider({
  base,
  defaultTab,
  valid,
  permissive = false,
  children,
}: {
  base: string; // e.g. 'super-admin', 'student-portal'
  defaultTab: string; // e.g. 'overview', 'dashboard'
  valid: string[]; // allowed top-level tab ids
  permissive?: boolean; // pass through any unknown segment as the active tab
  children: React.ReactNode | ((ctx: PortalUrl) => React.ReactNode);
}) {
  const router = useRouter();
  const { segments } = useLocalSearchParams<{ segments?: Segments }>();
  const raw = toSegs(segments);

  const rawTab = raw.length > 0 ? raw[0] : defaultTab;
  const activeTab = permissive || valid.includes(rawTab) ? rawTab : defaultTab;

  const go = (t: string, subTab?: string, rest?: string[]) => {
    const parts = ['', base, t, subTab || '', ...(rest || [])].filter(Boolean);
    router.push((parts.join('/') || `/${base}/${defaultTab}`) as any);
  };

  const value: PortalUrl = { segs: raw, tab: activeTab, sub: raw[1] || '', deeper: raw.slice(2), go };

  if (typeof children === 'function') {
    return <PortalUrlContext.Provider value={value}>{children(value)}</PortalUrlContext.Provider>;
  }
  return <PortalUrlContext.Provider value={value}>{children}</PortalUrlContext.Provider>;
}

/** Context-aware hook — reads the nearest portal shell's URL state. */
export function usePortalUrl(): PortalUrl {
  const ctx = useContext(PortalUrlContext);
  const { segments } = useLocalSearchParams<{ segments?: Segments }>();
  if (ctx) return ctx;
  // Standalone (native / storybook) — no shell: read params directly.
  const raw = toSegs(segments);
  return makeUrl('', '', [], raw);
}

export interface SubTabControlProps {
  sub?: string;
  onSub?: (s: string) => void;
}

/**
 * Bridges a view's internal `useState<TabId>` tab to the URL's second segment.
 * When the portal provides `sub`/`onSub` (i.e. we're inside a portal shell),
 * the active tab is driven by the URL; otherwise it falls back to local state.
 */
export function useSubTab<T extends string>(
  valid: readonly T[],
  fallback: T,
  ctrl?: SubTabControlProps,
): [T, (t: T) => void] {
  const [local, setLocal] = useState<T>(fallback);
  // Located inside PortalUrlProvider → the URL is the source of truth.
  const routed = !!ctrl && typeof ctrl.onSub === 'function';
  const active = routed && ctrl && (valid as readonly string[]).includes(ctrl.sub || '')
    ? (ctrl.sub as T)
    : routed
      ? fallback
      : local;
  const set = (t: T) => {
    setLocal(t);
    if (routed && ctrl) ctrl.onSub(t as string);
  };
  return [active, set];
}