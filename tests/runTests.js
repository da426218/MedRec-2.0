try { require('firebase'); } catch (_) {
  global.firebase = {};           // bare stub so require() later won’t fail
}

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

function arrayContains(haystack, needles) {
  return needles.every(n => haystack.includes(n));
}

global.expect = actual => ({
  toBe: expected => {
    if (actual !== expected) {
      throw new Error(`Expected ${expected} but received ${actual}`);
    }
  },
  toEqual: expected => {
    if (expected && expected.__arrayContaining) {
      if (!Array.isArray(actual)) {
        throw new Error('Expected an array for arrayContaining check');
      }
      const arr = expected.__arrayContaining;
      if (!arrayContains(actual, arr)) {
        throw new Error(
          `Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(arr)}`
        );
      }
      return;
    }
    const a = JSON.stringify(actual);
    const b = JSON.stringify(expected);
    if (a !== b) {
      throw new Error(`Expected ${b} but received ${a}`);
    }
  },
  toMatch: regex => {
    if (!regex.test(String(actual))) {
      throw new Error(`Expected ${actual} to match ${regex}`);
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
    },
    toMatch: regex => {
      if (regex.test(String(actual))) {
        throw new Error(`Expected ${actual} not to match ${regex}`);
      }
    }
  }
});

global.expect.arrayContaining = arr => ({ __arrayContaining: arr });

// Alias used by some tests
global.addTest = (name, fn) => test(name, fn);

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let cachedContext = null;

function loadAppContext() {
  if (cachedContext) return cachedContext;
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
  cachedContext = context;
  return context;
}

function diff(before, after) {
  const context = loadAppContext();
  const p1 = context.parseOrder(before);
  const p2 = context.parseOrder(after);
  const result = context.getChangeReason(p1, p2);
  return result === 'Unchanged' ? '' : result;
}

function diffRowsList(beforeList, afterList) {
  const context = loadAppContext();
  return context.diffRows(beforeList, afterList);
}

global.diffRowsList = diffRowsList;
global.diffRows = diffRowsList;
global.loadAppContext = loadAppContext;
// Expose core helpers for convenience in tests
global.parseOrder = (...args) => loadAppContext().parseOrder(...args);
global.getChangeReason = (...args) =>
  loadAppContext().getChangeReason(...args);

require('./medDiff.test');
require('./helpers.test');
require('./changeReason.test');
require('./getChangeReason.test');
require('./issueRegressions.test');

addTest('Metformin evening vs nightly time change', () => {
  const before = 'Metformin 500 mg tablet po BID';
  const after = 'Metformin 500 mg tablet - take 1 tab every morning';
  expect(diff(before, after)).toBe('Frequency changed, Time of day changed');
});

addTest('Vitamin D brand/generic without formulation change', () => {
  const before = 'Cholecalciferol 5000 IU softgel - One weekly';
  const after = 'Vitamin D3 2000 units capsule - One daily';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Brand/Generic changed, Form changed');
});

addTest('Fluticasone spray dose total', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray - 2 sprays in each nostril once daily';
  const after = 'Fluticasone Nasal Spray 50mcg - Use 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Dose changed, Quantity changed');
});

addTest('Fluticasone quantity change', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray – 2 sprays in each nostril daily';
  const after = 'Fluticasone Nasal Spray 50 mcg – 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Dose changed, Quantity changed');
});

addTest('Fluticasone formulation flagged', () => {
  const before = 'Fluticasone Propionate Nasal Spray 50 mcg/spray – 2 sprays each nostril daily';
  const after = 'Fluticasone Nasal Spray 50 mcg – 1 spray per nostril qd';
  expect(diff(before, after)).toBe('Dose changed, Quantity changed');
});

addTest('Warfarin sodium formulation difference', () => {
  const before = 'Warfarin sodium 5 mg tablet - take one daily';
  const after = 'Warfarin 5 mg tablet - take one daily';
  expect(diff(before, after)).toBe('');
});

addTest('Warfarin qPM vs evening flagged', () => {
  const before = 'Warfarin 5 mg tablet - take one tablet qPM';
  const after = 'Warfarin 5 mg tablet - take one tablet in the evening';
  expect(diff(before, after)).toBe('');
});

addTest('Insulin Aspart vs Novolog brand generic detection', () => {
  const before = 'Insulin Aspart 10 units SC daily';
  const after = 'Novolog 10 units SC daily';
  expect(diff(before, after)).toMatch(/brand\/generic changed/i);
});

addTest('PRN condition wording change detected', () => {
  const before = 'Alprazolam 0.5mg tablet - take 1 tab q8h prn anxiety';
  const after = 'Alprazolam 0.5mg tablet - take 1 tab q8h if anxious';
  expect(diff(before, after)).toBe('');
});

addTest('Alprazolam PRN change detected', () => {
  const before = 'Alprazolam 0.25 mg ODT – 1 tab sublingually q6h prn anxiety';
  const after = 'Alprazolam 0.25 mg tablet – 1 tab PO q6h if anxious';
  expect(diff(before, after)).toBe('Route changed, Form changed');
});

addTest('Vitamin D change list enumerated', () => {
  const before = 'Cholecalciferol 5000 IU softgel – One weekly';
  const after = 'Vitamin D3 2000 units capsule – One daily';
  expect(diff(before, after)).toBe('Dose changed, Frequency changed, Brand/Generic changed, Form changed');
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
  expect(diff(before, after)).toBe('Indication changed');
});

addTest('Spiriva brand/generic flag', () => {
  const before =
    'Tiotropium Bromide (Spiriva HandiHaler) 18mcg capsule - Inhale contents of one capsule via HandiHaler once daily';
  const after =
    'Spiriva Respimat 2.5mcg/actuation - 2 inhalations once daily';
  expect(diff(before, after)).toBe('Dose changed, Brand/Generic changed, Form changed');
});

addTest('HCTZ abbreviation no brand flag', () => {
  const before = 'Lisinopril/HCTZ 20-12.5mg PO daily';
  const after  = 'Lisinopril 20mg / Hydrochlorothiazide 12.5mg PO daily';
  expect(diff(before, after)).toBe('Dose changed, Brand/Generic changed');
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
  expect(diff(before, after)).toBe('');
});

addTest('Metformin HCl ER vs Metformin ER unchanged', () => {
  const b = 'Metformin hydrochloride 1000 mg ER tablet nightly';
  const a = 'Metformin ER 1000 mg tablet evening';
  expect(diff(b, a)).toBe('Time of day changed');
});

addTest('Metformin ER vs IR keeps formulation flag only', () => {
  const before = 'Metformin 500mg tab – 2 PO BID';
  const after  = 'Metformin ER 500mg – 2 PO BID';
  expect(diff(before, after)).toBe('Formulation changed');
});

addTest('Fluticasone propionate omission not formulation', () => {
  const before = 'Fluticasone Propionate nasal spray 50 mcg – 2 sprays each nostril daily';
  const after  = 'Fluticasone nasal spray 50 mcg – 1 spray each nostril qd';
  expect(diff(before, after)).toBe('Dose changed, Quantity changed');
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
  expect(diff(b,a)).toMatch(/brand\/generic changed/i);
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

addTest('Normalize numeric times per day', () => {
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
  expect(ctx.normalizeFrequency('3 times a day')).toBe('tid');
  expect(ctx.normalizeFrequency('5 times a day')).toBe('5 times a day');
});

addTest('Normalize 2 times a day', () => {
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
  expect(ctx.normalizeFrequency('2 times a day')).toBe('bid');
});

addTest('Normalize 3 times a day', () => {
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
  expect(ctx.normalizeFrequency('3 times a day')).toBe('tid');
});

addTest('Normalize every morning to daily', () => {
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
  expect(ctx.normalizeFrequency('every morning')).toBe('daily');
});

addTest('normalizeAdministration canonical forms', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: () => {} },
    window: {},
    document: { querySelectorAll: () => [], getElementById: () => ({}) , addEventListener: () => {} },
    firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) }
  };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  expect(ctx.normalizeAdministration('with orange juice')).toBe('with food');
  expect(ctx.normalizeAdministration('empty stomach')).toBe('between meals');
});

addTest('Solostar pen form same', () => {
  const b = 'Lantus Solostar 100 u/mL pen inject 20 u qhs';
  const a = 'Insulin glargine 100 u/mL pen inject 25 u at bedtime';
  expect(diff(b, a)).toBe('Dose changed, Brand/Generic changed');
});

addTest('Twice daily with meals equals BID', () => {
  const b = 'KCl ER 10 mEq tab po twice a day with meals';
  const a = 'Klor-Con 10 mEq tab po BID';
  expect(diff(b, a)).toMatch(/brand\/generic changed/i);
});

addTest('BID with meals equals BID', () => {
  const before = 'Metformin 500 mg BID with meals';
  const after = 'Metformin 500 mg BID';
  expect(diff(before, after)).toBe('');
});

addTest('Claritin vs loratadine brand only', () => {
  const b = 'Claritin 10 mg tab po daily prn allergies';
  const a = 'Loratadine 10 mg tab po daily as needed for allergies';
  expect(diff(b, a)).toMatch(/brand\/generic changed/i);
});

addTest('Klor-Con brand only', () => {
  const b = 'Potassium Chloride ER 10 mEq tab po twice a day';
  const a = 'Klor-Con 10 mEq tab po BID';
  expect(diff(b,a)).toMatch(/brand\/generic changed/i);
});

addTest('Tylenol brand flag', () => {
  const b = 'Tylenol 500 mg 2 tabs PO q6h prn pain';
  const a = 'Acetaminophen 1000 mg tab PO every 6 hours as needed for pain';
  expect(diff(b, a)).toBe('Dose changed, Brand/Generic changed, Quantity changed');
});

addTest('Implicit tablet form same', () => {
  const before = 'Tylenol 500 mg 2 tabs PO q6h prn pain';
  const after  = 'Acetaminophen 1000 mg PO every 6 hours as needed for pain';
  expect(diff(before, after))
    .toBe('Dose changed, Brand/Generic changed, Quantity changed');
});

addTest('Tabs vs no form equal', () => {
  const before = 'Tylenol 500 mg 2 tabs po q6h prn pain';
  const after  = 'Acetaminophen 1000 mg po every 6 h as needed for pain';
  expect(diff(before, after))
    .toBe('Dose changed, Brand/Generic changed, Quantity changed');
});

addTest('Tylenol Extra Strength vs acetaminophen brand flag', () => {
  const before = 'Tylenol Extra Strength 500 mg tablet po daily';
  const after = 'Acetaminophen 500 mg tablet po daily';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('Metoprolol XL vs ER unchanged', () => {
  const before = 'Metoprolol XL 50 mg tab daily';
  const after  = 'Metoprolol Succinate ER 50 mg tab daily';
  expect(diff(before, after)).toBe('');
});

addTest('Once weekly frequency detected', () => {
  const ctxHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = ctxHtml.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Vitamin D2 50000 units - take once weekly at bedtime');
  expect(order.frequency).toBe('weekly');
  expect(order.timeOfDay).toBe('bedtime');
});

addTest('Every Sunday morning parsed as weekly', () => {
  const ctxHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = ctxHtml.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Alendronate 70 mg tablet - take every Sunday morning');
  expect(order.frequency).toBe('weekly');
  expect(order.timeOfDay).toBe('morning');
});

addTest('Brand token captured in array', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Lipitor 40 mg tablet daily');
  expect(order.brandTokens).toEqual(['lipitor']);
});

addTest('Duplicate brand names deduped', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({ }), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Lipitor Lipitor 40 mg tablet daily');
  expect(order.brandTokens).toEqual(['lipitor']);
});

addTest('Duplicate brand synonyms deduped', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({ }), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Coumadin Coumadin 5 mg daily');
  expect(order.brandTokens).toEqual(['coumadin']);
});

addTest('Mixed brand/generic only first captured', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({ }), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Coumadin (generic) Coumadin 5 mg');
  expect(order.brandTokens).toEqual(['coumadin']);
});

addTest('Generic name has no brand tokens', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('atorvastatin 40 mg tablet daily');
  expect(order.brandTokens).toEqual([]);
});

addTest('Weekly time of day ignored in diff', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const before = 'Vitamin D2 50000 units - take once weekly at bedtime';
  const after  = 'Vitamin D2 50000 units - take once weekly in the morning';
  expect(ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after))).toBe('Unchanged');
});

addTest('Microgram to milligram normalization', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = html.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const order = ctx.parseOrder('Levothyroxine 100 mcg tablet daily');
  expect(order.dose.value).toBe(0.1);
  expect(order.dose.unit).toBe('mg');
  expect(order.rawUnit).toBe('mg');
  expect(order.dose.total).toBe(0.1);
});

addTest('Vancomycin gram vs g unchanged', () => {
  const before = 'Vancomycin 1 gram q12h';
  const after  = 'Vancomycin 1 g q12h';
  const ctxHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const script = ctxHtml.split('<script>')[2].split('</script>')[0];
  const ctx = { console: { log: () => {}, warn: () => {}, error: () => {} }, window: {}, document: { querySelectorAll: () => [], getElementById: () => ({}), addEventListener: () => {} }, firebase: { initializeApp: () => ({}), functions: () => ({ httpsCallable: () => () => ({}) }) } };
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  const p1 = ctx.parseOrder(before);
  const p2 = ctx.parseOrder(after);
  expect(p1.rawUnit).toBe('mg');
  expect(p2.rawUnit).toBe('mg');
  expect(ctx.getChangeReason(p1, p2)).toBe('Unchanged');
});

addTest('Synthroid brand detected', () => {
  expect(diff('Levothyroxine 112 mcg qam', 'Synthroid 0.112 mg qAM')).toMatch(/brand\/generic/i);
});

addTest('Synthroid microgram symbol diff only brand', () => {
  const before = 'Levothyroxine 112 \u00b5g every AM';
  const after  = 'Synthroid 0.112 mg qAM';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('Fosamax brand only', () => {
  expect(diff('Alendronate 70 mg once per week Sunday',
              'Fosamax 70 mg once weekly (Sunday)')).toBe('Brand/Generic changed');
});

addTest('Coumadin brand + dose change, INR same', () => {
  expect(
    diff(
      'Warfarin 3 mg MWF 3 mg, TTSu 1.5 mg INR 2-3',
      'Coumadin 3 mg M/W/F 3 mg; Tu/Th/Sa/Su 1.5 mg INR 2.0-3.0'
    )
  ).toBe('Brand/Generic changed');
});

addTest('Iron vs Ferrous frequency change only', () => {
  expect(diff('Ferrous sulfate 325 mg TID', 'Iron sulfate 325 mg BID')).toBe('Frequency changed');
});

addTest('Synthroid brand + AM equal', () => {
  const before = 'Levothyroxine sodium 100 mcg qam';
  const after  = 'Synthroid 100 mcg every morning';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('Coumadin brand, INR text equal, dose diff', () => {
  const b = 'Warfarin 3 mg daily INR 2-3';
  const a = 'Coumadin 5 mg daily INR 2.0-3.0';
  expect(diff(b, a)).toBe('Dose changed, Brand/Generic changed');
});

addTest('Pred taper wording ignored', () => {
  const b = 'Prednisone 20 mg tablet take 5 tabs daily taper';
  const a = 'Prednisone 40 mg tablet take 6 tabs daily taper';
  expect(diff(b, a)).toBe('Dose changed, Quantity changed');
});

addTest('Vancomycin generic vs hydrochloride unchanged', () => {
  const before = 'Vancomycin 1 g q12h';
  const after  = 'Vancomycin hydrochloride 1 gram q12h';
  expect(diff(before, after)).toBe('');
});

addTest('Coumadin brand vs warfarin regimen only', () => {
  const before = 'Warfarin 3 mg regimen INR 2-3';
  const after  = 'Coumadin 3 mg regimen INR 2.0-3.0';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('Coumadin vs warfarin range formatting ignored', () => {
  const before = 'Coumadin 3 mg regimen INR 2-3';
  const after  = 'Warfarin 3 mg regimen INR 2.0-3.0';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});

addTest('INR range presence vs absence unchanged', () => {
  const before = 'Warfarin 2 mg tablet nightly';
  const after  = 'Warfarin 2 mg tablet nightly INR 2.0-3.0';
  expect(diff(before, after)).toBe('');
});

addTest('Taper word presence vs absence unchanged', () => {
  const before = 'Prednisone 10 mg tablet daily';
  const after  = 'Prednisone 10 mg tablet daily taper';
  expect(diff(before, after)).toBe('');
});

addTest('Anticoag clinic phrase ignored', () => {
  const before = 'Warfarin 2 mg tablet nightly';
  const after  = 'Warfarin 2 mg tablet nightly anticoag clinic';
  expect(diff(before, after)).toBe('');
});

addTest('INR range 2.5-3.5 ignored in diff', () => {
  const before = 'Warfarin 2 mg tablet nightly';
  const after  = 'Warfarin 2 mg tablet nightly INR 2.5-3.5';
  expect(diff(before, after)).toBe('');
});

addTest('INR decimal zeros ignored in diff', () => {
  const before = 'Warfarin 2 mg tablet nightly';
  const after  = 'Warfarin 2 mg tablet nightly INR 2.0-3.00';
  expect(diff(before, after)).toBe('');
});

addTest('Vancomycin gram vs g no change', () => {
  expect(diff('Vancomycin 1 gram q12h', 'Vancomycin 1 g q12h')).toBe('');
});

addTest('Vancomycin totals equal when qty null', () => {
  expect(diff('Vancomycin 1 g iv q12h', 'Vancomycin 1 gram iv q12h')).toBe('');
});

addTest('Clock time 9PM daily parsed as bedtime', () => {
  const order = parseOrder('Melatonin 5 mg 9PM daily');
  expect(order.timeOfDay).toBe('bedtime');
  expect(order.frequency).toBe('daily');
});

addTest('Warfarin vs Coumadin INR range diff', () => {
  const b = 'Warfarin 3 mg INR 2-3';
  const a = 'Coumadin 3 mg INR 2.0-3.0';
  expect(diff(b, a)).toBe('Brand/Generic changed');
});

addTest('Prednisone taper vs no taper quantity diff', () => {
  const b = 'Prednisone 5 mg taper';
  const a = 'Prednisone 20 mg no taper';
  expect(diff(b, a)).toBe('Dose changed, Quantity changed');
});

addTest('Vancomycin monitoring wording', () => {
  expect(diff(
    'Vancomycin 1 g q12h – trough before 4th dose',
    'Vancomycin hydrochloride 1 g q12h – target trough 15-20 mcg/mL'))
    .toBe('Indication changed');
});
addTest('Warfarin brand with INR & schedule words – indication equal', () => {
  const a = 'Warfarin 3mg MWF 3mg TTSu 1.5mg INR 2-3 PO evening';
  const b = 'Coumadin 3mg M/W/F 3mg Tu/Th/Sa/Su 1.5mg INR 2.0-3.0 orally in evening';
  expect(diff(a, b)).toBe('Brand/Generic changed');
});

addTest('Warfarin vs Coumadin indication equal after filler strip', () => {
  const a = 'Warfarin 3 mg MWF 3 mg TTSu 1.5 mg INR 2-3 PO evening';
  const b = 'Coumadin 3 mg M/W/F 3 mg Tu/Th/Sa/Su 1.5 mg INR 2.0-3.0 orally evening';
  expect(diff(a, b)).toBe('Brand/Generic changed');
});

addTest('Prednisone taper vs 5-day course indication equal', () => {
  expect(diff(
    'Prednisone 5 mg taper for COPD',
    'Prednisone 20 mg daily x5 days for COPD'))
    .toBe('Dose changed, Quantity changed');
});

addTest('Humalog vs insulin lispro brand flag', () => {
  expect(diff('Humalog KwikPen 10 u ac',
              'Insulin Lispro KwikPen 10 u ac'))
    .toBe('Brand/Generic changed');
});

addTest('Warfarin vs Coumadin brand flag only', () => {
  expect(diff('Warfarin 3 mg daily evening',
              'Coumadin 3 mg daily evening'))
    .toBe('Brand/Generic changed');
});

addTest('Coumadin brand flag appears', () => {
  const a = 'Warfarin 3 mg daily evening';
  const b = 'Coumadin 3 mg daily evening';
  expect(diff(a, b)).toBe('Brand/Generic changed');
});

addTest('Iron same strength diff frequency', () => {
  const a = 'Ferrous Sulfate 325 mg PO tid';
  const b = 'Iron Sulfate 325 mg PO bid';
  expect(diff(a, b)).toBe('Frequency changed');
});

addTest('Coumadin brand flag appears', () => {
  expect(
    diff('Warfarin 3 mg po daily', 'Coumadin 3 mg po daily')
  ).toBe('Brand/Generic changed');
});

addTest('Prednisone strength jump keeps dose flag', () => {
  expect(
    diff('Prednisone 5 mg 4 tabs daily', 'Prednisone 20 mg 1 tab daily')
  ).toBe('Dose changed, Quantity changed');
});

addTest('Iron same strength only freq flag', () => {
  expect(
    diff('Ferrous Sulfate 325 mg po tid', 'Iron Sulfate 325 mg po bid')
  ).toBe('Frequency changed');
});

addTest('Coumadin brand flag survives token strip', () => {
  expect(diff(
    'Warfarin 3 mg po daily',
    'Coumadin 3 mg po evening'
  )).toBe('Brand/Generic changed, Time of day changed');
});

addTest('Iron elemental parentheses no dose diff', () => {
  expect(diff(
    'Ferrous Sulfate 325 mg (65 mg elemental iron) po tid',
    'Iron Sulfate 325 mg po bid'
  )).toBe('Frequency changed');
});

// Warfarin fraction vs mg strength example:
// diff('Warfarin 3 mg 1/2 tab evening', 'Coumadin 1.5 mg tablet nightly')
// should produce 'Brand/Generic changed, Time of day changed'
addTest('Warfarin fraction vs mg strength', () => {
  const before = 'Warfarin 1.5 mg evening';
  const after = 'Coumadin 1.5 mg nightly';
  expect(diff(before, after)).toBe('Brand/Generic changed, Time of day changed');
});

addTest('Iron admin change flagged', () => {
  const before = 'Ferrous sulfate 325 mg po q6h with orange juice';
  const after = 'Iron sulfate 325 mg po q12h between meals';
  expect(diff(before, after)).toBe('Frequency changed, Administration changed');
});

addTest('Warfarin tabs regimen diff only brand/time', () => {
  const before = 'Warfarin 3 mg tabs: 1 tab M/W/F 3 mg; Tu/Th/Sa/Su 1.5 mg evening';
  const after = 'Coumadin 3 mg tabs: 1 tab M/W/F 3 mg; Tu/Th/Sa/Su 1.5 mg nightly';
  expect(diff(before, after)).toBe('Brand/Generic changed, Time of day changed');
});

addTest('Numeric frequency two times a day flagged', () => {
  const before = 'Metformin 500 mg tablet - take 1 tab 2 times a day';
  const after = 'Metformin 500 mg tablet - take 1 tab daily';
  expect(diff(before, after)).toBe('Frequency changed');
});

addTest('2 times a day normalized to bid', () => {
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
  const order = ctx.parseOrder('Metformin 500 mg tablet - take 1 tab 2 times a day');
  expect(order.frequency).toBe('bid');
});
addTest('Warfarin same dose – no dose flag', () => {
  expect(diff('Warfarin 3 mg daily',
              'Coumadin 3 mg daily evening'))
    .toBe('Brand/Generic changed, Time of day changed');
});

addTest('Warfarin different dose – dose flag kept', () => {
  expect(diff('Warfarin 5 mg daily',
              'Coumadin 3 mg daily'))
    .toBe('Dose changed, Brand/Generic changed');
});

addTest('Numeric "2 times a day" freq', () => {
  expect(diff(
    'Ferrous Sulfate 325 mg 1 tab TID with orange juice',
    'Iron Sulfate 325 mg 1 tab 2 times a day between meals'))
    .toBe('Frequency changed, Administration changed');
});

addTest('Coumadin same mg – dose flag suppressed', () => {
  expect(diff(
    'Warfarin 3 mg po daily',
    'Coumadin 3 mg daily evening'
  )).toBe('Brand/Generic changed, Time of day changed');
});

addTest('Coumadin diff mg – dose flag kept', () => {
  expect(diff(
    'Warfarin 5 mg po daily',
    'Coumadin 3 mg daily'
  )).toBe('Dose changed, Brand/Generic changed');
});
/* Coumadin weekly split, evening timing */
addTest('Coumadin brand & time only', () => {
  expect(diff(
    'Warfarin 3 mg 1 tab M/W/F; \u00bd tab Tu/Th/Sa/Su',
    'Coumadin 3 mg 1 tab M/W/F; \u00bd tab Tu/Th/Sa/Su evening'
  )).toBe('Brand/Generic changed, Time of day changed');
});

/* “2 times a day” numeric frequency */
addTest('Iron numeric frequent phrase', () => {
  expect(diff(
    'Ferrous sulfate 325 mg TID',
    'Iron sulfate 325 mg 2 times a day'
  )).toBe('Frequency changed');
});

addTest('Lipitor vs atorvastatin brand only', () => {
  const brand = 'Lipitor 20 mg tablet po daily';
  const generic = 'Atorvastatin 20 mg tablet po daily';
  expect(diff(brand, generic)).toBe('Brand/Generic changed');
});

addTest('Basaglar vs insulin glargine brand only', () => {
  const brand = 'Basaglar 10 units SC nightly';
  const generic = 'Insulin glargine 10 units SC nightly';
  expect(diff(brand, generic)).toBe('Brand/Generic changed');
});

addTest('BID equals two times a day', () => {
  const b = 'Metformin 500 mg tablet po BID';
  const a = 'Metformin 500 mg tablet po two times a day';
  expect(diff(b, a)).toBe('');
});

addTest('Coumadin brand swap with numeric freq unchanged', () => {
  const before = 'Warfarin 3 mg tablet po BID';
  const after = 'Coumadin 3 mg tablet po twice daily';
  expect(diff(before, after)).toBe('Brand/Generic changed');
});
addTest('Refills count change flagged', () => {
  const before = 'Amoxicillin 500 mg capsule - take 1 cap tid 2 refills';
  const after  = 'Amoxicillin 500 mg capsule - take 1 cap tid 3 refills';
  expect(diff(before, after)).toBe('Refills changed');
});

addTest('Warfarin sodium vs warfarin direct comparison', () => {
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
  const before = 'Warfarin sodium 5 mg tablet po evening';
  const after = 'Warfarin 5 mg tablet po qpm';
  const reason = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
  if (reason.includes('Formulation changed')) {
    throw new Error('Unexpected formulation flag: ' + reason);
  }
});

addTest('Benign salt swap is ignored', () => {
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
  const before = 'Amlodipine 5 mg tab – 1 PO daily';
  const after = 'Amlodipine besylate 5 mg tab – 1 PO daily';
  const reason = ctx.getChangeReason(ctx.parseOrder(before), ctx.parseOrder(after));
  if (reason.includes('Formulation changed')) {
    throw new Error('Unexpected formulation flag: ' + reason);
  }
});
addTest('benign brand swaps', () => {
  expect(diff('Lipitor 20mg tab nightly', 'Atorvastatin 20mg tab QHS')).toBe(
    'Brand/Generic changed'
  );
  expect(diff('ProAir 90 mcg 2 puffs PRN', 'Albuterol HFA 90 mcg 2 puffs PRN'))
    .toBe('Brand/Generic changed');
  expect(diff('K-Dur 10 mEq ER tab BID', 'Potassium Chloride 10 mEq ER tab BID'))
    .toBe('Brand/Generic changed');
  expect(diff('Lasix 20 mg qAM', 'Furosemide 20 mg daily')).toBe(
    'Brand/Generic changed, Time of day changed'
  );
});

addTest('cholesterol vs hyperlipidemia indication equal', () => {
  const before =
    'Atorvastatin 20 mg tablet - take 1 tab daily for cholesterol';
  const after =
    'Atorvastatin 20 mg tablet - take 1 tab daily for hyperlipidemia';
  expect(diff(before, after)).toBe('');
});
