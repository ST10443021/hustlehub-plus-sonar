// Freelancer income dashboard. It shows income, the SARS-based tax estimate, a monthly income
// chart, how the tax is built up bracket by bracket, and a plain-language explanation, so a R0
// estimate is explained rather than looking like a bug (SARS, 2026; IIE, 2026c).
// Every value renders as React text, never as HTML, which prevents script injection (OWASP, 2021).
import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from '../components/AlertMessage';
import IncomeChart from '../components/IncomeChart';
import { rand, shortDate } from '../lib/format';

function bandLabel(row) {
  return row.to === null ? `Over ${rand(row.from)}` : `${rand(row.from)} to ${rand(row.to)}`;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const res = await apiClient.get('/income/summary'); setSummary(res.data.data); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const untilTax = Number(summary?.amountUntilTaxApplies ?? 0);
  const threshold = Number(summary?.taxFreeThreshold ?? 0);
  const progress = threshold > 0 ? Math.min(100, Math.round((Number(summary?.taxYearIncome ?? 0) / threshold) * 100)) : 0;
  const breakdown = summary?.taxBreakdown;
  const recent = (summary?.transactions ?? []).slice(0, 5);

  return <div className="page"><h1>Income Dashboard</h1><AlertMessage message={error} />
    {error && <button onClick={load}>Try again</button>}
    {loading && <p role="status">Loading income...</p>}
    {!loading && summary && <>
      <div className="dashboard-cards">
        <div className="card" aria-label="Total income"><h3>Total Income</h3><p className="stat">{rand(summary.totalIncome)}</p><p className="hint">{summary.transactionCount} booking(s)</p></div>
        <div className="card" aria-label="Estimated tax so far this tax year"><h3>Tax So Far This Tax Year</h3><p className="stat">{rand(summary.estimatedTaxToDate)}</p><p className="hint">Estimate on income received to date, not a full-year projection</p><p className="hint">Effective rate: {summary.effectiveTaxRate}%</p>
          {summary.marginalTaxRate !== undefined && <p className="hint">Marginal rate: {summary.marginalTaxRate}%</p>}
          {summary.taxYear && <p className="hint">Tax year {summary.taxYear}</p>}</div>
        {summary.netIncomeAfterTax !== undefined && <div className="card" aria-label="Income after tax"><h3>Income After Tax</h3><p className="stat">{rand(summary.netIncomeAfterTax)}</p><p className="hint">Tax-year income received so far, less the estimated tax</p></div>}
      </div>
      <AlertMessage type="info" message={summary.disclaimer} />
      {summary.taxNote && <p className="hint dashboard-note" role="note">{summary.taxNote}</p>}

      <IncomeChart months={summary.monthlyIncome} />

      {threshold > 0 && <section className="card threshold" aria-label="Progress towards the tax threshold">
        <h3>Progress towards the tax threshold</h3>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Tax-year income as a percentage of the tax threshold">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="hint">{progress}% of the {rand(threshold)} threshold{untilTax > 0 ? ` - ${rand(untilTax)} to go before tax applies.` : ' - tax now applies to income above this amount.'}</p>
      </section>}

      {breakdown && breakdown.brackets?.length > 0 && <section className="card" aria-label="How your tax is calculated">
        <h3>How the estimate is built</h3>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Income band</th><th scope="col">Rate</th><th scope="col">Income in band</th><th scope="col">Tax</th></tr></thead>
            <tbody>
              {breakdown.brackets.map((row) => <tr key={row.from}><td>{bandLabel(row)}</td><td>{Math.round(row.rate * 100)}%</td><td>{rand(row.amountInBracket)}</td><td>{rand(row.taxInBracket)}</td></tr>)}
              <tr><th scope="row" colSpan="3">Tax before rebate</th><td>{rand(breakdown.grossTax)}</td></tr>
              <tr><th scope="row" colSpan="3">Primary rebate</th><td>-{rand(breakdown.primaryRebate)}</td></tr>
              <tr className="total-row"><th scope="row" colSpan="3">Estimated tax</th><td>{rand(breakdown.netTax)}</td></tr>
            </tbody>
          </table>
        </div>
      </section>}

      {Array.isArray(summary.methodology) && summary.methodology.length > 0 && <details className="card method">
        <summary>How is this calculated?</summary>
        <ol>{summary.methodology.map((step) => <li key={step}>{step.replace(/^\d+\.\s*/, '')}</li>)}</ol>
      </details>}

      {recent.length > 0 && <section className="card" aria-label="Recent payments">
        <h3>Recent payments</h3>
        <div className="table-scroll">
          <table>
            <thead><tr><th scope="col">Date</th><th scope="col">Amount</th></tr></thead>
            <tbody>{recent.map((t) => <tr key={t.id || `${t.bookingId}-${t.createdAt}`}><td>{shortDate(t.createdAt)}</td><td>{rand(t.amount)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>}
    </>}
  </div>;
}
