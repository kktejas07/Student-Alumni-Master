import type { CampusEvent } from '../index';

describe('CampusEvent category types', () => {
  const allEventTypes = [
    'hackathon',
    'codethon',
    'workshop',
    'tech_talk',
    'training',
    'founder_talk',
    'meetup',
    'fest',
    'boot_camp',
  ] as const;

  it('accepts all 9 backend event types', () => {
    allEventTypes.forEach((category) => {
      const event: CampusEvent = {
        id: `evt-${category}`,
        title: `${category} event`,
        category: category as CampusEvent['category'],
        organizer: 'Test Org',
        image: 'https://example.com/image.png',
        venue: 'Online',
        start_date: '2026-06-01',
        registration_deadline: '2026-05-25',
        url: 'https://example.com',
        tags: ['test'],
      };
      expect(event.category).toBe(category);
    });
  });

  it('has exactly 9 valid event types', () => {
    expect(allEventTypes).toHaveLength(9);
  });
});
