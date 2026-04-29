/**
 * Web sidebar sub-screens for the Student platform.
 * Each one wraps the shared ExploreScreen with role-specific data.
 */
import { ExploreScreen } from '@/src/views/web/ExploreScreen';
import {
  COURSES_HERO, COURSES_SECTIONS,
  INTERNSHIPS_HERO, INTERNSHIPS_SECTIONS,
  NETWORK_HERO, NETWORK_SECTIONS,
} from '@/src/views/web/exploreData';

export function StudentInternships() {
  return (
    <ExploreScreen
      pageTitle="Internships"
      pageSubtitle="Discover roles tailored to your career path & skills."
      searchPlaceholder="Search roles, companies, locations…"
      hero={INTERNSHIPS_HERO}
      sections={INTERNSHIPS_SECTIONS}
    />
  );
}

export function StudentCourses() {
  return (
    <ExploreScreen
      pageTitle="Courses"
      pageSubtitle="Skill up with curated tracks, free certifications & expert mentors."
      searchPlaceholder="Search courses, skills, instructors…"
      hero={COURSES_HERO}
      sections={COURSES_SECTIONS}
    />
  );
}

export function StudentNetwork() {
  return (
    <ExploreScreen
      pageTitle="Network"
      pageSubtitle="Mentors, alumni, peers, events — your circle of growth."
      searchPlaceholder="Find mentors, rooms, events…"
      hero={NETWORK_HERO}
      sections={NETWORK_SECTIONS}
    />
  );
}

export function StudentResources() {
  return (
    <ExploreScreen
      pageTitle="Resources"
      pageSubtitle="Tools, guides, deals and benefits for students."
      searchPlaceholder="Search resources & deals…"
      sections={NETWORK_SECTIONS}
    />
  );
}
