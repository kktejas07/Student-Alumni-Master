import { withDefaults } from '../withDefaults';

const DEFAULTS = {
  student: { name: '', career: { goal: '', progressPct: 0 }, tier: null as null | { id: string } },
  kpis: [] as { id: string }[],
  profileCompletion: { score: 0, missing: [] as string[] },
};

describe('withDefaults', () => {
  it('returns defaults for null / undefined payloads', () => {
    expect(withDefaults(DEFAULTS, null)).toBe(DEFAULTS);
    expect(withDefaults(DEFAULTS, undefined)).toBe(DEFAULTS);
  });

  it('fills nested gaps from defaults (partial `student: {}`)', () => {
    const out = withDefaults(DEFAULTS, { student: {}, kpis: [{ id: 'a' }] });
    expect(out.student.career.progressPct).toBe(0);
    expect(out.student.name).toBe('');
    expect(out.kpis).toEqual([{ id: 'a' }]);
    expect(out.profileCompletion).toEqual({ score: 0, missing: [] });
  });

  it('lets API scalars, arrays and nulls-for-nullable-fields win', () => {
    const out = withDefaults(DEFAULTS, {
      student: { name: 'Asha', career: { progressPct: 42 }, tier: { id: 'gold' } },
      profileCompletion: { score: 80, missing: ['photo'] },
    });
    expect(out.student.name).toBe('Asha');
    expect(out.student.career).toEqual({ goal: '', progressPct: 42 });
    expect(out.student.tier).toEqual({ id: 'gold' });
    expect(out.profileCompletion.missing).toEqual(['photo']);
  });

  it('keeps extra keys the view did not declare', () => {
    const out = withDefaults(DEFAULTS, { extra: 1 }) as any;
    expect(out.extra).toBe(1);
  });

  it('does not merge arrays or non-plain objects', () => {
    expect(withDefaults([1, 2], [3])).toEqual([3]);
    const d = new Date(0);
    expect(withDefaults({ when: d }, { when: null }).when).toBe(d);
  });
});
