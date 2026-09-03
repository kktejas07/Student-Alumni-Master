/**
 * /vendor-portal — auth gate for every nested segment route.
 *
 * Guards /vendor-portal/dashboard, /vendor-portal/catalog, etc. Vendors must be
 * authenticated via the vendor auth store (token + vendor); otherwise they are
 * bounced to /vendor-portal/login. The login screen itself is exempt.
 */
import React, { useEffect } from 'react';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useVendorAuthStore } from '@/src/viewmodels/stores/vendorAuthStore';

export default function VendorPortalLayoutRoute() {
  const router = useRouter();
  const pathname = usePathname();
  const token = useVendorAuthStore((s) => s.token);
  const vendor = useVendorAuthStore((s) => s.vendor);
  const isLogin = pathname === '/vendor-portal/login';

  useEffect(() => {
    if (isLogin) return;
    if (!token || !vendor) {
      router.replace('/vendor-portal/login');
    }
  }, [token, vendor, isLogin, router]);

  return <Slot />;
}
