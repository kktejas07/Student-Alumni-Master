/**
 * Unit tests for analytics validation logic.
 */

import { EVENTS } from '../../src/analytics/constants/events';
import { ANALYTICS_IDS } from '../../src/analytics/constants/ids';
import { isRegisteredId, validateEvent } from '../../src/analytics/core/validate';

describe('Analytics Validator', () => {
  it('identifies registered element IDs', () => {
    expect(isRegisteredId(ANALYTICS_IDS.echo.register.btn.submit)).toBe(true);
    expect(isRegisteredId('sa.unregistered.button.id')).toBe(false);
  });

  it('validates canonical event names without console errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    validateEvent(EVENTS.ELEMENT_CLICK, { element_id: ANALYTICS_IDS.global.sidebar.link.item });
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('warns when event parameter count exceeds 25', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const largeProps: Record<string, any> = {};
    for (let i = 0; i < 30; i++) {
      largeProps[`prop_${i}`] = i;
    }
    validateEvent(EVENTS.ELEMENT_CLICK, largeProps);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('has 30 parameters')
    );
    consoleSpy.mockRestore();
  });
});
