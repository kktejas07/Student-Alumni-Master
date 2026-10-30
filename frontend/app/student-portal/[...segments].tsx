/**
 * /student-portal/[...segments] — catch-all that maps the URL path to the portal.
 *
 *   /student-portal/dashboard
 *   /student-portal/events
 *   /student-portal/network
 *   /student-portal/profile
 *   /student-portal/snist            (ECHO showcase slug renders inline)
 *
 * The student portal is "permissive" — unknown segments (ECHO showcase slugs)
 * are passed through to the shell which renders them inline.
 */
import { NAV } from '@/src/views/web/portals/student/nav';
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import { StudentPortalRN } from '@/src/views/web/portals/student/StudentPortalRN';

const VALID_TABS = NAV.map((n) => n.id).filter((id) => id !== 'echo-showcase');

export default function StudentPortalCatchAll() {
  return (
    <PortalUrlProvider base="student-portal" defaultTab="dashboard" valid={VALID_TABS} permissive>
      {/* Native fallback (Expo Go / mobile web): render the RN port directly. */}
      <StudentPortalRN />
    </PortalUrlProvider>
  );
}