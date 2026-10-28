/** Vendor portal — navigation + shell configuration for the shared <PortalShell>. */
import { PieChart, List, QrCode, ShoppingBag } from 'lucide-react-native';
import type { NavItem, PortalConfig } from '@/src/ui/shell/types';

export type VendorNavId = 'dashboard' | 'catalog' | 'scanner' | 'orders';

export const NAV: (NavItem & { id: VendorNavId })[] = [
  { id: 'dashboard', label: 'Dashboard',  Icon: PieChart },
  { id: 'catalog',   label: 'Catalog',    Icon: List },
  { id: 'scanner',   label: 'QR Scanner', Icon: QrCode },
  { id: 'orders',    label: 'Orders',     Icon: ShoppingBag },
];

export const VENDOR_PORTAL: PortalConfig = {
  portal: 'vendor',
  darkOnly: true, // views still hardcode dark colours; see src/ui/theme.ts
  base: 'vendor-portal',
  defaultTab: 'dashboard',
  brand: { title: 'Vendor Portal', subtitle: 'Student Alumni Marketplace' },
  agentK: false,
  profileTab: 'dashboard',
  mobileTabs: ['dashboard', 'catalog', 'scanner', 'orders'],
  topbar: { search: false, bell: false, greetingTab: 'dashboard' },
  // Vendors authenticate through vendorAuthStore; the shell receives `profile` as a prop.
  profile: () => ({ name: 'Vendor', subtitle: 'Marketplace partner', initials: 'V' }),
  nav: NAV,
};
