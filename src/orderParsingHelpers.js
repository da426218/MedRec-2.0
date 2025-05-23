// Helper functions extracted from the original parseOrder implementation.
// They intentionally mirror the existing logic so behaviour remains
// unchanged while allowing targeted unit tests.

function preprocessOrderString(orderStr) {
  // Normalize exotic hyphen characters and expand common shorthands.
  orderStr = orderStr.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-');
  // `normalizeText` is defined in the main script and expands qhs/qam etc.
  orderStr = normalizeText(orderStr);

  // Capture trailing trough monitoring notes before removing them
  let troughNote = null;
  const troughMatch = orderStr.match(/-\s*((?:target\s+)?trough.*)$/i);
  if (troughMatch) troughNote = troughMatch[1].trim();
  // Strip trailing trough comments so numeric targets don't get parsed as doses
  orderStr = orderStr.replace(/-\s*(?:target\s+)?trough.*$/i, '').trim();

  return { cleanedStr: orderStr, troughNote };
}

function initOrderObject(originalRaw) {
  return {
    drug: '',
    dose: { value: null, unit: '', total: null },
    qty: null,
    route: '',
    frequency: '',
    frequencyTokens: [],
    timeOfDay: '',
    timeOfDayOriginal: '',
    administration: '',
    prn: false,
    prnCondition: '',
    startDate: '',
    endDate: '',
    form: '',
    formulation: '',
    indication: '',
    brandTokens: [],
    rawDrug: '',
    rawUnit: '',
    taperFlag: null,
    refills: null,
    originalRaw,
  };
}

function applyTaperFlags(str, order) {
  // TODO: update order.taperFlag based on 'taper' phrases
  return str;
}

function extractDatesInfo(str, order) {
  // TODO: extract start and end dates
  return str;
}

function parseTimeOfDay(str, order) {
  // TODO: set timeOfDay and implied frequency
  return str;
}

function parseFormulation(str, order) {
  // TODO: detect formulation keywords and clean them from the string
  return str;
}

function parsePrnAndIndication(str, order) {
  // TODO: parse PRN flags and indications
  return str;
}

function parseQuantity(str, order) {
  // TODO: detect quantity units and amount
  return str;
}

function parseDose(orderStr, order, originalRaw) {
  // 5. Extract Dose (mg/kg, combo-dose, then general unit parsing)
  // Strip parenthetical elemental-iron note
  orderStr = orderStr.replace(
    /\((?:\s*\d+\s*mg\s*elemental[^)]*)\)/i,
    ''
  ).trim();
  const weightMatch = orderStr.match(/(\d+(?:\.\d+)?)\s*mg\/kg\b/i);
  if (weightMatch) {
    order.dose = { value: parseFloat(weightMatch[1]), unit: 'mg/kg', total: null }; // total might need patient weight
    orderStr = orderStr.replace(weightMatch[0], '').trim();
  } else {
    const comboMatch = orderStr.match(/(\d+(?:\.\d+)?)\s*(?:mg)?\s*(?:-|\/|\+)\s*(\d+(?:\.\d+)?)\s*mg\b/i);
    if (comboMatch) {
      order.dose = {
        value: [parseFloat(comboMatch[1]), parseFloat(comboMatch[2])],
        unit: 'mg',
        total: null
      };
      orderStr = orderStr.replace(comboMatch[0], '').trim();
    } else {
      const multiMgMatches = [...orderStr.matchAll(/(\d+(?:\.\d+)?)\s*mg\b/gi)];
      if (multiMgMatches.length >= 2) {
        order.dose = {
          value: multiMgMatches.map(m => parseFloat(m[1])),
          unit: 'mg',
          total: null
        };
        multiMgMatches.forEach(m => {
          orderStr = orderStr.replace(m[0], '').trim();
        });
      } else {
        // General dose unit parsing
        const allUnits = Object.values(unitVariants).flat();
        let unitMatchesFound = [];
        for (let u of allUnits) {
          if (typeof u !== 'string' || !u) continue;
          const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${u.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}\\b`, 'ig');
          let m;
          while ((m = re.exec(orderStr)) !== null) {
            const normUnit = u.toLowerCase() === 'gram' ? 'g' : u.toLowerCase();
            unitMatchesFound.push({ idx: m.index, qty: +m[1], rawUnit: normUnit, matchStr: m[0] });
          }
        }

        if (unitMatchesFound.length > 0) {
          const precedence = ['mcg','mg','g','mEq','unit','mL','tablet','capsule','patch','puff','spray','drop'];

          const hits = unitMatchesFound.map(m => {
            const stdUnit = Object.entries(unitVariants)
              .find(([std, arr]) => arr.includes(m.rawUnit))?.[0] || m.rawUnit;
            return { ...m, stdUnit, score: precedence.indexOf(stdUnit) };
          });

          hits.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score; // better unit first
            return a.idx - b.idx; // tie → earlier hit
          });

          const bestMatch = hits[0];
          const sprayHit = hits.find(h => h.stdUnit === 'spray');
          let unitLower = bestMatch.stdUnit.toLowerCase();
          if (unitLower === 'gram') unitLower = 'g';
          order.rawUnit = unitLower; // store pre-normalization unit
          order.dose = { value: bestMatch.qty, unit: unitLower, total: bestMatch.qty };

          if (sprayHit && order.qty === null) {
            order.qty = sprayHit.qty;
          }
          if (bestMatch.stdUnit === 'spray' && order.qty === null) {
            order.qty = bestMatch.qty;
          }
          if (order.qty !== null) {
            order.dose.total = bestMatch.qty * order.qty;
          }

          orderStr = orderStr.replace(bestMatch.matchStr, '').trim();
          // Capture trailing formulation tokens that may follow the strength (e.g. "1000 mg ER")
          let trailingForm = orderStr.match(/^[-\s]*(xr|er|sr|la|xl|cr|dr)\b/i);
          if (trailingForm) {
            order.formulation = (order.formulation ? order.formulation + ' ' : '') + trailingForm[1].toLowerCase();
            orderStr = orderStr.replace(trailingForm[0], '').trim();
          }
          // …and drop any leftover verb that preceded the dose phrase
          orderStr = orderStr.replace(/\b(?:give|take|administer)\b\s*/i, '').trim();
          // If the best dose unit implies a form, set it if not already set
          if (bestMatch.stdUnit === 'tablet' && !order.form) order.form = 'tablet';
          else if (bestMatch.stdUnit === 'capsule' && !order.form) order.form = 'capsule';
          else if (bestMatch.stdUnit === 'puff' && !order.form) order.form = 'puff';
        } else if (!order.dose.value) {
          const doseUnitsForFallback = ['mcg','mg','g','ml','cc','unit','units','tsp','tbsp','drop','spray','puff','patch','lozenge','suppository','tablet','capsule','each','dose'];
          const fallbackDoseRegex = new RegExp(`(\\d+(?:\\.\\d+)?)(?:\\s*(${doseUnitsForFallback.join('|')})(?:s|es)?\\b)?`, 'i');
          const fallbackMatch = orderStr.match(fallbackDoseRegex);
          if (fallbackMatch && fallbackMatch[1]) {
            const qty = parseFloat(fallbackMatch[1]);
            let unit = (fallbackMatch[2] || '').toLowerCase();
            let formFromUnit = '';

            if (unit) {
              const foundStdUnit = Object.entries(unitVariants).find(([std, arr]) => arr.includes(unit));
              if (foundStdUnit) unit = foundStdUnit[0].toLowerCase();
              if (unit === 'gram') unit = 'g';

              if (unitVariants.tablet.includes(unit)) { formFromUnit = 'tablet'; unit = 'tablet'; }
              else if (unitVariants.capsule.includes(unit)) { formFromUnit = 'capsule'; unit = 'capsule'; }

              order.dose = { value: qty, unit: unit, total: qty };
              orderStr = orderStr.replace(fallbackMatch[0], '').trim();
              if (formFromUnit && !order.form) order.form = formFromUnit;
              let trailingForm2 = orderStr.match(/^[-\s]*(xr|er|sr|la|xl|cr|dr)\b/i);
              if (trailingForm2) {
                order.formulation = (order.formulation ? order.formulation + ' ' : '') + trailingForm2[1].toLowerCase();
                orderStr = orderStr.replace(trailingForm2[0], '').trim();
              }
            }
          }
        }
      }
    }
  }

  // Normalize dose units (mcg/g to mg) AFTER all dose parsing attempts
  if (order.dose.value !== null && typeof order.dose.value === 'number') {
    if (order.dose.unit === 'mcg') {
      order.dose.value = order.dose.value / 1000;
      order.dose.unit = 'mg';
      order.rawUnit = 'mg';
      order.dose.total = order.dose.value * (order.qty || 1);
    } else if (order.dose.unit === 'g') {
      order.dose.value = order.dose.value * 1000;
      order.dose.unit = 'mg';
      order.rawUnit = 'mg';
      order.dose.total = order.dose.value * (order.qty || 1);
    }
    if (order.dose.unit === 'mg') {
      order.dose.value = Math.round(order.dose.value * 1000) / 1000;
      if (order.dose.total != null) {
        order.dose.total = Math.round(order.dose.total * 1000) / 1000;
      }
    }
    if (order.dose.unit === 'gram') order.dose.unit = 'g';
  }

  if (order.qty === null) {
    const qtyLatePattern = new RegExp(`(?:^|\\s)((?:\\d+\\/\\d+|[\\u00bc-\\u00be]|\\d+(?:\\.\\d+)?))\\s*(${qtyWords.join('|')})(?:s)?\\b`, 'i');
    const qtyMatchLate = originalRaw.match(qtyLatePattern);
    if (qtyMatchLate) {
      const potentialQty = fractionToDecimal(qtyMatchLate[1]);
      if (!order.dose.value || Math.abs(order.dose.value - potentialQty) > 0.001 || order.dose.unit !== qtyMatchLate[2].toLowerCase().replace(/s$/,'') ) {
        if (orderStr.includes(qtyMatchLate[0])) {
          orderStr = orderStr.replace(qtyMatchLate[0], '').trim();
        }
        order.qty = potentialQty;
      }
    }
  }

  if (order.dose.value !== null && typeof order.dose.value === 'number' && order.qty !== null && typeof order.qty === 'number') {
    order.dose.total = order.dose.value * order.qty;
  } else if (order.dose.value !== null) {
    order.dose.total = order.dose.value;
  }

  if (order.qty === null && (order.dose.unit === 'tablet' || order.dose.unit === 'capsule' || order.dose.unit === 'puff' || order.dose.unit === 'spray')) {
    if (order.dose.value && order.dose.value > 0) {
      order.qty = order.dose.value;
      if (order.dose.total === null) {
        order.dose.total = order.dose.value * order.qty;
      }
      if (order.dose.unit === 'tablet' || order.dose.unit === 'capsule' || order.dose.unit === 'puff' || order.dose.unit === 'spray') {
        order.dose.total = order.dose.value;
      }
    }
  }

  return orderStr;
}

function parseForm(str, order) {
  // TODO: set dosage form (tablet, capsule, etc.)
  return str;
}

function parseRoute(str, order) {
  // TODO: detect administration route
  return str;
}

function parseFrequency(orderStr, order, originalRaw) {
  // 8. Extract Frequency

  // Explicitly check for "immediately" first, as it's a specific frequency from "stat" or "now"
  const immediatelyPattern = /\bimmediately\b/i;
  if (!order.frequency && immediatelyPattern.test(orderStr)) {
    order.frequency = 'immediately';
    order.frequencyTokens.push('immediately');
    orderStr = orderStr.replace(immediatelyPattern, '').trim();
  }
  // Now proceed with other frequency checks if not "immediately"
  // Try to detect primary frequency terms before other clauses override them
  if (!order.frequency) {
    const primaryFreqPattern = /(?:\b(?:take|give|po|by mouth|orally)\s+)?\b(daily|bid|tid|qid)\b(?!\s+(?:for|if|until|check|adjust)\b)/i;
    const primaryMatch = orderStr.match(primaryFreqPattern);

    if (primaryMatch && primaryMatch[1]) {
      const preceding = orderStr.slice(0, primaryMatch.index).trim();
      const numWordRE = /(once|twice|thrice|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(?:x|times?|time)?\s*$/i;
      if (!numWordRE.test(preceding)) {
        const matchedFreq = primaryMatch[1].toLowerCase();
        const canonicalMap = { daily: 'daily', bid: 'bid', tid: 'tid', qid: 'qid' };
        if (canonicalMap[matchedFreq]) {
          order.frequency = canonicalMap[matchedFreq];
          order.frequencyTokens.push(primaryMatch[0].toLowerCase().trim());
          orderStr = orderStr.replace(primaryMatch[0], '').trim();
        }
      }
    }
  }

  if (!order.frequency) {
    const primaryFreqRE = /(?:\b(?:take|give|inject|inhale|apply|use|po|by\s+mouth|orally)\s+)?\b(daily|bid|tid|qid)\b(?!\s+(?:for|if|until|check|monitor|adjust)\b)/i;
    const m = orderStr.match(primaryFreqRE);
    if (m) {
      const preceding = orderStr.slice(0, m.index).trim();
      const numWordRE = /(once|twice|thrice|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s*(?:x|times?|time)?\s*$/i;
      if (!numWordRE.test(preceding)) {
        const map = { daily: 'daily', bid: 'bid', tid: 'tid', qid: 'qid' };
        order.frequency = map[m[1].toLowerCase()];
        order.frequencyTokens.push(m[0].toLowerCase().trim());
        orderStr = orderStr.replace(m[0], '').trim();
      }
    }
  }
  if (!order.frequency) {
    const qhMatch = orderStr.match(/\bq(\d+)h\b/i);
    if (qhMatch) {
      order.frequency = `q${qhMatch[1]}h`;
      order.frequencyTokens.push(qhMatch[0].toLowerCase());
      orderStr = orderStr.replace(qhMatch[0], '').trim();
    } else {
      const qhrsMatch = orderStr.match(/\bq(\d+)(?:hrs|hr)\b/i);
      if (qhrsMatch) {
        order.frequency = `q${qhrsMatch[1]}h`;
        order.frequencyTokens.push(qhrsMatch[0].toLowerCase());
        orderStr = orderStr.replace(qhrsMatch[0], '').trim();
      } else {
        const everyHours = orderStr.match(/\bevery\s*(\d+)\s*(?:hours?|h|hr|hrs)\b/i);
        if (everyHours) {
          order.frequency = `q${everyHours[1]}h`;
          order.frequencyTokens.push(everyHours[0].toLowerCase());
          orderStr = orderStr.replace(everyHours[0], '').trim();
        } else {
          const freqMapping = getFrequencyMap();
          const sortedFreqKeys = Object.keys(freqMapping).sort((a, b) => b.length - a.length);
          for (const key of sortedFreqKeys) {
            const pattern = new RegExp(`\\b${key.replace(/\s+/g, '\\s+')}\\b`, 'i');
            if (!order.frequency && pattern.test(orderStr)) {
              const m = orderStr.match(pattern);
              order.frequency = freqMapping[key];
              if (m) order.frequencyTokens.push(m[0].toLowerCase());
              orderStr = orderStr.replace(pattern, '').trim();
              break;
            }
          }
        }
      }
    }
  }

  if (!order.frequency && order.timeOfDay) {
    order.frequency = 'daily';
  }
  order.frequency = normalizeFrequency(order.frequency);
  if (
    order.frequency === 'tid' &&
    /twice\s+(?:a|per)?\s*day\s+with\s+meals/i.test(originalRaw)
  ) {
    order.frequency = 'bid';
  }
  if (
    order.frequency === 'tid' &&
    /\bbid\s+with\s+meals/i.test(originalRaw)
  ) {
    order.frequency = 'bid';
  }

  return orderStr;
}

function parseDrug(str, order) {
  // TODO: final drug and brand/generic tokens
  return str;
}

function finalizeOrder(order, troughNote, originalRaw) {
  // TODO: apply final normalizations
  return order;
}

// Export for Node tests
if (typeof module !== 'undefined') {
  module.exports = {
    preprocessOrderString,
    initOrderObject,
    applyTaperFlags,
    extractDatesInfo,
    parseTimeOfDay,
    parseFormulation,
    parsePrnAndIndication,
    parseQuantity,
    parseDose,
    parseForm,
    parseRoute,
    parseFrequency,
    parseDrug,
    finalizeOrder
  };
}
