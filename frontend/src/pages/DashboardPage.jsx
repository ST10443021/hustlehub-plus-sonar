import { useCallback, useEffect, useState } from 'react';
import apiClient, { getErrorMessage } from '../api/client';
import AlertMessage from '../components/AlertMessage';
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
  return <div className="page"><h1>Income Dashboard</h1><AlertMessage message={error} />
    {error && <button onClick={load}>Try again</button>}
    {loading && <p role="status">Loading income...</p>}
    {!loading && summary && <div className="dashboard-cards">
      <div className="card"><h3>Total Income</h3><p className="stat">R{Number(summary.totalIncome).toFixed(2)}</p><p className="hint">{summary.transactionCount} booking(s)</p></div>
      <div className="card"><h3>Estimated Annual Tax</h3><p className="stat">R{Number(summary.estimatedAnnualTax).toFixed(2)}</p><p className="hint">Effective rate: {summary.effectiveTaxRate}%</p></div>
      <AlertMessage type="info" message={summary.disclaimer} />
    </div>}
  </div>;
}
