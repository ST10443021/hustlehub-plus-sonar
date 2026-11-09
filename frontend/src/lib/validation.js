export function validateAuth(form, registering = false) {
  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(form.email.trim())) return 'Enter a valid email address.';
  if (!form.password) return 'Enter your password.';
  if (registering && (form.password.length < 8 || form.password.length > 72 || new TextEncoder().encode(form.password).length > 72 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password))) {
    return 'Use 8 to 72 characters, with uppercase, lowercase and a number.';
  }
  if (registering && !['client', 'freelancer'].includes(form.role)) return 'Choose client or freelancer.';
  return '';
}
export function validateGig(form) {
  if (form.title.trim().length < 3 || form.title.trim().length > 120) return 'Title needs 3 to 120 characters.';
  if (form.category.trim().length < 2 || form.category.trim().length > 60) return 'Category needs 2 to 60 characters.';
  if (form.description.trim().length < 10 || form.description.trim().length > 2000) return 'Description needs 10 to 2000 characters.';
  if (!String(form.price).trim() || !Number.isFinite(Number(form.price)) || Number(form.price) < 0 || Number(form.price) > 1000000) return 'Enter a price between R0 and R1,000,000.';
  if (Math.abs(Number(form.price) * 100 - Math.round(Number(form.price) * 100)) > 0.000001) return 'Price may have at most two decimal places.';
  return '';
}