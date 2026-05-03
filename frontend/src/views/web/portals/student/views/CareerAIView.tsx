/**
 * Embedded Career AI view — re-uses the same component as the standalone
 * /career-ai route, but rendered inline within the Student Portal shell.
 */
import React from 'react';
import CareerAIPage from '../../../../../../app/career-ai';

export function CareerAIView() {
  return <CareerAIPage embedded />;
}
