// Income / tax-estimate service.
//
// Implements the "tracking of income for Freelancers" and "calculation
// and display of estimated tax values" requirements (IIE, 2026c). The
// figure produced here is explicitly an *estimate* for a simulated
// marketplace - it applies SARS's published 2026/27 individual marginal
// tax brackets and primary rebate (SARS, 2026) to the freelancer's
// *marketplace* income alone, which is not the same as their real total
// annual taxable income, and the API/UI must label it accordingly.
//
// Two rules make the estimate correct rather than merely plausible:
//  1. Only income earned inside the current SARS tax year (1 March to the end
//     of February) is taxed, because tax is assessed per tax year (SARS, 2026).
//  2. Income below the tax threshold (R99,000 for 2026/27) correctly produces
//     R0, because the primary rebate cancels the tax on it (SARS, 2026). The
//     summary therefore explains a R0 result instead of leaving it unexplained.
const transactionRepository = require('../repositories/transactionRepository');
const config = require('../config/env');

const HOUR_MS = 60 * 60 * 1000;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round2 = (n) => Math.round(n * 100) / 100;

/** Formats a rand amount for the explanatory notes, e.g. 99000 -> "R99,000" (SARS, 2026). */
function formatRand(amount) {
  return `R${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

/**
 * Returns the SARS tax year containing `now`: from 1 March to the end of
 * February, evaluated in South African time (SARS, 2026). The end is exclusive.
 */
function getTaxYear(now = new Date()) {
  const offsetMs = config.localUtcOffsetHours * HOUR_MS;
  const local = new Date(now.getTime() + offsetMs);
  const startYear = local.getUTCMonth() >= config.taxYearStartMonth ? local.getUTCFullYear() : local.getUTCFullYear() - 1;
  return {
    label: `${startYear}/${String(startYear + 1).slice(2)}`,
    start: new Date(Date.UTC(startYear, config.taxYearStartMonth, 1) - offsetMs),
    end: new Date(Date.UTC(startYear + 1, config.taxYearStartMonth, 1) - offsetMs),
  };
}

/** Applies SARS's progressive bracket table to a taxable amount (SARS, 2026). */
function estimateAnnualTax(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  const bracket = config.taxBrackets.find((b) => taxableIncome <= b.upTo);
  const previousCeiling = (() => {
    const index = config.taxBrackets.indexOf(bracket);
    return index === 0 ? 0 : config.taxBrackets[index - 1].upTo;
  })();

  const grossTax = bracket.base + (taxableIncome - previousCeiling) * bracket.rate;
  const netTax = Math.max(0, grossTax - config.taxPrimaryRebate);
  return round2(netTax);
}


/**
 * Shows how the tax figure is built, one SARS bracket at a time (SARS, 2026). Because the bracket
 * "base" amounts in config.js are the cumulative tax on all lower brackets, the per-bracket amounts
 * below add up exactly to the same gross tax that estimateAnnualTax() calculates.
 */
function buildTaxBreakdown(taxableIncome) {
  let previousCeiling = 0;
  const rows = config.taxBrackets.map((bracket) => {
    const from = previousCeiling;
    const to = bracket.upTo === Infinity ? null : bracket.upTo;
    const inBracket = Math.max(0, Math.min(taxableIncome, bracket.upTo) - from);
    previousCeiling = bracket.upTo;
    return { from, to, rate: bracket.rate, amountInBracket: round2(inBracket), taxInBracket: round2(inBracket * bracket.rate) };
  });
  const grossTax = round2(rows.reduce((sum, row) => sum + row.taxInBracket, 0));
  return {
    brackets: rows.filter((row) => row.amountInBracket > 0),
    grossTax,
    primaryRebate: config.taxPrimaryRebate,
    netTax: round2(Math.max(0, grossTax - config.taxPrimaryRebate)),
  };
}

/** Marginal rate: the rate that applies to the next rand earned (SARS, 2026). */
function getMarginalRate(taxableIncome) {
  if (taxableIncome <= 0) return config.taxBrackets[0].rate;
  return config.taxBrackets.find((b) => taxableIncome <= b.upTo).rate;
}

/**
 * Income per calendar month for the last 12 months, in South African time, oldest first.
 * Months with no income are included as zero so the dashboard chart has no gaps.
 */
function buildMonthlyIncome(transactions, now = new Date()) {
  const offsetMs = config.localUtcOffsetHours * HOUR_MS;
  const local = new Date(now.getTime() + offsetMs);
  const buckets = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - i, 1));
    buckets.push({ key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`, income: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  transactions.forEach((t) => {
    const when = new Date(new Date(t.createdAt).getTime() + offsetMs);
    if (Number.isNaN(when.getTime())) return;
    const bucket = byKey.get(`${when.getUTCFullYear()}-${String(when.getUTCMonth() + 1).padStart(2, '0')}`);
    if (bucket) bucket.income = round2(bucket.income + t.amount);
  });
  return buckets;
}

/** The calculation, in plain language, shown to the freelancer so the estimate is never a black box. */
function buildMethodology(taxYearLabel) {
  return [
    `1. Add up every simulated booking payment received in the ${taxYearLabel} tax year (1 March to the end of February).`,
    '2. Apply the SARS individual income tax brackets to that amount: each slice of income is taxed at its own rate.',
    `3. Subtract the primary rebate of ${formatRand(config.taxPrimaryRebate)}; tax can never go below R0.`,
    `4. Income up to ${formatRand(config.taxFreeThreshold)} therefore results in R0 tax.`,
    '5. The effective rate is the estimated tax divided by that tax-year income.',
  ];
}

/** Plain-language explanation shown next to the estimate (SARS, 2026). */
function buildTaxNote({ taxYearLabel, taxYearIncome, estimatedAnnualTax }) {
  const threshold = formatRand(config.taxFreeThreshold);
  if (taxYearIncome <= 0) return `No income recorded yet in the ${taxYearLabel} tax year. Tax only applies once income passes ${threshold}.`;
  if (estimatedAnnualTax === 0) return `R0 is correct for now: income under ${threshold} is covered by the SARS primary rebate.`;
  return `Calculated on ${formatRand(taxYearIncome)} earned in the ${taxYearLabel} tax year, after the SARS primary rebate.`;
}

async function getIncomeSummary(freelancerId, now = new Date()) {
  const transactions = await transactionRepository.findByFreelancer(freelancerId);
  const taxYear = getTaxYear(now);

  // A record without a usable timestamp is counted in the current year rather than silently dropped.
  const inTaxYear = (t) => {
    const when = new Date(t.createdAt);
    return Number.isNaN(when.getTime()) || (when >= taxYear.start && when < taxYear.end);
  };

  const totalIncome = round2(transactions.reduce((sum, t) => sum + t.amount, 0));
  const taxYearIncome = round2(transactions.filter(inTaxYear).reduce((sum, t) => sum + t.amount, 0));
  const estimatedAnnualTax = estimateAnnualTax(taxYearIncome);
  const effectiveTaxRate = taxYearIncome > 0 ? round2((estimatedAnnualTax / taxYearIncome) * 100) : 0;

  return {
    totalIncome,
    transactionCount: transactions.length,
    taxYear: taxYear.label,
    taxYearIncome,
    taxFreeThreshold: config.taxFreeThreshold,
    amountUntilTaxApplies: round2(Math.max(0, config.taxFreeThreshold - taxYearIncome)),
    estimatedAnnualTax,
    effectiveTaxRate, // percentage
    marginalTaxRate: round2(getMarginalRate(taxYearIncome) * 100), // percentage
    netIncomeAfterTax: round2(taxYearIncome - estimatedAnnualTax),
    taxBreakdown: buildTaxBreakdown(taxYearIncome),
    monthlyIncome: buildMonthlyIncome(transactions, now),
    methodology: buildMethodology(taxYear.label),
    taxNote: buildTaxNote({ taxYearLabel: taxYear.label, taxYearIncome, estimatedAnnualTax }),
    currency: 'ZAR',
    disclaimer: 'Estimated figure based on marketplace income only, using SARS 2026/27 individual tax brackets. Not professional tax advice.',
    transactions,
  };
}

module.exports = { getIncomeSummary, estimateAnnualTax, getTaxYear, buildTaxBreakdown, buildMonthlyIncome, getMarginalRate };
