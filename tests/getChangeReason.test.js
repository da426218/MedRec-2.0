describe('getChangeReason', () => {
  const cases = [
    [
      'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheeze',
      'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob'
    ],
    [
      'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob',
      'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheeze'
    ]
  ];

  test.each(cases)('Albuterol \u2194 ProAir keeps Brand flag (%s => %s)', (o, u) => {
    const ctx = loadAppContext();
    const r = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
    expect(r).toMatch(/Brand\/Generic changed/);
  });
});
