/**
 * frontend/src/analytics/components/AnalyticsRoot.tsx
 *
 * App Root wrapper that initializes providers, global listeners, and dev overlay.
 */

import React, { useEffect } from 'react';
import { CONFIG } from '../config';
import { dispatcher } from '../core/dispatcher';
import { AnalyticsDebugOverlay } from '../dev/AnalyticsDebugOverlay';
import { initGlobalClickListener } from '../web/globalClickListener';
import { initVisitorTracking } from '../web/visitorTracker';

export interface AnalyticsRootProps {
  children: React.ReactNode;
}

export const AnalyticsRoot: React.FC<AnalyticsRootProps> = ({ children }) => {
  useEffect(() => {
    dispatcher.init().catch(() => {});
    initGlobalClickListener();
    initVisitorTracking();
  }, []);

  return (
    <>
      {children}
      {CONFIG.isDev && <AnalyticsDebugOverlay />}
    </>
  );
};
