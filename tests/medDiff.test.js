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

  test('adding nerve pain indication detected', () => {
    const ctx = loadAppContext();
    const before = 'Gabapentin 300mg capsule - take 1 cap po tid';
    const after = 'Gabapentin 300mg capsule - take 1 cap po tid for nerve pain';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    expect(p2.indication).toBe('nerve pain');
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Indication changed');
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
});
