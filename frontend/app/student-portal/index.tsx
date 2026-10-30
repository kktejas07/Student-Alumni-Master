/**
 * /student-portal — index redirects so the URL always carries a real segment:
 *   /student-portal → /student-portal/dashboard
 */
import { Redirect } from 'expo-router';

export default function StudentPortalIndexRoute() {
  return <Redirect href="/student-portal/dashboard" />;
}