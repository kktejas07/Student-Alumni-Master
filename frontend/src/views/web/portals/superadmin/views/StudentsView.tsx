/**
 * StudentsView — thin wrapper around the shared UserDirectoryView.
 * Imported & auto-categorised students flow here automatically.
 */
import React from 'react';
import { UserDirectoryView } from './UserDirectoryView';

export function StudentsView() {
  return (
    <UserDirectoryView
      category="student"
      title="Students"
      subtitle="All Bachelor-level students currently on the platform. Newly imported students appear here automatically."
    />
  );
}
