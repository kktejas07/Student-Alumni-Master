/**
 * Vendor Portal — view switch inside the shared <PortalShell>.
 */
import React from 'react';
import { useRouter } from 'expo-router';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';
import { usePortalUrl } from '@/src/views/web/portals/portalUrl';
import { PortalShell } from '@/src/ui/shell/PortalShell';
import { VENDOR_PORTAL } from './nav';
import { VendorDashboardView } from './views/VendorDashboardView';
import { VendorCatalogView } from './views/VendorCatalogView';
import { VendorScannerView } from './views/VendorScannerView';
import { VendorOrdersView } from './views/VendorOrdersView';

export function VendorPortalRN() {
  const router = useRouter();
  const { token, vendor, logout } = useVendorAuthStore();
  const { tab, go } = usePortalUrl();
  const active = tab || 'dashboard';

  React.useEffect(() => {
    if (!token) router.replace('/vendor-portal/login' as any);
  }, [token, router]);
  if (!token) return null;

  const onLogout = () => {
    logout();
    router.replace('/vendor-portal/login' as any);
  };
  const name = vendor?.name || 'Vendor';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || 'V';

  return (
    <PortalShell
      config={VENDOR_PORTAL}
      active={active}
      onNav={go}
      onLogout={onLogout}
      profile={{ name, subtitle: vendor?.vendor_id ? `Vendor · ${vendor.vendor_id}` : 'Marketplace partner', initials }}
    >
      {active === 'dashboard' && <VendorDashboardView />}
      {active === 'catalog'   && <VendorCatalogView />}
      {active === 'scanner'   && <VendorScannerView />}
      {active === 'orders'    && <VendorOrdersView />}
    </PortalShell>
  );
}
