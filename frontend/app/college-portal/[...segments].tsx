/**
 * /college-portal/[...segments] — catch-all that maps the URL path to the portal.
 *
 *   /college-portal/dashboard
 *   /college-portal/students
 *   /college-portal/create-event
 *   /college-portal/profile
 */
import { NAV } from '@/src/views/web/portals/college/nav';
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import { CollegePortalRN } from '@/src/views/web/portals/college/CollegePortalRN';

const VALID_TABS = NAV.map((n) => n.id);

export default function CollegePortalCatchAll() {
  return (
    <PortalUrlProvider base="college-portal" defaultTab="dashboard" valid={VALID_TABS}>
      <CollegePortalRN />
    </PortalUrlProvider>
  );
}