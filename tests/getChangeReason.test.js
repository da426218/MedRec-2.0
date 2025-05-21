describe('getChangeReason', () => {
  test('Albuterol \u2194 ProAir keeps Brand flag', () => {
    const ctx = loadAppContext();
    const o = 'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheeze';
    const u = 'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob';
    const r = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
    expect(r).toMatch(/Brand\/Generic changed/);
  });
});
