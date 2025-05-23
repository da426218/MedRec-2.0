describe('preprocessOrderString', () => {
  test('captures trough note and cleans string', () => {
    const ctx = loadAppContext();
    const res = ctx.preprocessOrderString('Drug 5 mg - target trough 5-10');
    expect(res.cleanedStr).toBe('drug 5 mg');
    expect(res.troughNote).toBe('target trough 5-10');
  });
});

describe('parseDose', () => {
  test('extracts mg value', () => {
    const ctx = loadAppContext();
    const order = ctx.initOrderObject('Example');
    const str = ctx.parseDose('Example 10 mg', order, 'Example 10 mg');
    expect(order.dose.value).toBe(10);
    expect(order.dose.unit).toBe('mg');
    expect(str.toLowerCase()).toBe('example');
  });
});

describe('parseFrequency', () => {
  test('parses bid frequency', () => {
    const ctx = loadAppContext();
    const order = ctx.initOrderObject('Example');
    const str = ctx.parseFrequency('take 1 tab bid', order, 'take 1 tab bid');
    expect(order.frequency).toBe('bid');
    expect(str).toBe('take 1 tab');
  });
});
