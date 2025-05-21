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
});
