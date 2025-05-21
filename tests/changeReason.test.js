describe('getChangeReason', () => {
  test('BID vs two times a day not flagged as frequency change', () => {
    const ctx = loadAppContext();
    const before = {
      drug: 'Metformin 500mg',
      frequency: 'BID',
      scheduleTokens: [],
      route: ''
    };
    const after = {
      drug: 'Metformin HCl ER 500mg',
      frequency: 'two times a day',
      scheduleTokens: [],
      route: ''
    };
    const result = ctx.getChangeReason(before, after);
    expect(/Frequency changed/.test(result)).toBe(false);
  });

  test('Meals wording normalized without frequency flag', () => {
    const ctx = loadAppContext();
    const before = {
      drug: 'Metformin',
      frequency: 'two tabs po bid with meals',
      route: ''
    };
    const after = {
      drug: 'Metformin ER',
      frequency: '2 tabs orally two times a day with food',
      route: ''
    };
    const result = ctx.getChangeReason(before, after);
    expect(result.includes('Frequency changed')).toBe(false);
  });

  test('Inhaler brand swap not flagged as frequency change', () => {
    const ctx = loadAppContext();
    const before = ctx.parseOrder(
      'Albuterol HFA inhaler 90 mcg/puff - 2 puffs q6h as needed'
    );
    const after = ctx.parseOrder(
      'ProAir HFA inhaler 90 mcg/puff - 2 puffs q6h prn'
    );
    const result = ctx.getChangeReason(before, after);
    expect(result).toBe('Brand/Generic changed');
  });
});
