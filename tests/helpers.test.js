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

  test('"three times a day" numeric', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('three times a day')).toBe(3);
  });

  test('"five times a day" numeric', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('five times a day')).toBe(5);
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

  test('"q12h" evaluates to twice daily', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('q12h')).toBe(2);
  });

  test('"q48h" evaluates to every other day', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('q48h')).toBe(0.5);
  });

  test('"q2d" evaluates to every other day', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('q2d')).toBe(0.5);
  });

  test('blank frequency treated as once daily', () => {
    const ctx = loadAppContext();
    expect(ctx.freqNumeric('')).toBe(1);
  });
});

describe('todChanged', () => {
  test('different times of day detected', () => {
    const ctx = loadAppContext();
    const a = { frequency: 'pm' };
    const b = { frequency: 'nightly' };
    expect(ctx.todChanged(a, b)).toBe(true);
  });

  test('equivalent times of day not flagged', () => {
    const ctx = loadAppContext();
    const a = { frequency: 'am' };
    const b = { frequency: 'in the morning' };
    expect(ctx.todChanged(a, b)).toBe(false);
  });

  test('missing time of day not flagged', () => {
    const ctx = loadAppContext();
    const a = { frequency: '' };
    const b = { frequency: '' };
    expect(ctx.todChanged(a, b)).toBe(false);
  });

  test('adding noon time of day detected', () => {
    const ctx = loadAppContext();
    const a = { frequency: 'daily' };
    const b = { frequency: 'daily', timeOfDay: 'noon' };
    expect(ctx.todChanged(a, b)).toBe(true);
  });

  test('removing night time of day detected', () => {
    const ctx = loadAppContext();
    const a = { frequency: 'daily', timeOfDay: 'night' };
    const b = { frequency: 'daily' };
    expect(ctx.todChanged(a, b)).toBe(true);
  });
});

describe('normalizeTimeOfDay', () => {
  test('"noon" normalizes to noon', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeTimeOfDay('noon')).toBe('noon');
  });

  test('"midday" normalizes to noon', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeTimeOfDay('midday')).toBe('noon');
  });

  test('plural evenings normalize to evening', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeTimeOfDay('evenings')).toBe('evening');
  });

  test('"in the evenings" normalizes to evening', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeTimeOfDay('in the evenings')).toBe('evening');
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

describe('sameDrugCore', () => {
  test('Lasix vs furosemide treated as same', () => {
    const ctx = loadAppContext();
    expect(ctx.sameDrugCore('Lasix', 'furosemide')).toBe(true);
  });

  test('ProAir vs albuterol treated as same', () => {
    const ctx = loadAppContext();
    expect(ctx.sameDrugCore('ProAir', 'albuterol')).toBe(true);
  });

  test('K-Dur vs potassium chloride treated as same', () => {
    const ctx = loadAppContext();
    expect(ctx.sameDrugCore('K-Dur', 'potassium chloride')).toBe(true);
  });

  test('KDur vs potassium chloride treated as same', () => {
    const ctx = loadAppContext();
    expect(ctx.sameDrugCore('KDur', 'potassium chloride')).toBe(true);
  });

  test('Tylenol vs acetaminophen treated as same', () => {
    const ctx = loadAppContext();
    expect(ctx.sameDrugCore('Tylenol', 'acetaminophen')).toBe(true);
  });
});

describe('parseQuantity', () => {
  test('"2 tabs" parses to 2', () => {
    const ctx = loadAppContext();
    expect(ctx.parseQuantity('2 tabs')).toBe(2);
  });

  test('"one tablet" parses to 1', () => {
    const ctx = loadAppContext();
    expect(ctx.parseQuantity('one tablet')).toBe(1);
  });

  test('"½ tab" parses to 0.5', () => {
    const ctx = loadAppContext();
    expect(ctx.parseQuantity('\u00bd tab')).toBe(0.5);
  });
});
