/**
 * Legacy redirect — the old /role-setup screen has been merged INTO /register.
 * This file just redirects users who land on /role-setup so old links/bookmarks
 * don't 404.
 */
import { Redirect } from 'expo-router';

export default function RoleSetupRedirect() {
  return <Redirect href="/(auth)/register" />;
}
