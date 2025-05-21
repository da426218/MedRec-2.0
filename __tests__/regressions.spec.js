import { parseOrder } from '../src/parseOrder';
import { getChangeReason } from '../src/getChangeReason';

describe('regressions reported in issue-thread', () => {
  test('Inhaler brand swap should be Unchanged', () => {
    const orig = parseOrder(
      'Albuterol HFA Inhaler 90 mcg/puff - 2 puffs by mouth every 4-6 hours as needed for wheezing'
    );
    const upd = parseOrder(
      'ProAir Respiclick 90 mcg/inhalation - Inhale 2 puffs Q6H PRN for shortness of breath'
    );
    expect(getChangeReason(orig, upd)).toBe('Unchanged');
  });

  test('Coumadin ↔ Warfarin daily dose must NOT raise Frequency changed', () => {
    const orig = parseOrder(
      'Warfarin 2.5mg - Take 1 tablet PO daily'
    );
    const upd = parseOrder(
      'Coumadin 2.5 mg tablets - Take 1 tablet by mouth daily in the evening'
    );
    const reason = getChangeReason(orig, upd);
    expect(reason).toContain('Brand/Generic changed');
    expect(reason).toContain('Time of day changed');
    expect(reason).not.toContain('Frequency changed');
  });
});
