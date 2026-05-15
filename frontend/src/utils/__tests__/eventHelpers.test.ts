import {
  EVENT_TYPE_LABELS,
  getEventTypeLabel,
  EVENT_TYPE_COLORS,
  getEventTypeColor,
} from '../eventHelpers';

describe('eventHelpers', () => {
  describe('EVENT_TYPE_LABELS', () => {
    it('contains all 9 event types', () => {
      const expectedTypes = [
        'hackathon',
        'codethon',
        'workshop',
        'tech_talk',
        'training',
        'founder_talk',
        'meetup',
        'fest',
        'boot_camp',
      ];
      expectedTypes.forEach((type) => {
        expect(EVENT_TYPE_LABELS).toHaveProperty(type);
      });
    });
  });

  describe('getEventTypeLabel', () => {
    it('returns human-readable labels for all 9 types', () => {
      expect(getEventTypeLabel('hackathon')).toBe('Hackathon');
      expect(getEventTypeLabel('codethon')).toBe('Codethon');
      expect(getEventTypeLabel('workshop')).toBe('Workshop');
      expect(getEventTypeLabel('tech_talk')).toBe('Tech Talk');
      expect(getEventTypeLabel('training')).toBe('Training');
      expect(getEventTypeLabel('founder_talk')).toBe('Founder Talk');
      expect(getEventTypeLabel('meetup')).toBe('Meetup');
      expect(getEventTypeLabel('fest')).toBe('Fest');
      expect(getEventTypeLabel('boot_camp')).toBe('Boot Camp');
    });

    it('falls back to raw type for unknown values', () => {
      expect(getEventTypeLabel('unknown_type')).toBe('unknown_type');
    });
  });

  describe('getEventTypeColor', () => {
    it('returns a color for all 9 types', () => {
      const types = [
        'hackathon',
        'codethon',
        'workshop',
        'tech_talk',
        'training',
        'founder_talk',
        'meetup',
        'fest',
        'boot_camp',
      ];
      types.forEach((type) => {
        const color = getEventTypeColor(type);
        expect(color).toBeTruthy();
        expect(color).toMatch(/^#/);
      });
    });

    it('returns default gray for unknown types', () => {
      expect(getEventTypeColor('unknown')).toBe('#6B7280');
    });
  });
});
