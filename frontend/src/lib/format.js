// Small formatting helpers shared by the dashboard and admin pages.

/** Formats a number as South African rand with two decimals, e.g. 10500 -> "R10500.00". */
export const rand = (value) => `R${Number(value || 0).toFixed(2)}`;

/** Compact rand label for chart axes, e.g. 25000 -> "R25k", 1500000 -> "R1.5m". */
export function randCompact(value) {
  const n = Number(value || 0);
  if (n >= 1000000) return `R${+(n / 1000000).toFixed(1)}m`;
  if (n >= 1000) return `R${+(n / 1000).toFixed(1)}k`;
  return `R${Math.round(n)}`;
}

/**
 * Rounds a chart maximum up to a "nice" number (1, 2, 2.5, 5 or 10 times a power of ten) so the
 * axis labels are readable. A chart with no income still gets a sensible R1000 axis.
 */
export function niceMax(max) {
  if (!max || max <= 0) return 1000;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= max);
  return step * magnitude;
}

/** Date for tables, in the South African format. Returns an empty string for bad input. */
export function shortDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}
