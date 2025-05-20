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

  test("'three times a day' normalizes to tid", () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeFrequency('three times a day')).toBe('tid');
  });

  test("'four times a day' normalizes to qid", () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeFrequency('four times a day')).toBe('qid');
  });

  test("'every 4-6 hours' normalizes to q4-6h", () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeFrequency('every 4-6 hours')).toBe('q4-6h');
  });

  test("'every 4 to 6 hours' normalizes to q4-6h", () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeFrequency('every 4 to 6 hours')).toBe('q4-6h');
  });

  test("freqNumeric handles ranges like 'q4-6h'", () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('q4-6h')).toBe(24 / 5);
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
