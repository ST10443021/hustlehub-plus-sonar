// Optional cloud copy of the existing structured, redacted events.
// APPLICATIONINSIGHTS_CONNECTION_STRING selects Azure Application Insights. Otherwise the
// existing LOG_CLOUD_URL + LOG_CLOUD_TOKEN settings select Better Stack's JSON HTTP source.
// No request bodies, automatic exception stacks or SDK auto-instrumentation are collected.
const config = require('../config/env');
const { parseConnectionString, toEnvelope, rejectedEntries } = require('./azureLogTransport');

const MAX_BUFFER = 1000;
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 5000;

let buffer = [];
let timer = null;
let inFlight = null;
let failureReported = false;

function destination() {
  // An invalid supplied Azure setting must not silently send events to another provider.
  if (config.applicationInsightsConnectionString) {
    const azure = parseConnectionString(config.applicationInsightsConnectionString);
    return azure ? { provider: 'azure', ...azure } : null;
  }
  return config.logCloudUrl && config.logCloudToken
    ? { provider: 'http', url: config.logCloudUrl } : null;
}

function isEnabled() {
  return Boolean(destination());
}

function schedule() {
  if (timer || !isEnabled() || buffer.length === 0) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
  timer.unref();
}

/** Queues one redacted entry; delivery never waits inside a marketplace request. */
function enqueue(entry) {
  if (!isEnabled()) return;
  if (buffer.length >= MAX_BUFFER) buffer.shift();
  buffer.push(entry);
  if (buffer.length >= BATCH_SIZE) flush();
  else schedule();
}

function reportFailure(message) {
  if (failureReported) return;
  failureReported = true;
  // Do not include the connection string, response body or raw network error in console logs.
  console.error(`Cloud log delivery failed (will retry): ${message}`);
}

/** One bounded HTTPS request. Keeps failed entries for retry, including partial acceptance. */
async function sendBatch(target, batch) {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (target.provider === 'http') headers.Authorization = `Bearer ${config.logCloudToken}`;
    const payload = target.provider === 'azure'
      ? batch.map((entry) => toEnvelope(entry, target.instrumentationKey)) : batch;
    const response = await fetch(target.url, {
      method: 'POST', headers, body: JSON.stringify(payload),
      redirect: 'error', // Never forward telemetry or bearer credentials to a redirected host.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error('delivery rejected');
    if (target.provider === 'azure' && response.status === 206) {
      const rejected = rejectedEntries(await response.json(), batch);
      buffer = rejected.concat(buffer).slice(-MAX_BUFFER);
      reportFailure('Azure rejected part of the event batch.');
      return false;
    }
    failureReported = false;
    return true;
  } catch {
    buffer = batch.concat(buffer).slice(-MAX_BUFFER);
    reportFailure('Check the cloud settings, connectivity, resource access and quota.');
    return false;
  }
}

/** Concurrent callers share the same delivery promise, including shutdown while a send is active. */
function flush() {
  if (inFlight) return inFlight;
  const target = destination();
  if (!target || buffer.length === 0) return Promise.resolve(true);
  const batch = buffer.splice(0, BATCH_SIZE);
  inFlight = sendBatch(target, batch).finally(() => {
    inFlight = null;
    schedule();
  });
  return inFlight;
}

/** Shutdown is also bounded by the existing server's eight-second exit deadline. */
async function flushAll() {
  while (isEnabled() && (inFlight || buffer.length > 0)) {
    if (!await flush()) break;
  }
}

/** Test helper; callers finish outstanding sends before resetting. */
function _reset() {
  buffer = [];
  inFlight = null;
  failureReported = false;
  if (timer) clearTimeout(timer);
  timer = null;
}

module.exports = { enqueue, flush, flushAll, isEnabled, _reset, _pending: () => buffer.length };
