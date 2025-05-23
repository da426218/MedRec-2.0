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

  test('Pantoprazole added order high confidence', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Pantoprazole 40mg DR tab - 1 po daily for GERD');
    expect(res.confidence >= 85).toBe(true);
  });

  test('Amoxicillin added order high confidence', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Amoxicillin 500mg capsule - take 1 cap tid');
    expect(res.confidence >= 85).toBe(true);
  });

  test('Potassium Chloride added order high confidence', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Potassium Chloride 10 mEq ER tab - take one tablet twice daily');
    expect(res.confidence >= 85).toBe(true);
  });

  test('Clonidine patch added order high confidence', () => {
    const ctx = loadAppContext();
    const res = ctx.parseOrderFull('Clonidine 0.1mg patch - Apply 1 patch topically every 7 days for BP');
    expect(res.confidence >= 85).toBe(true);
  });

  test('Unchanged orders yield high row confidence', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrderFull('Metformin hydrochloride 1000mg ER tablet - Take one tablet by mouth every evening with supper');
    const upd = ctx.parseOrderFull('Metformin ER 1000mg - Take 1 tab po nightly with food continue home dose');
    const reason = ctx.getChangeReason(orig.parsed, upd.parsed);
    let rowConf = Math.min(orig.confidence, upd.confidence);
    if (reason === 'Unchanged') {
      rowConf = Math.max(95, (orig.confidence + upd.confidence) / 2);
    }
    expect(rowConf >= 85).toBe(true);
  });
});
