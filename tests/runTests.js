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
  },
  toEqual: expected => {
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`Expected ${b} but received ${a}`);
    }
  },
  not: {
    toEqual: expected => {
      const a = JSON.stringify(actual);
      const b = JSON.stringify(expected);
      if (a === b) {
        throw new Error(`Expected value not equal to ${b}`);
      }
    },
    toBe: expected => {
      if (actual === expected) {
        throw new Error(`Expected value not to be ${expected}`);
      }
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

function diffRowsList(beforeList, afterList) {
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
  return context.diffRows(beforeList, afterList);
}

global.diffRowsList = diffRowsList;
global.diffRows = diffRowsList;

require('./medDiff.test');

addTest('Metformin evening vs nightly time change', () => {
  const before = 'Metformin hydrochloride 1000mg ER - take one tablet by mouth every evening with supper';
  const after = 'Metformin ER 1000mg - take 1 tab PO nightly with food';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Vitamin D brand/generic without formulation change', () => {
  const before = 'Cholecalciferol 5000 IU softgel - One weekly';
  const after = 'Vitamin D3 2000 units capsule - One daily';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Form changed');
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

addTest('Fluticasone formulation flagged', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray – 2 sprays each nostril daily';
  const after = 'Fluticasone Nasal Spray 50 mcg – 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Quantity changed');
});

addTest('Warfarin sodium formulation difference', () => {
  const before = 'Warfarin sodium 5 mg tablet - take one daily';
  const after = 'Warfarin 5 mg tablet - take one daily';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Warfarin qPM vs evening flagged', () => {
  const before = 'Warfarin 5 mg tablet - take one tablet qPM';
  const after = 'Warfarin 5 mg tablet - take one tablet in the evening';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Insulin Aspart vs Novolog brand generic detection', () => {
  const before = 'Insulin Aspart 10 units SC daily';
  const after = 'Novolog 10 units SC daily';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('PRN condition wording change detected', () => {
  const before = 'Alprazolam 0.5mg tablet - take 1 tab q8h prn anxiety';
  const after = 'Alprazolam 0.5mg tablet - take 1 tab q8h if anxious';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Alprazolam PRN change detected', () => {
  const before = 'Alprazolam 0.25 mg ODT – 1 tab sublingually q6h prn anxiety';
  const after = 'Alprazolam 0.25 mg tablet – 1 tab PO q6h if anxious';
  expect(diff(before, after)).toBe('Route changed, Form changed');
});

addTest('Vitamin D change list enumerated', () => {
  const before = 'Cholecalciferol 5000 IU softgel – One weekly';
  const after = 'Vitamin D3 2000 units capsule – One daily';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Form changed');
});

addTest('Clonidine enumerate changes', () => {
  const before = 'Clonidine 0.1 mg patch – Apply 1 patch topically every 7 days';
  const after = 'Clonidine 0.1 mg tablet – Take 1 tablet by mouth twice a day';
  expect(diff(before, after)).toBe(
    'Frequency changed, Route changed, Form changed'
  );
});

addTest('AF abbreviation normalized', () => {
  const before = 'Metoprolol 50 mg tablet - take 1 tab daily for af';
  const after = 'Metoprolol 50 mg tablet - take 1 tab daily for atrial fibrillation';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Spiriva brand/generic flag', () => {
  const before =
    'Tiotropium Bromide (Spiriva HandiHaler) 18mcg capsule - Inhale contents of one capsule via HandiHaler once daily';
  const after =
    'Spiriva Respimat 2.5mcg/actuation - 2 inhalations once daily';
  expect(diff(before, after))
    .toBe('Dose changed, Brand/Generic changed, Form changed');
});

addTest('HCTZ abbreviation no brand flag', () => {
  const before = 'Lisinopril/HCTZ 20-12.5mg PO daily';
  const after  = 'Lisinopril 20mg / Hydrochlorothiazide 12.5mg PO daily';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Insulin TIDAC equals before meals (no freq flag)', () => {
  const before = 'Insulin Aspart (Novolog) FlexPen - Inject 10 units subcutaneously TIDAC';
  const after  = 'Novolog FlexPen - Inject 12 units SC before meals (breakfast lunch dinner)';
  expect(diff(before, after)).toBe('Dose changed, Brand/Generic changed');
});
addTest('Alprazolam PRN condition only', () => {
  const before = 'Alprazolam 0.25 mg ODT SL q6h prn anxiety';
  const after  = 'Alprazolam 0.25 mg tab PO every 6 hours if anxious';
  expect(diff(before, after))
    .toBe('Route changed, Form changed');
});

addTest('Diclofenac sodium vs potassium flags formulation', () => {
  const before = 'Diclofenac sodium 50 mg tablet PO BID';
  const after  = 'Diclofenac potassium 50 mg tablet PO BID';
  expect(diff(before, after)).toBe('Formulation changed');
});

addTest('Warfarin sodium vs warfarin unchanged', () => {
  const before = 'Warfarin sodium 5 mg tablet po evening';
  const after  = 'Warfarin 5 mg tablet po qpm';
  expect(diff(before, after)).toBe('Unchanged');
});

addTest('Metformin HCl ER vs Metformin ER unchanged', () => {
  const b = 'Metformin hydrochloride 1000 mg ER tablet nightly';
  const a = 'Metformin ER 1000 mg tablet evening';
  expect(diff(b, a)).toBe('Unchanged');
});

addTest('Fluticasone propionate omission not formulation', () => {
  const before = 'Fluticasone Propionate nasal spray 50 mcg – 2 sprays each nostril daily';
  const after  = 'Fluticasone nasal spray 50 mcg – 1 spray each nostril qd';
  expect(diff(before, after)).toBe('Quantity changed');
});

addTest('Anxious vs anxiety = no indication flag', () => {
  const before = 'Alprazolam 0.25 mg ODT SL q6h prn anxiety';
  const after  = 'Alprazolam 0.25 mg tab PO every 6 hours if anxious';
  expect(diff(before, after)).toBe('Route changed, Form changed');
});

addTest('Unchanged rows sorted last', () => {
  const listA = [
    'Metformin 500 mg tab po bid',
    'Amlodipine 5 mg tab po daily'
  ].join('\n');
  const listB = [
    'Metformin 500 mg tab po bid',
    'Amlodipine 10 mg tab po daily'
  ].join('\n');
  const rows = diffRows(listA, listB);
  expect(rows[0].changes).not.toEqual([]);
  expect(rows[rows.length - 1].changes).toEqual([]);
});

addTest('Atorvastatin vs Lipitor brand flag only', () => {
  const b = 'Atorvastatin 40 mg tab po qhs';
  const a = 'Lipitor 40 mg tab at bedtime';
  expect(diff(b,a)).toBe('Brand/Generic changed');
});

addTest('KCl BID wording equal', () => {
  const b = 'Potassium Chloride ER 10 mEq tab po twice a day';
  const a = 'Klor-Con 10 mEq tab po BID';
  expect(diff(b,a).includes('Frequency changed')).toBe(false);
});

addTest('Normalize twice daily with meals', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    window: {},
    document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} },
    firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) }
  };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  expect(ctx.normalizeFrequency('twice daily with meals')).toBe('bid');
});

addTest('Solostar pen form same', () => {
  const b = 'Lantus Solostar 100 u/mL pen inject 20 u qhs';
  const a = 'Insulin glargine 100 u/mL pen inject 25 u at bedtime';
  expect(diff(b, a)).toBe('Dose changed, Brand/Generic changed');
});

addTest('Twice daily with meals equals BID', () => {
  const b = 'KCl ER 10 mEq tab po twice a day with meals';
  const a = 'Klor-Con 10 mEq tab po BID';
  expect(diff(b, a)).toBe('Brand/Generic changed');
});

addTest('Claritin vs loratadine brand only', () => {
  const b = 'Claritin 10 mg tab po daily prn allergies';
  const a = 'Loratadine 10 mg tab po daily as needed for allergies';
  expect(diff(b, a)).toBe('Brand/Generic changed');
});

addTest('Klor-Con brand only', () => {
  const b = 'Potassium Chloride ER 10 mEq tab po twice a day';
  const a = 'Klor-Con 10 mEq tab po BID';
  expect(diff(b,a)).toBe('Brand/Generic changed');
});

addTest('Tylenol brand flag', () => {
  const b = 'Tylenol 500 mg 2 tabs PO q6h prn pain';
  const a = 'Acetaminophen 1000 mg tab PO every 6 hours as needed for pain';
  expect(diff(b, a)).toBe('Dose changed, Quantity changed, Brand/Generic changed');
});

addTest('Implicit tablet form same', () => {
  const before = 'Tylenol 500 mg 2 tabs PO q6h prn pain';
  const after  = 'Acetaminophen 1000 mg PO every 6 hours as needed for pain';
  expect(diff(before, after))
    .toBe('Dose changed, Quantity changed, Brand/Generic changed');
});
