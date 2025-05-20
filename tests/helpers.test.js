describe('freqNumeric', () => {
  test('BID normalizes to 2', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('BID')).toBe(2);
  });

  test('twice daily normalizes to 2', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('twice daily')).toBe(2);
  });

  test('"2 times a day" normalizes to 2', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('2 times a day')).toBe(2);
  });

  test('blank frequency treated as once daily', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('')).toBe(1);
  });
});

describe('todChanged', () => {
  test('different times of day detected', () => {
    const ctx = loadAppContext();
    const a = { timeOfDay: 'pm' };
    const b = { timeOfDay: 'nightly' };
    expect(ctx.todChanged(a, b)).toBe(true);
  });

  test('equivalent times of day not flagged', () => {
    const ctx = loadAppContext();
    const a = { timeOfDay: 'am' };
    const b = { timeOfDay: 'in the morning' };
    expect(ctx.todChanged(a, b)).toBe(false);
  });

  test('missing time of day not flagged', () => {
    const ctx = loadAppContext();
    const a = { timeOfDay: '' };
    const b = { timeOfDay: '' };
    expect(ctx.todChanged(a, b)).toBe(false);
  });
});

describe('canonFormulation comparisons', () => {
  test('ER vs extended release not flagged', () => {
    const ctx = loadAppContext();
    const before = ctx.parseOrder('metformin ER tablet');
    const after = ctx.parseOrder('metformin extended release tablet');
    expect(ctx.getChangeReason(before, after)).toBe('Unchanged');
  });
});
