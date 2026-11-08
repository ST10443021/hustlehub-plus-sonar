// Maps the existing, redacted eventLogger payload to Application Insights custom events.
// This is a small HTTPS ingestion adapter, not automatic SDK instrumentation. Microsoft's
// troubleshooting guide documents the regional /v2.1/track endpoint; connection strings
// supply the instrumentation key and regional ingestion endpoint (Microsoft, n.d.a; Microsoft, n.d.b).

/** Accepts the full portal connection string. Never prints it or falls back to HTTP. */
function parseConnectionString(connectionString) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) return null;
  const fields = new Map(connectionString.split(';').filter((part) => part.trim()).map((part) => {
    const split = part.indexOf('=');
    return [part.slice(0, split).trim().toLowerCase(), part.slice(split + 1).trim()];
  }));
  const instrumentationKey = fields.get('instrumentationkey');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(instrumentationKey || '')) return null;
  try {
    // Require the explicit endpoint from the portal; do not guess a region or global endpoint.
    const endpoint = new URL(fields.get('ingestionendpoint'));
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
    endpoint.pathname = `${endpoint.pathname.replace(/\/$/, '')}/v2.1/track`;
    return { url: endpoint.href, instrumentationKey };
  } catch {
    return null;
  }
}

/** All event details have already passed through eventLogger.sanitise before this mapping. */
function toEnvelope(entry, instrumentationKey) {
  const { dt, message, ...details } = entry;
  return {
    ver: 1,
    name: `Microsoft.ApplicationInsights.${instrumentationKey.replace(/-/g, '')}.Event`,
    time: dt,
    iKey: instrumentationKey,
    sampleRate: 100,
    tags: { 'ai.cloud.role': 'hustlehub-backend' },
    data: {
      baseType: 'EventData',
      baseData: {
        ver: 2,
        name: message,
        properties: Object.fromEntries(Object.entries(details)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])),
      },
    },
  };
}

/** Azure may accept only part of a batch (206). Retry rejected items, not accepted ones. */
function rejectedEntries(result, batch) {
  const errors = result && result.errors;
  if (!Array.isArray(errors) || result.itemsReceived !== batch.length || errors.length === 0
      || result.itemsAccepted !== batch.length - errors.length
      || errors.some((error) => !Number.isInteger(error.index) || error.index < 0 || error.index >= batch.length)
      || new Set(errors.map((error) => error.index)).size !== errors.length) {
    throw new Error('Azure returned an invalid partial-acceptance response');
  }
  const rejected = new Set(errors.map((error) => error.index));
  return batch.filter((_, index) => rejected.has(index));
}

module.exports = { parseConnectionString, toEnvelope, rejectedEntries };
