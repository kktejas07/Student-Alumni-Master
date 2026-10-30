/**
 * MentorsView — thin wrapper around the shared UserDirectoryView.
 * Imported profiles with ≥4 years of professional experience are
 * auto-routed here by the categorization engine.
 */
import React from 'react';
import { UserDirectoryView } from './UserDirectoryView';

export function MentorsView() {
  return (
    <UserDirectoryView
      category="mentor"
      title="Mentors"
      subtitle="Senior professionals with 4+ years of experience. Approve newly imported mentors to make them visible to students."
    />
  );
}
