import { parseOrder } from '../src/parseOrder';
import { getChangeReason } from '../src/getChangeReason';

test('daily same frequency time-of-day only', () => {
  const orig = parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the morning');
  const upd = parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the evening');
  expect(getChangeReason(orig, upd)).toBe('Time of day changed');
});
