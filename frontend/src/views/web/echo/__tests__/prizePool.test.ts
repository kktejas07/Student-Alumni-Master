/**
 * prizePoolDisplayText — Phase 4 regression tests.
 *
 * The public ECHO detail page renders the showcase `prize_pool` value as a
 * React text child. CMS records store either a plain string (CBIT) or an
 * object { total, grand_pool, tracks, ... } (SNIST / VNR). Before the
 * remediation the page rendered the value raw and React threw
 * "Objects are not valid as a React child" for the object shape.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { prizePoolDisplayText } from '../prizePool';

describe('prizePoolDisplayText — shape handling', () => {
  it('returns the total for object-shaped prize pools (SNIST / VNR)', () => {
    expect(prizePoolDisplayText({ total: '₹17,50,000+', grand_pool: '₹2,00,000', tracks: '₹50,000' })).toBe('₹17,50,000+');
    expect(prizePoolDisplayText({ total: '₹30,000' })).toBe('₹30,000');
  });

  it('accepts numeric totals', () => {
    expect(prizePoolDisplayText({ total: 35000 })).toBe('35000');
  });

  it('returns the trimmed string for string-shaped prize pools (CBIT)', () => {
    expect(prizePoolDisplayText('₹35,000 prize pool')).toBe('₹35,000 prize pool');
    expect(prizePoolDisplayText('  ₹35,000 prize pool ')).toBe('₹35,000 prize pool');
  });

  it('never throws and returns a string for every degenerate input', () => {
    const inputs: unknown[] = [
      null,
      undefined,
      {},
      { total: null },
      { total: '' },
      { grand_pool: '₹2,00,000' }, // no total → not a pill-worthy text
      42,
      ['₹300', '₹400'],
      true,
    ];
    for (const input of inputs) {
      let result: string | null = null;
      expect(() => { result = prizePoolDisplayText(input); }).not.toThrow();
      expect(typeof result).toBe('string');
    }
    expect(prizePoolDisplayText(null)).toBe('');
    expect(prizePoolDisplayText({ grand_pool: '₹2,00,000' })).toBe('');
  });
});

describe('prize pill render safety (React children)', () => {
  it('renders both stored shapes as React text children without throwing', () => {
    const dictHtml = renderToStaticMarkup(
      React.createElement('span', { title: 'prize' }, prizePoolDisplayText({
        total: '₹17,50,000+',
        tracks: '₹50,000',
      })),
    );
    expect(dictHtml).toBe('<span title="prize">₹17,50,000+</span>');

    const strHtml = renderToStaticMarkup(
      React.createElement('span', null, prizePoolDisplayText('₹35,000 prize pool')),
    );
    expect(strHtml).toBe('<span>₹35,000 prize pool</span>');
  });

  it('documents the pre-fix failure mode: a raw object child throws', () => {
    let thrown: unknown = null;
    try {
      renderToStaticMarkup(React.createElement('span', null, { total: 'x' } as never));
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeTruthy();
    expect(String(thrown)).toMatch(/Objects are not valid as a React child/);
  });
});
