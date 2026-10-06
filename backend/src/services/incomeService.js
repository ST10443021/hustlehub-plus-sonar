// Income / tax-estimate service.
//
// Implements the "tracking of income for Freelancers" and "calculation
// and display of estimated tax values" requirements (IIE, 2026). The
// figure produced here is explicitly an *estimate* for a simulated
// marketplace - it applies SARS's published 2026/27 individual marginal
// tax brackets and primary rebate (SARS, 2026) to the freelancer's
// *marketplace* income alone, which is not the same as their real total
// annual taxable income, and the API/UI must label it accordingly.
const transactionRepository = require('../repositories/transactionRepository');
const config = require('../config/env');

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
  return Math.round(netTax * 100) / 100;
}

async function getIncomeSummary(freelancerId) {
  const transactions = await transactionRepository.findByFreelancer(freelancerId);
  const totalIncome = transactions.reduce((sum, t) => sum + t.amount, 0);
  const estimatedAnnualTax = estimateAnnualTax(totalIncome);
  const effectiveTaxRate = totalIncome > 0 ? Math.round((estimatedAnnualTax / totalIncome) * 10000) / 100 : 0;

  return {
    totalIncome: Math.round(totalIncome * 100) / 100,
    transactionCount: transactions.length,
    estimatedAnnualTax,
    effectiveTaxRate, // percentage
    currency: 'ZAR',
    disclaimer: 'Estimated figure based on marketplace income only, using SARS 2026/27 individual tax brackets. Not professional tax advice.',
    transactions,
  };
}

module.exports = { getIncomeSummary, estimateAnnualTax };
