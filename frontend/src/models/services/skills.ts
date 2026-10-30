/**
 * src/models/services/skills.ts — skills profile API client.
 *
 * Backend: POST /api/users/me/resume/parse (auto on upload),
 *          POST /api/users/me/skills/confirm (resume proposals),
 *          POST /api/users/me/skills, DELETE /api/users/me/skills/{name} (manual),
 *          GET  /api/users/me/skills/summary (profile + banner data),
 *          GET  /api/skills/suggest (typeahead).
 */
import { request } from './api';

export interface SkillSuggestion {
  id: string;
  name: string;
  category?: string;
}

export interface ProposedSkill extends SkillSuggestion {
  confidence?: number;
}

export interface SkillReview {
  status: 'pending' | 'confirmed' | 'no_text' | string;
  resume_id?: string;
  parsed_at?: string;
  confirmed_at?: string;
  proposed_skills?: ProposedSkill[];
  no_text_reason?: string;
}

export interface SkillProfileEntry {
  id: string;
  name: string;
  category?: string;
  source: 'resume' | 'manual' | string;
  confidence?: number;
  confirmed_at?: string;
}

export interface SkillsSummary {
  skills: string[];
  profile: SkillProfileEntry[];
  review: SkillReview | null;
}

export function getMySkillsSummary(): Promise<SkillsSummary> {
  return request<SkillsSummary>('/users/me/skills/summary');
}

export function confirmSkills(add: string[], remove: string[]): Promise<{
  confirmed: string[];
  removed: string[];
  skills: string[];
}> {
  return request<{ confirmed: string[]; removed: string[]; skills: string[] }>(
    '/users/me/skills/confirm',
    { method: 'POST', body: { add, remove } },
  );
}

export function addManualSkill(name: string): Promise<{ status: string }> {
  return request<{ status: string }>('/users/me/skills', {
    method: 'POST',
    body: { skill: name },
  });
}

export function removeManualSkill(name: string): Promise<{ status: string }> {
  return request<{ status: string }>(`/users/me/skills/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export function suggestSkills(q: string, limit = 8): Promise<{ suggestions: SkillSuggestion[] }> {
  return request<{ suggestions: SkillSuggestion[] }>(
    `/skills/suggest?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}
