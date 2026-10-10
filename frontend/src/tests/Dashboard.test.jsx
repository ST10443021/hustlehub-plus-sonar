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
      estimatedAnnualTax: 0, effectiveTaxRate: 0,
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
      estimatedAnnualTax: 9180, effectiveTaxRate: 6.12,
      taxNote: 'Calculated on R150,000 earned in the 2026/27 tax year, after the SARS primary rebate.',
    });
    render(<DashboardPage />);
    expect(await screen.findByText('R9180.00')).toBeInTheDocument();
    expect(screen.getByText(/Effective rate: 6.12%/)).toBeInTheDocument();
  });
});
