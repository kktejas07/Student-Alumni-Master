/**
 * /vendor-portal — auth gate for every nested segment route.
 *
 * Guards /vendor-portal/dashboard, /vendor-portal/catalog, etc. Vendors must be
 * authenticated via the vendor auth store (token + vendor); otherwise they are
 * bounced to /vendor-portal/login. The login screen itself is exempt.
 *
 * Auth check is synchronous (not useEffect) so unauthenticated users never see
 * the protected child route flash or crash.
 */
import React, { useEffect } from 'react';
import { WebOnlyRoute } from '@/src/lib/nativeGuard';
import { Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';

function VendorPortalLayoutRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useVendorAuthStore((s) => s.token);
  const vendor = useVendorAuthStore((s) => s.vendor);
  const isLogin = pathname === '/vendor-portal/login';

  // Redirect synchronously on mount + whenever auth state changes
  useEffect(() => {
    if (isLogin) return;
    if (!token || !vendor) {
      router.replace('/vendor-portal/login' as any);
    }
  }, [token, vendor, isLogin, router]);

  // Never render the child route if not authenticated
  if (!isLogin && (!token || !vendor)) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#08080F', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          <div style={{ width: 32, height: 32, border: '3px solid rgba(139,92,246,0.3)', borderTopColor: '#8B5CF6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Redirecting to login…
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  return <Slot />;
}

/**
 * Native guard — this route renders web-only UI. On iOS/Android show a
 * placeholder that opens the page on studentalumni.ai instead of crashing.
 */
export default function VendorPortalLayoutRouteRoute() {
  if (Platform.OS !== 'web') return <WebOnlyRoute path="/vendor-portal" />;
  return <VendorPortalLayoutRoute />;
}
