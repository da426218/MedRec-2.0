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
  test('dose and form changes detected for Spiriva Respimat vs tiotropium', () => {
    const ctx = loadAppContext();
    const before = 'Tiotropium 18 mcg capsule – inhale contents of one capsule via HandiHaler once daily';
    const after = 'Spiriva Respimat 2.5 mcg/actuation – 2 inhalations once daily';
    const p1 = ctx.parseOrder(before);
    const p2 = ctx.parseOrder(after);
    const result = ctx.getChangeReason(p1, p2);
    expect(result).toBe('Dose changed, Form changed');
  });
});
