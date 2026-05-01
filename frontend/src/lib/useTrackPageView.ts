/**
 * src/lib/useTrackPageView.ts
 *
 * Drop this hook into any screen/route to log a `page_view` event with the
 * given name. Re-fires on focus changes (web) so navigation between routes
 * is captured even when the component itself doesn't unmount.
 */
import { useEffect } from 'react';
import { usePathname } from 'expo-router';
import analytics, { EventProps } from './analytics';

export function useTrackPageView(name: string, props?: EventProps) {
  const pathname = usePathname();
  useEffect(() => {
    analytics.pageView(name, { ...props, pathname });
    // Intentionally re-run on pathname change — nested route changes count
    // as new page views.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, name]);
}
