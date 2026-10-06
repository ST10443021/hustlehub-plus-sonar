// A single, consistent way to surface both errors and success messages,
// so invalid input / failed requests are always shown to the user instead
// of failing silently (IIE, 2026 - "must handle invalid inputs gracefully").
export default function AlertMessage({ type = 'error', message }) {
  if (!message) return null;
  return (
    <div role="alert" className={`alert alert-${type}`}>
      {message}
    </div>
  );
}
