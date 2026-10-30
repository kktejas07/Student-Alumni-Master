/**
 * /super-admin — index redirects so the URL always carries a real segment:
 *   /super-admin → /super-admin/overview
 * This keeps deep-linking + browser history consistent.
 */
import { Redirect } from 'expo-router';

export default function SuperAdminIndexRoute() {
  return <Redirect href="/super-admin/overview" />;
}