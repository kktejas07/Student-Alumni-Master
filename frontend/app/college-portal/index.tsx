/**
 * /college-portal — index redirects so the URL always carries a real segment:
 *   /college-portal → /college-portal/dashboard
 */
import { Redirect } from 'expo-router';

export default function CollegePortalIndexRoute() {
  return <Redirect href="/college-portal/dashboard" />;
}