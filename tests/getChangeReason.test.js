describe('getChangeReason', () => {
  const pairs = [
    [
      'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheeze',
      'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob'
    ],
    [
      'ProAir Respiclick 90 mcg inhale 2 puffs q6h PRN sob',
      'Albuterol HFA 90 mcg 2 puffs q4-6h PRN wheeze'
    ]
  ];

  for (const [o, u] of pairs) {
    test(`Albuterol \u2194 ProAir keeps Brand flag (${o} => ${u})`, () => {
      const ctx = loadAppContext();
      const r = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
      expect(r).toMatch(/Brand\/Generic changed/);
    });
  }

  test('Once-daily \u279c TID keeps frequency and flags TOD shift', () => {
    const ctx = loadAppContext();
    const o = 'Gabapentin 300 mg 1 cap at bedtime';
    const u = 'Gabapentin 300 mg 1 cap three times daily';
    const r = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
    expect(r).toMatch(/Frequency changed/);
    expect(r).toMatch(/Time of day changed/);
  });
});
