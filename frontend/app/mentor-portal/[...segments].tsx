/**
 * /mentor-portal/[...segments] — catch-all that maps the URL path to the portal.
 *
 *   /mentor-portal/dashboard
 *   /mentor-portal/sessions
 *   /mentor-portal/profile
 */
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import MentorPortalRN from '@/src/views/web/portals/mentor/MentorPortalRN';

const VALID_TABS = ['dashboard', 'ai-studio', 'students', 'sessions', 'requests', 'network', 'earnings', 'feedback', 'event', 'availability', 'profile'];

export default function MentorPortalCatchAll() {
  return (
    <PortalUrlProvider base="mentor-portal" defaultTab="dashboard" valid={VALID_TABS}>
      <MentorPortalRN />
    </PortalUrlProvider>
  );
}