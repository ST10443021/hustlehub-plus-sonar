// Bar chart of monthly income, drawn as plain SVG.
//
// Drawing the chart ourselves (instead of adding a charting library) keeps the dependency list,
// and therefore the attack surface and the npm audit results, small. It also works with the strict
// Content Security Policy, because SVG attributes are not inline scripts or styles (Mozilla, 2026b;
// OWASP, 2021). The chart is exposed to screen readers through role="img", an aria-label and a
// matching data table (W3C, 2023). Every value is rendered as text by React, never as HTML.
import { niceMax, rand, randCompact } from '../lib/format';

const WIDTH = 640;
const HEIGHT = 280;
const MARGIN = { top: 16, right: 12, bottom: 44, left: 56 };

export default function IncomeChart({ months }) {
  const data = Array.isArray(months) ? months : [];
  if (data.length === 0) return null;

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const top = niceMax(Math.max(...data.map((m) => m.income)));
  const slot = plotWidth / data.length;
  const barWidth = Math.min(34, slot * 0.62);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const y = (value) => MARGIN.top + plotHeight - (value / top) * plotHeight;

  return (
    <figure className="chart">
      <figcaption>Income per month (last 12 months)</figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Bar chart of income received in each of the last 12 months" className="chart-svg">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y(top * t)} y2={y(top * t)} className="chart-grid" />
            <text x={MARGIN.left - 8} y={y(top * t) + 4} textAnchor="end" className="chart-axis">{randCompact(top * t)}</text>
          </g>
        ))}
        {data.map((m, i) => {
          const barHeight = (m.income / top) * plotHeight;
          const x = MARGIN.left + i * slot + (slot - barWidth) / 2;
          return (
            <g key={m.key}>
              <rect x={x} y={y(m.income)} width={barWidth} height={Math.max(barHeight, m.income > 0 ? 2 : 0)} rx="3" className="chart-bar">
                <title>{`${m.label}: ${rand(m.income)}`}</title>
              </rect>
              <text x={x + barWidth / 2} y={HEIGHT - MARGIN.bottom + 16} textAnchor="middle" className="chart-axis">{m.label.slice(0, 3)}</text>
              {(i === 0 || m.label.startsWith('Jan')) && (
                <text x={x + barWidth / 2} y={HEIGHT - MARGIN.bottom + 30} textAnchor="middle" className="chart-axis">{m.label.slice(4)}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="chart-data">
        <summary>View chart data as a table</summary>
        <table>
          <caption className="sr-only">Income per month</caption>
          <thead><tr><th scope="col">Month</th><th scope="col">Income</th></tr></thead>
          <tbody>{data.map((m) => <tr key={m.key}><th scope="row">{m.label}</th><td>{rand(m.income)}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}
