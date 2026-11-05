// Unit tests for the SARS-based tax estimate (SARS, 2026) and the tax-year income filter,
// written with Jest (see package.json) against a mocked repository so no database is needed.
jest.mock('../src/repositories/transactionRepository', () => ({ findByFreelancer: jest.fn() }));
const transactionRepository = require('../src/repositories/transactionRepository');
const { estimateAnnualTax, getTaxYear, getIncomeSummary } = require('../src/services/incomeService');

describe('estimateAnnualTax (SARS 2026/27 brackets and R17,820 primary rebate)', () => {
  test.each([
    [0, 0],
    [10500, 0], // the dashboard case: under the R99,000 threshold, so R0 is correct
    [99000, 0], // exactly the threshold
    [150000, 9180], // 150,000 x 18% = 27,000 - 17,820
    [245100, 26298], // top of the first bracket: 44,118 - 17,820
    [300000, 40572], // 44,118 + (54,900 x 26%) - 17,820
  ])('R%d of income -> R%d tax', (income, tax) => {
    expect(estimateAnnualTax(income)).toBe(tax);
  });
});

describe('getTaxYear (1 March to end of February, South African time)', () => {
  test('9 October 2026 falls in 2026/27', () => {
    expect(getTaxYear(new Date('2026-10-09T21:00:00Z')).label).toBe('2026/27');
  });
  test('the year rolls over at midnight on 1 March in SAST', () => {
    expect(getTaxYear(new Date('2027-02-28T21:59:00Z')).label).toBe('2026/27');
    expect(getTaxYear(new Date('2027-02-28T22:00:00Z')).label).toBe('2027/28');
  });
  test('January 2027 still belongs to 2026/27', () => {
    expect(getTaxYear(new Date('2027-01-15T10:00:00Z')).label).toBe('2026/27');
  });
});

describe('getIncomeSummary', () => {
  const now = new Date('2026-10-09T21:00:00Z');
  const tx = (amount, createdAt) => ({ amount, createdAt });

  test('R10,500 gives R0 tax with an explanation and the distance to the threshold', async () => {
    transactionRepository.findByFreelancer.mockResolvedValue([tx(3500, '2026-10-01T08:00:00Z'), tx(3500, '2026-10-02T08:00:00Z'), tx(3500, '2026-10-03T08:00:00Z')]);
    const s = await getIncomeSummary('f1', now);
    expect(s).toMatchObject({ totalIncome: 10500, taxYearIncome: 10500, estimatedAnnualTax: 0, amountUntilTaxApplies: 88500, taxFreeThreshold: 99000, taxYear: '2026/27' });
    expect(s.taxNote).toMatch(/R0 is correct for now: income under R99,000/);
  });

  test('income above the threshold produces a non-zero estimate', async () => {
    transactionRepository.findByFreelancer.mockResolvedValue([tx(150000, '2026-09-01T08:00:00Z')]);
    const s = await getIncomeSummary('f1', now);
    expect(s).toMatchObject({ estimatedAnnualTax: 9180, effectiveTaxRate: 6.12, amountUntilTaxApplies: 0 });
    expect(s.taxNote).toMatch(/Calculated on R150,000 earned in the 2026\/27 tax year/);
  });

  test('income from a previous tax year counts towards total income but is not taxed again', async () => {
    transactionRepository.findByFreelancer.mockResolvedValue([tx(150000, '2026-09-01T08:00:00Z'), tx(80000, '2026-02-10T08:00:00Z')]);
    const s = await getIncomeSummary('f1', now);
    expect(s.totalIncome).toBe(230000);
    expect(s.taxYearIncome).toBe(150000);
    expect(s.estimatedAnnualTax).toBe(9180);
  });

  test('no transactions gives a friendly note, not an error', async () => {
    transactionRepository.findByFreelancer.mockResolvedValue([]);
    const s = await getIncomeSummary('f1', now);
    expect(s).toMatchObject({ totalIncome: 0, estimatedAnnualTax: 0, effectiveTaxRate: 0 });
    expect(s.taxNote).toMatch(/No income recorded yet/);
  });
});

// ---- Part 3: dashboard analytics (SARS, 2026) ----
const { buildTaxBreakdown, buildMonthlyIncome, getMarginalRate } = require('../src/services/incomeService');

describe('buildTaxBreakdown', () => {
  test.each([0, 10500, 150000, 300000, 600000, 2000000])('bracket amounts add up to the same tax as estimateAnnualTax for R%d', (income) => {
    const breakdown = buildTaxBreakdown(income);
    expect(breakdown.netTax).toBe(estimateAnnualTax(income));
    expect(breakdown.brackets.reduce((sum, row) => sum + row.amountInBracket, 0)).toBeCloseTo(income, 2);
  });
  test('only brackets that contain income are listed', () => {
    expect(buildTaxBreakdown(300000).brackets.map((b) => b.rate)).toEqual([0.18, 0.26]);
  });
});

describe('getMarginalRate', () => {
  test.each([[0, 0.18], [100000, 0.18], [300000, 0.26], [500000, 0.31], [5000000, 0.45]])('R%d -> %s', (income, rate) => {
    expect(getMarginalRate(income)).toBe(rate);
  });
});

describe('buildMonthlyIncome', () => {
  const now = new Date('2026-10-29T10:00:00Z');
  test('returns 12 consecutive months ending in the current month, filling gaps with zero', () => {
    const months = buildMonthlyIncome([], now);
    expect(months).toHaveLength(12);
    expect(months[0].key).toBe('2025-11');
    expect(months[11]).toMatchObject({ key: '2026-10', label: 'Oct 2026', income: 0 });
  });
  test('groups by South African month (UTC+2): 23:00 UTC on 31 Aug is already 1 September', () => {
    const months = buildMonthlyIncome([{ amount: 200, createdAt: '2026-08-31T23:00:00Z' }, { amount: 50, createdAt: '2026-09-10T08:00:00Z' }], now);
    expect(months.find((m) => m.key === '2026-08').income).toBe(0);
    expect(months.find((m) => m.key === '2026-09').income).toBe(250);
  });
  test('ignores income older than 12 months and records with a bad date', () => {
    const months = buildMonthlyIncome([{ amount: 999, createdAt: '2024-01-01T00:00:00Z' }, { amount: 5, createdAt: 'not-a-date' }], now);
    expect(months.reduce((sum, m) => sum + m.income, 0)).toBe(0);
  });
});

describe('getIncomeSummary analytics fields', () => {
  test('includes net income, marginal rate, breakdown, monthly series and methodology', async () => {
    transactionRepository.findByFreelancer.mockResolvedValue([{ amount: 150000, createdAt: '2026-09-01T08:00:00Z' }]);
    const s = await getIncomeSummary('f1', new Date('2026-10-09T21:00:00Z'));
    expect(s).toMatchObject({ netIncomeAfterTax: 140820, marginalTaxRate: 18 });
    expect(s.taxBreakdown).toMatchObject({ grossTax: 27000, primaryRebate: 17820, netTax: 9180 });
    expect(s.monthlyIncome).toHaveLength(12);
    expect(s.monthlyIncome.find((m) => m.key === '2026-09').income).toBe(150000);
    expect(s.methodology.length).toBeGreaterThanOrEqual(5);
  });
});
