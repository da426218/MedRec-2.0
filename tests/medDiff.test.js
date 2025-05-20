const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadAppContext() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const context = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    window: {},
    document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} },
    firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) }
  };
  vm.createContext(context);
  vm.runInContext(script, context);
  return context;
}

describe('Medication comparison', () => {
  test('dose and form changes detected for Spiriva Respimat vs HandiHaler', () => {
    const ctx = loadAppContext();
    const before =
      'Tiotropium Bromide (Spiriva HandiHaler) 18 mcg capsule – inhale contents of one capsule via HandiHaler device once daily';
    const after = 'Spiriva Respimat 2.5 mcg/actuation – 2 inhalations once daily';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Dose changed, Form changed');
  });

  test('adding nerve pain indication ignored when original blank', () => {
    const ctx = loadAppContext();
    const before = 'Gabapentin 300mg capsule - take 1 cap po tid';
    const after = 'Gabapentin 300mg capsule - take 1 cap po tid for nerve pain';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    expect(p2.indication).toBe('nerve pain');
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Unchanged');
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
});
