// Component tests for the SVG income chart and its formatting helpers (Testing Library, n.d.; Vitest, n.d.).
import { describe, expect, test } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IncomeChart from '../components/IncomeChart';
import { niceMax, rand, randCompact } from '../lib/format';

const data = [
  { key: '2026-08', label: 'Aug 2026', income: 0 },
  { key: '2026-09', label: 'Sep 2026', income: 1200 },
  { key: '2026-10', label: 'Oct 2026', income: 4800 },
];

describe('IncomeChart', () => {
  test('draws one bar per month with an accessible description', () => {
    const { container } = render(<IncomeChart months={data} />);
    expect(screen.getByRole('img', { name: /last 12 months/i })).toBeInTheDocument();
    expect(container.querySelectorAll('rect.chart-bar')).toHaveLength(3);
  });

  test('bar tooltips carry the month and amount', () => {
    const { container } = render(<IncomeChart months={data} />);
    const titles = [...container.querySelectorAll('rect.chart-bar title')].map((t) => t.textContent);
    expect(titles).toContain('Oct 2026: R4800.00');
  });

  test('the data table gives screen-reader and keyboard users the same numbers', async () => {
    render(<IncomeChart months={data} />);
    await userEvent.click(screen.getByText('View chart data as a table'));
    const row = screen.getByRole('row', { name: /Sep 2026/ });
    expect(within(row).getByText('R1200.00')).toBeInTheDocument();
  });

  test('draws nothing for missing or empty data', () => {
    const { container, rerender } = render(<IncomeChart months={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<IncomeChart months={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('a year with no income still draws a readable axis', () => {
    const { container } = render(<IncomeChart months={data.map((m) => ({ ...m, income: 0 }))} />);
    expect(container.textContent).toContain('R1k');
  });
});

describe('format helpers', () => {
  test.each([[0, 1000], [900, 1000], [4800, 5000], [12000, 20000], [26000, 50000]])('niceMax(%d) = %d', (input, expected) => {
    expect(niceMax(input)).toBe(expected);
  });
  test('randCompact abbreviates thousands and millions', () => {
    expect(randCompact(950)).toBe('R950');
    expect(randCompact(25000)).toBe('R25k');
    expect(randCompact(1500000)).toBe('R1.5m');
  });
  test('rand always shows two decimals and treats bad input as zero', () => {
    expect(rand(10500)).toBe('R10500.00');
    expect(rand(undefined)).toBe('R0.00');
  });
});
