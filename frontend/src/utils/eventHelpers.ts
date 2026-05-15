export const EVENT_TYPE_LABELS: Record<string, string> = {
  hackathon: 'Hackathon',
  codethon: 'Codethon',
  workshop: 'Workshop',
  tech_talk: 'Tech Talk',
  training: 'Training',
  founder_talk: 'Founder Talk',
  meetup: 'Meetup',
  fest: 'Fest',
  boot_camp: 'Boot Camp',
};

export function getEventTypeLabel(type: string): string {
  return EVENT_TYPE_LABELS[type] ?? type;
}

export const EVENT_TYPE_COLORS: Record<string, string> = {
  hackathon: '#7C3AED',
  codethon: '#3B82F6',
  workshop: '#10B981',
  tech_talk: '#F59E0B',
  training: '#EF4444',
  founder_talk: '#EC4899',
  meetup: '#6366F1',
  fest: '#8B5CF6',
  boot_camp: '#14B8A6',
};

export function getEventTypeColor(type: string): string {
  return EVENT_TYPE_COLORS[type] ?? '#6B7280';
}
