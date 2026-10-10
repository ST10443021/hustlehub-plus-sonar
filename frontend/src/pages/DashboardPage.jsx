// Freelancer income dashboard. Shows income, the SARS-based tax estimate and a
// plain-language note, so a R0 estimate is explained rather than looking like
// a bug: income under the tax threshold is covered by the primary rebate (SARS, 2026).
// Values render as React text, never as HTML, which prevents script injection (OWASP, 2021).
import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from '../components/AlertMessage';

const rand = (value) => `R${Number(value).toFixed(2)}`;

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
  return <div className="page"><h1>Income Dashboard</h1><AlertMessage message={error} />
    {error && <button onClick={load}>Try again</button>}
    {loading && <p role="status">Loading income...</p>}
    {!loading && summary && <>
      <div className="dashboard-cards">
        <div className="card"><h3>Total Income</h3><p className="stat">{rand(summary.totalIncome)}</p><p className="hint">{summary.transactionCount} booking(s)</p></div>
        <div className="card"><h3>Estimated Annual Tax</h3><p className="stat">{rand(summary.estimatedAnnualTax)}</p><p className="hint">Effective rate: {summary.effectiveTaxRate}%</p>
          {summary.taxYear && <p className="hint">Tax year {summary.taxYear}</p>}</div>
        <AlertMessage type="info" message={summary.disclaimer} />
      </div>
      {summary.taxNote && <p className="hint dashboard-note" role="note">{summary.taxNote}</p>}
      {summary.taxFreeThreshold > 0 && untilTax > 0 &&
        <p className="hint dashboard-note">Tax starts once income passes {rand(summary.taxFreeThreshold)}; you are {rand(untilTax)} away.</p>}
    </>}
  </div>;
}
