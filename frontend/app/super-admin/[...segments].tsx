/**
 * /super-admin/[...segments] — catch-all that maps the URL path to the portal.
 *
 *   /super-admin/overview
 *   /super-admin/newsletter
 *   /super-admin/certificates/registry   (sub-tab = second segment)
 *   /super-admin/echo-showcase/editor    (nested = third+ segments)
 *
 * The PortalUrlProvider exposes `usePortalUrl()` to the whole portal so the
 * Sidebar/TopBar/views read `tab`/`sub`/`deeper` from the URL and navigate by
 * pushing new segment paths.
 */
import { NAV } from '@/src/views/web/portals/superadmin/nav';
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import { SuperAdminPortalRN } from '@/src/views/web/portals/superadmin/SuperAdminPortalRN';

const VALID_TABS = NAV.map((n) => n.id);

export default function SuperAdminCatchAll() {
  return (
    <PortalUrlProvider base="super-admin" defaultTab="overview" valid={VALID_TABS}>
      <SuperAdminPortalRN />
    </PortalUrlProvider>
  );
}