/**
 * Alumni → Internships & Jobs view.
 *
 * Re-uses the live multi-source feed UI from the Student Portal. The backend
 * tier filter automatically widens the allowed types for role=alumni
 * (returns all: Internship + Full-time + Contract), so a wrapper is enough.
 */
import React from 'react';
import { InternshipsView as StudentInternshipsView } from '../../student/views/InternshipsView';

export function InternshipsView() {
  return <StudentInternshipsView />;
}
