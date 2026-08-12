/**
 * /alumni-portal/[...segments] — catch-all that maps the URL path to the portal.
 *
 *   /alumni-portal/dashboard
 *   /alumni-portal/my-applications
 *   /alumni-portal/events
 */
import { NAV } from '@/src/views/web/portals/alumni/Sidebar';
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import { AlumniPortalRN } from '@/src/views/web/portals/alumni/AlumniPortalRN';

const VALID_TABS = NAV.map((n) => n.id);

export default function AlumniPortalCatchAll() {
  return (
    <PortalUrlProvider base="alumni-portal" defaultTab="dashboard" valid={VALID_TABS}>
      <AlumniPortalRN />
    </PortalUrlProvider>
  );
}