/**
 * /vendor-portal/[...segments]
 */
import { PortalUrlProvider } from '@/src/views/web/portals/portalUrl';
import { VendorPortalRN } from '@/src/views/web/portals/vendor/VendorPortalRN';

const VALID_TABS = ['dashboard', 'catalog', 'scanner', 'orders'];

export default function VendorPortalCatchAll() {
  return (
    <PortalUrlProvider base="vendor-portal" defaultTab="dashboard" valid={VALID_TABS}>
      <VendorPortalRN />
    </PortalUrlProvider>
  );
}