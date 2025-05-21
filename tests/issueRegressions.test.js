describe('issue regressions', () => {
  test('daily same frequency time-of-day only', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the morning');
    const upd = ctx.parseOrder('Metformin 500 mg tablet - take 1 tablet daily in the evening');
    expect(ctx.getChangeReason(orig, upd)).toBe('Time of day changed');
  });

  test('indication-only keeps brand switch', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrder('Albuterol HFA Inhaler 90 mcg/puff - 2 puffs q4-6h PRN wheezing');
    const upd = ctx.parseOrder('ProAir Respiclick 90 mcg/inhalation - inhale 2 puffs q6h PRN shortness of breath');
    expect(ctx.getChangeReason(orig, upd)).toMatch(/Brand\/Generic changed/);
  });

  test('daily same-freq TOD only', () => {
    const ctx = loadAppContext();
    const o = ctx.parseOrder('Warfarin 2.5 mg 1 tab po daily');
    const u = ctx.parseOrder('Coumadin 2.5 mg 1 tab po daily in evening');
    expect(ctx.getChangeReason(o, u)).toBe('Brand/Generic changed, Time of day changed');
  });

  test('brand swap keeps flag', () => {
    const ctx = loadAppContext();
    const o = ctx.parseOrder('Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheezing');
    const u = ctx.parseOrder('ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob');
    expect(ctx.getChangeReason(o, u)).toMatch(/Brand\/Generic changed/);
  });

  test('ProAir vs Albuterol flags brand change', () => {
    const ctx = loadAppContext();
    const o = ctx.parseOrder('Albuterol HFA Inhaler 90 mcg 2 puffs q4-6h PRN wheeze');
    const u = ctx.parseOrder('ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob');
    expect(ctx.getChangeReason(o, u)).toMatch(/Brand\/Generic changed/);
  });

  test('Inhaler brand swap flags brand and indication change', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrder('Albuterol HFA Inhaler 90 mcg/puff - 2 puffs by mouth every 4-6 hours as needed for wheezing');
    const upd = ctx.parseOrder('ProAir Respiclick 90 mcg/inhalation - Inhale 2 puffs Q6H PRN for shortness of breath');
    expect(ctx.getChangeReason(orig, upd)).toBe('Brand/Generic changed, Indication changed');
  });

  test('Coumadin \u2194 Warfarin daily dose keeps brand and time flags only', () => {
    const ctx = loadAppContext();
    const orig = ctx.parseOrder('Warfarin 2.5mg - Take 1 tablet PO daily');
    const upd = ctx.parseOrder('Coumadin 2.5 mg tablets - Take 1 tablet by mouth daily in the evening');
    const reason = ctx.getChangeReason(orig, upd);
    expect(reason.includes('Brand/Generic changed')).toBe(true);
    expect(reason.includes('Time of day changed')).toBe(true);
    expect(reason.includes('Frequency changed')).toBe(false);
  });

  test('Warfarin bedtime switch keeps TOD flag', () => {
    const ctx = loadAppContext();
    const o = 'Warfarin 2.5 mg tablet take 1 PO every morning';
    const u = 'Coumadin 2.5 mg tablet take 1 PO daily in the evening';
    const r = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
    expect(r).toMatch(/Time of day changed/);
  });
});
