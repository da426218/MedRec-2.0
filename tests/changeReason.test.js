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
    expect(result).toBe('Frequency changed');
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

test('Inhaler vs Respiclick brand swap flagged correctly', () => {
    const ctx = loadAppContext();
    const before = ctx.parseOrder(
      'Albuterol HFA 90 mcg 2 puffs PRN'
    );
    const after = ctx.parseOrder(
      'ProAir 90 mcg 2 puffs PRN'
    );
    const result = ctx.getChangeReason(before, after);
    expect(result).toBe('Brand/Generic changed');
  });

  test('Inhaler brand swap \u2013 no frequency flag', () => {
    const ctx = loadAppContext();
    const diff = ctx.getChangeReason(
      {
        drug: 'Albuterol HFA Inhaler',
        frequency: '2 puffs every 4-6h prn',
        form: 'inhaler',
        route: 'inhalation',
        prn: true,
        prnCondition: 'wheezing'
      },
      {
        drug: 'ProAir Respiclick',
        frequency: 'Inhale 2 puffs q6h prn',
        form: 'inhaler',
        route: 'inhalation',
        prn: true,
        prnCondition: 'shortness of breath'
      }
    );
    expect(diff).toBe('Brand/Generic changed');
  });

  test('Warfarin vs Coumadin \u2013 time-of-day only', () => {
    const ctx = loadAppContext();
    const diff = ctx.getChangeReason(
      { drug: 'Warfarin', frequency: 'daily', timeOfDay: '', brandTokens: [], route: '' },
      {
        drug: 'Coumadin',
        frequency: 'daily',
        timeOfDay: 'evening',
        brandTokens: ['coumadin'],
        route: ''
      }
    );
    expect(diff).toBe('Brand/Generic changed, Time of day changed');
  });

  test('Coumadin evening vs Warfarin daily \u2014 no freq change', () => {
    const ctx = loadAppContext();
    const o = 'Warfarin 2.5 mg 1 tab po daily';
    const u = 'Coumadin 2.5 mg 1 tab po daily in evening';
    const reason = ctx.getChangeReason(ctx.parseOrder(o), ctx.parseOrder(u));
    expect(/Frequency changed/.test(reason)).toBe(false);
  });
});
