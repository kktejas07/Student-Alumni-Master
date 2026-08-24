import { NETWORK_SECTIONS } from '../ExploreData';

describe('exploreData Network Discover section', () => {
  const discoverSection = NETWORK_SECTIONS.find((s) => s.id === 'discover');

  it('exports a discover section', () => {
    expect(discoverSection).toBeDefined();
  });

  it('contains all 9 backend event type categories', () => {
    const expectedIds = [
      'events',
      'live',
      'hackathons',
      'codethons',
      'workshops',
      'tech-talks',
      'training',
      'founder-talks',
      'meetups',
      'fests',
      'boot-camps',
    ];

    const itemIds = discoverSection!.items.map((item) => item.id);
    expectedIds.forEach((id) => {
      expect(itemIds).toContain(id);
    });
  });

  it('has 11 discover items total', () => {
    expect(discoverSection!.items).toHaveLength(11);
  });
});
