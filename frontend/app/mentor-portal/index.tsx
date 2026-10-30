/**
 * /mentor-portal — index redirects so the URL always carries a real segment:
 *   /mentor-portal → /mentor-portal/dashboard
 */
import { Redirect } from 'expo-router';

export default function MentorPortalIndexRoute() {
  return <Redirect href="/mentor-portal/dashboard" />;
}