/**
 * AlumniView — thin wrapper around the shared UserDirectoryView.
 * Imported alumni (Bachelor's + ≥1 yr experience or completed Bachelor's)
 * flow here automatically via the categorization engine.
 */
import React from 'react';
import { UserDirectoryView } from './UserDirectoryView';

export function AlumniView() {
  return (
    <UserDirectoryView
      category="alumni"
      title="Alumni"
      subtitle="Graduates and ex-students of partner institutions. Bachelor's-degree holders with work experience are auto-routed here on import."
    />
  );
}
