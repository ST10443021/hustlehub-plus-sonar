// Component tests for the freelancer income dashboard, using React Testing
// Library's user-centred queries (Testing Library, n.d.) and Vitest (Vitest, n.d.).
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import apiClient from '../api/client';
import DashboardPage from '../pages/DashboardPage';

const base = {
  currency: 'ZAR', taxYear: '2026/27', taxFreeThreshold: 99000,
  disclaimer: 'Estimated figure based on marketplace income only.',
};
const respond = (data) => vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { data: { ...base, ...data } } });

describe('Income dashboard', () => {
  test('explains why R0 tax is correct for income under the threshold', async () => {
    respond({
      totalIncome: 10500, transactionCount: 3, taxYearIncome: 10500, amountUntilTaxApplies: 88500,
      estimatedTaxToDate: 0, effectiveTaxRate: 0,
      taxNote: 'R0 is correct for now: income under R99,000 is covered by the SARS primary rebate.',
    });
    render(<DashboardPage />);
    expect(await screen.findByText('R10500.00')).toBeInTheDocument();
    expect(screen.getByText('R0.00')).toBeInTheDocument();
    expect(screen.getByText(/R0 is correct for now/)).toBeInTheDocument();
    expect(screen.getByText(/Tax year 2026\/27/)).toBeInTheDocument();
  });

  test('shows a non-zero tax estimate once income passes the threshold', async () => {
    respond({
      totalIncome: 150000, transactionCount: 1, taxYearIncome: 150000, amountUntilTaxApplies: 0,
      estimatedTaxToDate: 9180, effectiveTaxRate: 6.12,
      taxNote: 'Calculated on R150,000 earned in the 2026/27 tax year, after the SARS primary rebate.',
    });
    render(<DashboardPage />);
    expect(await screen.findByText('R9180.00')).toBeInTheDocument();
    expect(screen.getByText(/Effective rate: 6.12%/)).toBeInTheDocument();
  });
});

// ---- Part 3: chart, tax breakdown, progress and methodology (SARS, 2026; IIE, 2026c) ----
import { within } from '@testing-library/react';

const months = Array.from({ length: 12 }, (_, i) => ({ key: `2026-${String(i + 1).padStart(2, '0')}`, label: `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]} 2026`, income: i === 8 ? 150000 : 0 }));
const full = {
  totalIncome: 150000, transactionCount: 1, taxYearIncome: 150000, amountUntilTaxApplies: 0,
  estimatedTaxToDate: 9180, effectiveTaxRate: 6.12, marginalTaxRate: 18, netIncomeAfterTax: 140820,
  taxNote: 'Calculated on R150,000 earned in the 2026/27 tax year, after the SARS primary rebate.',
  taxBreakdown: { brackets: [{ from: 0, to: 245100, rate: 0.18, amountInBracket: 150000, taxInBracket: 27000 }], grossTax: 27000, primaryRebate: 17820, netTax: 9180 },
  monthlyIncome: months,
  methodology: ['1. Add up every payment.', '2. Apply the brackets.'],
  transactions: [{ id: 't1', bookingId: 'b1', amount: 150000, createdAt: '2026-09-01T08:00:00Z' }],
};

describe('Income dashboard analytics', () => {
  test('shows income after tax, the marginal rate and the bar chart', async () => {
    respond(full);
    render(<DashboardPage />);
    const afterTax = await screen.findByLabelText('Income after tax');
    expect(within(afterTax).getByText('R140820.00')).toBeInTheDocument();
    expect(screen.getByText(/Marginal rate: 18%/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /bar chart of income/i })).toBeInTheDocument();
  });

  test('labels the tax figure as tax so far this tax year, not as an annual projection', async () => {
    respond(full);
    render(<DashboardPage />);
    const card = await screen.findByLabelText('Estimated tax so far this tax year');
    expect(within(card).getByRole('heading', { name: 'Tax So Far This Tax Year' })).toBeInTheDocument();
    expect(within(card).getByText('R9180.00')).toBeInTheDocument();
    expect(within(card).getByText(/not a full-year projection/)).toBeInTheDocument();
    expect(screen.queryByText(/Estimated Annual Tax/i)).not.toBeInTheDocument();
  });

  test('lists each tax bracket and the rebate so the estimate can be checked', async () => {
    respond(full);
    render(<DashboardPage />);
    const section = await screen.findByLabelText('How your tax is calculated');
    expect(within(section).getByText('R0.00 to R245100.00')).toBeInTheDocument();
    // With one bracket the bracket tax and the tax before the rebate are the same figure, so both rows show it.
    expect(within(section).getAllByText('R27000.00')).toHaveLength(2);
    expect(within(section).getByRole('row', { name: /Tax before rebate/ })).toHaveTextContent('R27000.00');
    expect(within(section).getByText('-R17820.00')).toBeInTheDocument();
    expect(within(section).getByText('R9180.00')).toBeInTheDocument();
  });

  test('shows progress towards the threshold when income is below it', async () => {
    respond({ ...full, taxYearIncome: 49500, amountUntilTaxApplies: 49500, estimatedTaxToDate: 0 });
    render(<DashboardPage />);
    const bar = await screen.findByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/R49500.00 to go before tax applies/)).toBeInTheDocument();
  });

  test('explains the calculation and lists recent payments', async () => {
    respond(full);
    render(<DashboardPage />);
    expect(await screen.findByText('How is this calculated?')).toBeInTheDocument();
    expect(screen.getByText('Add up every payment.')).toBeInTheDocument(); // the "1." prefix is stripped by the list numbering
    const recent = screen.getByLabelText('Recent payments');
    expect(within(recent).getByText('R150000.00')).toBeInTheDocument();
  });

  test('shows a friendly error and a retry button when the request fails', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue({ response: { data: { message: 'Something failed.' } } });
    render(<DashboardPage />);
    expect(await screen.findByText('Something failed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  test('renders hostile text as plain text instead of HTML', async () => {
    respond({ ...full, taxNote: '<img src=x onerror=alert(1)>' });
    const { container } = render(<DashboardPage />);
    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });
});
