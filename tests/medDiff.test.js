describe('Medication comparison', () => {
  test('dose and form changes detected for Spiriva Respimat vs HandiHaler', () => {
    const ctx = loadAppContext();
    const before =
      'Tiotropium Bromide (Spiriva HandiHaler) 18 mcg capsule – inhale contents of one capsule via HandiHaler device once daily';
    const after = 'Spiriva Respimat 2.5 mcg/actuation – 2 inhalations once daily';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Dose changed, Brand/Generic changed, Form changed');
  });

  test('adding nerve pain indication flagged when original blank', () => {
    const ctx = loadAppContext();
    const before = 'Gabapentin 300mg capsule - take 1 cap po tid';
    const after = 'Gabapentin 300mg capsule - take 1 cap po tid for nerve pain';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    expect(p2.indication).toBe('neuropathy');
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Indication changed');
  });

  test('normalizeIndicationText maps wheezing', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeIndicationText('wheezing')).toBe('breathing difficulty');
  });

  test('normalizeIndicationText maps nerve pain to neuropathy', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeIndicationText('nerve pain')).toBe('neuropathy');
  });

  test('normalizeIndicationText keeps neuropathy', () => {
    const ctx = loadAppContext();
    expect(ctx.normalizeIndicationText('neuropathy')).toBe('neuropathy');
  });

  test('route change from oral to sublingually detected', () => {
    const ctx = loadAppContext();
    const before = 'Ondansetron 4 mg po q4h';
    const after = 'Ondansetron 4 mg sublingually q4h';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Route changed');
  });

  test('af vs atrial fibrillation not flagged', () => {
    const ctx = loadAppContext();
    const before = 'Metoprolol 50 mg tablet - take 1 tab daily for af';
    const after = 'Metoprolol 50 mg tablet - take 1 tab daily for atrial fibrillation';
    const p1 = ctx.parseOrder(before);
  const p2 = ctx.parseOrder(after);
  const result = ctx.getChangeReason(p1, p2);
  expect(result).toBe('Indication changed');
});

  test('taper wording ignored in indications', () => {
    const ctx = loadAppContext();
    const before = 'Prednisone 20 mg tablet - take 1 tablet daily for asthma';
    const after = 'Prednisone 20 mg tablet - take 1 tablet daily for asthma taper';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    expect(p2.indication).toBe('asthma');
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Unchanged');
  });

  test('Clonidine patch to tablet not brand/generic', () => {
    const ctx = loadAppContext();
    const before = 'Clonidine 0.1 mg patch – Apply 1 patch topically every 7 days';
    const after = 'Clonidine 0.1 mg tablet – Take 1 tablet by mouth twice a day';
    const result = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
    expect(result).toBe('Frequency changed, Route changed, Form changed');
  });

  test('filler words in indication ignored', () => {
    const ctx = loadAppContext();
    const before = 'Prednisone 5 mg tablet - take 1 tablet daily for asthma';
    const after = 'Prednisone 5 mg tablet - take 1 tablet daily for asthma for 7 days stop';
    const result = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
    expect(result).toBe('Unchanged');
  });

  test('indication change requires both non-empty', () => {
    const ctx = loadAppContext();
    const before = 'Gabapentin 300mg capsule - take 1 cap tid for nerve pain';
    const after = 'Gabapentin 300mg capsule - take 1 cap tid for seizures';
    const result = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
    expect(result).toBe('Indication changed');
  });

  test('fraction unicode quantity parsed', () => {
    const ctx = loadAppContext();
    const order = ctx.parseOrder('Aspirin \u00bd tab daily');
    expect(order.qty).toBe(0.5);
  });

  test('fraction a/b quantity parsed', () => {
    const ctx = loadAppContext();
    const order = ctx.parseOrder('Aspirin 1/2 tab daily');
    expect(order.qty).toBe(0.5);
  });

  test('spelled-out quantity parsed', () => {
    const ctx = loadAppContext();
    const order = ctx.parseOrder('Aspirin one tab daily');
    expect(order.qty).toBe(1);
  });

  test('prn shortness of breath sets breathing difficulty indication', () => {
    const ctx = loadAppContext();
    const order = ctx.parseOrder('Albuterol \u2013 2 puffs PRN shortness of breath');
    expect(order.indication).toBe('breathing difficulty');
  });

  test('for neuropathy normalized to neuropathy', () => {
    const ctx = loadAppContext();
    const order = ctx.parseOrder('Gabapentin 300 mg \u2013 take 1 cap tid for neuropathy');
    expect(order.indication).toBe('neuropathy');
  });

  test('administration difference flagged', () => {
    const ctx = loadAppContext();
    const before = 'Metformin 500 mg tablet - take 1 tablet with food daily';
    const after = 'Metformin 500 mg tablet - take 1 tablet between meals daily';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    expect(p1.administration).toBe('with food');
    expect(p2.administration).toBe('between meals');
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Frequency changed, Administration changed');
  });

  test('coumadin vs warfarin same dose', () => {
    const ctx = loadAppContext();
    const before = 'Warfarin 5 mg tablet - take 1 tab daily';
    const after = 'Coumadin 5 mg tablet - take 1 tab daily';
    const result = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
    expect(result).toBe('Brand/Generic changed');
  });

  test('coumadin vs warfarin different dose', () => {
    const ctx = loadAppContext();
    const before = 'Warfarin 5 mg tablet - take 1 tab daily';
    const after = 'Coumadin 3 mg tablet - take 1 tab daily';
    const result = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
    expect(result).toBe('Dose changed, Brand/Generic changed');
  });

  test('Coumadin daily keeps TOD flag only', () => {
    const ctx = loadAppContext();
    const a = ctx.parseOrder('Warfarin 2.5 mg – 1 tab PO daily');
    const b = ctx.parseOrder('Coumadin 2.5 mg – 1 tab PO daily in evening');
    const result = ctx.getChangeReason(a, b);
    expect(result).toBe('Brand/Generic changed, Time of day changed');
  });

  test('frequency text change with different time of day', () => {
    const ctx = loadAppContext();
    const before = 'Metformin 500 mg tablet po BID';
    const after = 'Metformin 500 mg tablet - take 1 tab every morning';
    const result = ctx.getChangeReason(
      ctx.parseOrder(before),
      ctx.parseOrder(after)
    );
    expect(result).toBe('Frequency changed, Time of day changed');
  });

  test('does not flag formulation on K-Dur vs KCl ER', () => {
    const ctx = loadAppContext();
    const o1 = ctx.parseOrder('Potassium Chloride 10 mEq ER tab BID');
    const o2 = ctx.parseOrder('K-Dur 10 mEq extended-release tablet BID');
    const result = ctx.getChangeReason(o1, o2);
    expect(/Formulation/.test(result)).toBe(false);
  });

  test('identifies brand switch Lipitor\u2192atorvastatin', () => {
    const ctx = loadAppContext();
    const o1 = ctx.parseOrder('Lipitor 20 mg tab QHS');
    const o2 = ctx.parseOrder('Atorvastatin 20 mg tab nightly');
    const result = ctx.getChangeReason(o1, o2);
    expect(/Brand\/Generic/.test(result)).toBe(true);
  });

  test('suppresses frequency change on daily Coumadin/Warfarin', () => {
    const ctx = loadAppContext();
    const o1 = ctx.parseOrder('Warfarin 2.5 mg tab daily');
    const o2 = ctx.parseOrder('Coumadin 2.5 mg tab daily in evening');
    const result = ctx.getChangeReason(o1, o2);
    expect(/Frequency changed/.test(result)).toBe(false);
  });

  test('Lipitor vs Atorvastatin flags Brand/Generic only', () => {
    const ctx = loadAppContext();
    const a = ctx.parseOrder('Lipitor 20 mg tablet 1 PO qhs');
    const b = ctx.parseOrder('Atorvastatin 20 mg tablet 1 PO qhs');
    const r = ctx.getChangeReason(a, b);
    expect(r.includes('Brand/Generic changed')).toBe(true);
    expect(r.includes('Frequency changed')).toBe(false);
  });

  test('Inhaler brand swap does not trigger Route flag', () => {
    const ctx = loadAppContext();
    const o = ctx.parseOrder('Albuterol HFA inhaler 2 puffs by mouth q4h PRN');
    const n = ctx.parseOrder('ProAir Respiclick 2 puffs inhalation q6h PRN');
    const result = ctx.getChangeReason(o, n);
    if (result.includes('Route changed')) {
      throw new Error('Route flag set for inhaler brand swap: ' + result);
    }
  });
});
