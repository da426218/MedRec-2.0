describe('parsing confidence', () => {
  test('High confidence simple order', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Warfarin 5mg tablet 1 tablet PO daily');
    expect(res.confidence >= 85).toBe(true);
  });

  test('Low confidence missing dose', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Lisinopril tablets take one daily');
    expect(res.confidence < 60).toBe(true);
  });

  test('Low confidence unparsed text', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Metformin 1000mg ER with supper then random unparsable text string here that makes no sense');
    expect(res.confidence < 60).toBe(true);
  });

  test('Low confidence from OCR input', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Aspirin 81 mg PO daily', 0.5);
    expect(res.confidence < 85).toBe(true);
  });

  test('Row confidence uses lower of two', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrderFull('Metformin 500 mg tablet PO BID');
    const upd = ctx.parseOrderFull('Metformin 500 mg tablet PO BID', 0.5);
    const rowConf = Math.min(orig.confidence, upd.confidence);
    expect(rowConf).toBe(upd.confidence);
  });
});
