export function money(cents, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(cents / 100);
}

export function dateLabel(iso) {
  return new Intl.DateTimeFormat('en-ZA', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso));
}

// Starter browser validation only. The backend must validate independently.
export function validateGig(values) {
  const errors = {};
  const title = String(values.title ?? '').trim();
  const description = String(values.description ?? '').trim();
  const price = String(values.price ?? '').trim();
  if (title.length < 3 || title.length > 80) errors.title = 'Use between 3 and 80 characters.';
  if (description.length < 10 || description.length > 500) errors.description = 'Use between 10 and 500 characters.';
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) <= 0 || Number(price) > 1000000) {
    errors.price = 'Enter a price above R0, with no more than two decimal places (maximum R1,000,000).';
  }
  return { errors, data: { title, description, priceCents: Math.round(Number(price) * 100) } };
}
