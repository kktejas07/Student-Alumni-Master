/**
 * /alumni-portal — True React Native port of the Alumni Dashboard.
 *
 * Mirrors the Student Portal architecture and view set, themed in orange
 * per the alumni onboarding color schema. Feeds will diverge per business
 * logic in a follow-up pass (CGPA + last organization driven).
 */
import React from 'react';
import { Platform } from 'react-native';
import { AlumniPortalRN } from '@/src/views/web/portals/alumni/AlumniPortalRN';

export default function AlumniPortalRoute() {
  // Native + web both render the RN port directly — feature parity with student portal.
  return <AlumniPortalRN />;
}
