import { parseOrder } from '../src/parseOrder';
import { getChangeReason } from '../src/getChangeReason';

test('daily same frequency time-of-day only', () => {
  const orig = parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the morning');
  const upd = parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the evening');
  expect(getChangeReason(orig, upd)).toBe('Time of day changed');
});

test('indication-only keeps brand switch', () => {
  const orig = parseOrder('Albuterol HFA Inhaler 90 mcg/puff - 2 puffs q4-6h PRN wheezing');
  const upd = parseOrder('ProAir Respiclick 90 mcg/inhalation - inhale 2 puffs q6h PRN shortness of breath');
  expect(getChangeReason(orig, upd)).toMatch(/Brand\/Generic changed/);
});

test('daily same-freq TOD only', () => {
  const o = 'Warfarin 2.5 mg 1 tab po daily';
  const u = 'Coumadin 2.5 mg 1 tab po daily in evening';
  expect(getChangeReason(parseOrder(o), parseOrder(u)))
    .toBe('Brand/Generic changed, Time of day changed');
});

test('brand swap keeps flag', () => {
  const o = 'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheezing';
  const u = 'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob';
  expect(getChangeReason(parseOrder(o), parseOrder(u)))
    .toMatch(/Brand\/Generic changed/);
});

test('ProAir vs Albuterol flags brand change', () => {
  const o = 'Albuterol HFA Inhaler 90 mcg 2 puffs q4-6h PRN wheeze';
  const u = 'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob';
  expect(getChangeReason(parseOrder(o), parseOrder(u)))
    .toMatch(/Brand\/Generic changed/);
});
