/**
 * Unit tests for Dispatcher ring-buffer and queue.
 */

import { EVENTS } from '../../src/analytics/constants/events';
import { dispatcher } from '../../src/analytics/core/dispatcher';

describe('Analytics Dispatcher', () => {
  it('queues events and adds to debug log', async () => {
    await dispatcher.track(EVENTS.ELEMENT_CLICK, { element_id: 'sa.global.sidebar.link.item' });
    const log = dispatcher.getDebugLog();
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].event).toBe(EVENTS.ELEMENT_CLICK);
    expect(log[0].props.element_id).toBe('sa.global.sidebar.link.item');
  });

  it('populates standard envelope properties', async () => {
    await dispatcher.track(EVENTS.SCREEN_VIEW, { screen_name: 'test_screen' });
    const log = dispatcher.getDebugLog();
    const event = log[0];
    expect(event.props.session_id).toBeDefined();
    expect(event.props.platform).toBe('web');
    expect(event.props.timestamp_ms).toBeDefined();
  });
});
