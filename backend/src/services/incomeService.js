// Income / tax-estimate service.
//
// Implements the "tracking of income for Freelancers" and "calculation
// and display of estimated tax values" requirements (IIE, 2026b). The
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
    taxNote: buildTaxNote({ taxYearLabel: taxYear.label, taxYearIncome, estimatedAnnualTax }),
    currency: 'ZAR',
    disclaimer: 'Estimated figure based on marketplace income only, using SARS 2026/27 individual tax brackets. Not professional tax advice.',
    transactions,
  };
}

module.exports = { getIncomeSummary, estimateAnnualTax, getTaxYear };
