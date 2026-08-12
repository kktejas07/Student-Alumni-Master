/**
 * /alumni-portal — index redirects so the URL always carries a real segment:
 *   /alumni-portal → /alumni-portal/dashboard
 */
import { Redirect } from 'expo-router';

export default function AlumniPortalIndexRoute() {
  return <Redirect href="/alumni-portal/dashboard" />;
}