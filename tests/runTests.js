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
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Brand/Generic changed');
});

addTest('Metformin evening vs nightly time change', () => {
  const before = 'Metformin hydrochloride 1000mg ER - take one tablet by mouth every evening with supper';
  const after = 'Metformin ER 1000mg - take 1 tab PO nightly with food';
  expect(diff(before, after)).toBe('Formulation changed, Time of day changed');
});

addTest('Vitamin D brand/generic without formulation change', () => {
  const before = 'Cholecalciferol 5000 IU softgel - One weekly';
  const after = 'Vitamin D3 2000 units capsule - One daily';
  expect(diff(before, after)).toBe('Multiple changes');
});

addTest('Fluticasone spray dose total', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray - 2 sprays in each nostril once daily';
  const after = 'Fluticasone Nasal Spray 50mcg - Use 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Quantity changed');
});

addTest('Fluticasone quantity change', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray – 2 sprays in each nostril daily';
  const after = 'Fluticasone Nasal Spray 50 mcg – 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Quantity changed');
});

addTest('Warfarin sodium formulation difference', () => {
  const before = 'Warfarin sodium 5 mg tablet - take one daily';
  const after = 'Warfarin 5 mg tablet - take one daily';
  expect(diff(before, after)).toBe('Formulation changed');
});

addTest('Warfarin qPM vs evening flagged', () => {
  const before = 'Warfarin 5 mg tablet - take one tablet qPM';
  const after = 'Warfarin 5 mg tablet - take one tablet in the evening';
  expect(diff(before, after)).toBe('Time of day changed');
});

addTest('Insulin Aspart vs Novolog brand generic detection', () => {
  const before = 'Insulin Aspart 10 units SC daily';
  const after = 'Novolog 10 units SC daily';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('PRN condition wording change detected', () => {
  const before = 'Alprazolam 0.5mg tablet - take 1 tab q8h prn anxiety';
  const after = 'Alprazolam 0.5mg tablet - take 1 tab q8h if anxious';
  expect(diff(before, after)).toBe('PRN changed');
});

addTest('Alprazolam PRN change detected', () => {
  const before = 'Alprazolam 0.25 mg ODT – 1 tab sublingually q6h prn anxiety';
  const after = 'Alprazolam 0.25 mg tablet – 1 tab PO q6h if anxious';
  expect(diff(before, after)).toBe('Route changed, Form changed, PRN changed');

addTest('Novolog brand name flagged', () => {
  const before = 'Insulin Aspart (Novolog) FlexPen - Inject 10 units subcutaneously TIDAC';
  const after = 'Novolog FlexPen - Inject 12 units SC before meals (breakfast lunch dinner)';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Brand/Generic changed');

});
