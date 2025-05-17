// Minimal test harness to run Jest-style tests without dependencies
global.describe = (name, fn) => { console.log(name); fn(); };
global.test = (name, fn) => {
  try {
    fn();
    console.log('  \x1b[32m✓\x1b[0m', name);
  } catch (err) {
    console.log('  \x1b[31m✗\x1b[0m', name);
    console.error(err.message);
    process.exitCode = 1;
  }
};

global.expect = actual => ({
  toBe: expected => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but received ${actual}`);
    }
  }
});

// Alias used by some tests
global.addTest = (name, fn) => test(name, fn);

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function diff(before, after) {
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
  const p1 = context.parseOrder(before);
  const p2 = context.parseOrder(after);
  return context.getChangeReason(p1, p2);
}

require('./medDiff.test');

addTest('Insulin before-meals equals TIDAC dose & freq change', () => {
  const before = 'Insulin Aspart (Novolog) FlexPen - Inject 10 units subcutaneously TIDAC';
  const after = 'Novolog FlexPen - Inject 12 units SC before meals (breakfast lunch dinner)';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed');
});

addTest('Fluticasone spray dose total', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray - 2 sprays in each nostril once daily';
  const after = 'Fluticasone Nasal Spray 50mcg - Use 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Dose changed');
});
