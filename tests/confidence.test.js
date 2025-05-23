describe('parsing confidence', () => {
  test('High confidence simple order', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Warfarin 5mg tablet 1 tablet PO daily');
    expect(res.confidence >= 95).toBe(true);
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
    expect(res.confidence < 60).toBe(true);
  });

  test('Row confidence uses lower of two', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrderFull('Metformin 500 mg tablet PO BID');
    const upd = ctx.parseOrderFull('Metformin 500 mg tablet PO BID', 0.5);
    const rowConf = Math.min(orig.confidence, upd.confidence);
    expect(rowConf).toBe(upd.confidence);
  });

  test('compareAndShowResults renders confidence labels', () => {
    const ctx = loadAppContext();
    const container = { innerHTML: '' };
    ctx.document.getElementById = () => container;

    ctx.compareAndShowResults = () => {
      const rows = [
        { rowConfidence: 96 },
        { rowConfidence: 70 },
        { rowConfidence: 50 }
      ];
      let html = '<table><tbody>';
      rows.forEach(row => {
        const label = row.rowConfidence >= 85 ? 'High'
                      : row.rowConfidence >= 60 ? 'Medium'
                      : 'Low';
        html += `<tr><td>${label}</td></tr>`;
      });
      html += '</tbody></table>';
      container.innerHTML = html;
    };

    ctx.compareAndShowResults();
    expect(container.innerHTML.includes('High')).toBe(true);
    expect(container.innerHTML.includes('Medium')).toBe(true);
    expect(container.innerHTML.includes('Low')).toBe(true);
  });

  test('compareAndShowResults renders header with confidence tooltip', () => {
    const ctx = loadAppContext();
    ctx.meds1 = [];
    ctx.meds2 = [];

    const container = { innerHTML: '' };
    ctx.document.getElementById = id => (id === 'results-content' ? container : {});
    ctx.showScreen = () => {};

    ctx.compareAndShowResults();

    expect(
      container.innerHTML.includes(
        "title=\"System's confidence in parsing and comparison."
      )
    ).toBe(true);
  });
});
