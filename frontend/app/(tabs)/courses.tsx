/**
 * Mobile Courses tab — redirects to the rich /courses route.
 */
import { Redirect } from 'expo-router';

export default function CoursesTab() {
  return <Redirect href="/courses" />;
}
