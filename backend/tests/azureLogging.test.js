// Payload, redaction and retry checks. HTTP is mocked: these do not prove live Azure ingestion.
const config = require('../src/config/env');
const cloudLogger = require('../src/utils/cloudLogger');
const { logEvent } = require('../src/utils/eventLogger');
const { parseConnectionString } = require('../src/utils/azureLogTransport');

const key = '11111111-2222-3333-4444-555555555555';
const connectionString = `InstrumentationKey=${key};IngestionEndpoint=https://southafricanorth-0.in.applicationinsights.azure.com/;ApplicationId=fixture`;
const originalFetch = global.fetch;
const originalAzure = config.applicationInsightsConnectionString;
const originalUrl = config.logCloudUrl;
const originalToken = config.logCloudToken;

beforeEach(() => {
  cloudLogger._reset();
  config.applicationInsightsConnectionString = connectionString;
  config.logCloudUrl = '';
  config.logCloudToken = '';
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
});

afterEach(() => {
  cloudLogger._reset();
  config.applicationInsightsConnectionString = originalAzure;
  config.logCloudUrl = originalUrl;
  config.logCloudToken = originalToken;
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test('parses a complete portal connection string without changing the regional host', () => {
  expect(parseConnectionString(connectionString)).toEqual({
    url: 'https://southafricanorth-0.in.applicationinsights.azure.com/v2.1/track',
    instrumentationKey: key,
  });
  expect(parseConnectionString(` InstrumentationKey = ${key} ; INGESTIONENDPOINT=https://regional.example.test/;`)).not.toBeNull();
});

test.each([
  '', 'not-a-connection-string', `InstrumentationKey=${key}`,
  'InstrumentationKey=invalid;IngestionEndpoint=https://regional.example.test/',
  `InstrumentationKey=${key};IngestionEndpoint=http://regional.example.test/`,
  `InstrumentationKey=${key};IngestionEndpoint=https://user:password@regional.example.test/`,
  `InstrumentationKey=${key};IngestionEndpoint=https://regional.example.test/?secret=value`,
  `InstrumentationKey=${key};IngestionEndpoint=https://regional.example.test/#fragment`,
])('rejects incomplete or insecure Azure configuration (%#)', (value) => {
  config.applicationInsightsConnectionString = value;
  expect(cloudLogger.isEnabled()).toBe(false);
  cloudLogger.enqueue({ message: 'ignored' });
  expect(cloudLogger._pending()).toBe(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

test('posts a redacted custom event with its original time, level, category and request ID', async () => {
  logEvent('booking_created', {
    bookingId: 'b1', requestId: 'r1', amount: 100, password: 'private-fixture',
    uri: 'mongodb://test:private-fixture@db/app',
  });
  expect(cloudLogger.isEnabled()).toBe(true);
  expect(await cloudLogger.flush()).toBe(true);
  const [url, options] = global.fetch.mock.calls[0];
  expect(url).toBe('https://southafricanorth-0.in.applicationinsights.azure.com/v2.1/track');
  expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
  expect(options.redirect).toBe('error');
  expect(options.signal).toBeInstanceOf(AbortSignal);
  expect(options.body).not.toContain('private-fixture');
  const [event] = JSON.parse(options.body);
  expect(event).toMatchObject({ iKey: key, sampleRate: 100, tags: { 'ai.cloud.role': 'hustlehub-backend' },
    data: { baseType: 'EventData', baseData: { ver: 2, name: 'booking_created', properties: {
      category: 'booking', level: 'info', bookingId: 'b1', requestId: 'r1', amount: '100',
      password: '[REDACTED]', uri: 'mongodb://[REDACTED]@db/app',
    } } } });
  expect(Number.isNaN(Date.parse(event.time))).toBe(false);
});

test('Azure takes precedence over the old HTTP settings and invalid Azure does not fall back', async () => {
  config.logCloudUrl = 'https://old.example.test/';
  config.logCloudToken = 'old-token';
  logEvent('user_login', { userId: 'u1' });
  await cloudLogger.flush();
  expect(global.fetch.mock.calls[0][0]).toContain('applicationinsights.azure.com');
  config.applicationInsightsConnectionString = 'invalid';
  expect(cloudLogger.isEnabled()).toBe(false);
});

test('retries only the rejected items after Azure accepts part of a batch', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch.mockResolvedValueOnce({ ok: true, status: 206, json: async () => ({
    itemsReceived: 2, itemsAccepted: 1, errors: [{ index: 1, statusCode: 429 }],
  }) });
  logEvent('user_login', { userId: 'accepted' });
  logEvent('gig_created', { gigId: 'retry' });
  expect(await cloudLogger.flush()).toBe(false);
  expect(cloudLogger._pending()).toBe(1);
  expect(await cloudLogger.flush()).toBe(true);
  const retried = JSON.parse(global.fetch.mock.calls[1][1].body);
  expect(retried).toHaveLength(1);
  expect(retried[0].data.baseData.name).toBe('gig_created');
});

test('a malformed partial response retains the batch instead of silently losing events', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch.mockResolvedValueOnce({ ok: true, status: 206, json: async () => ({ errors: [] }) });
  logEvent('user_login', { userId: 'u1' });
  expect(await cloudLogger.flush()).toBe(false);
  expect(cloudLogger._pending()).toBe(1);
});

test.each([400, 403, 429, 500])('retains events after HTTP %i and a later successful retry drains them', async (status) => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch.mockResolvedValueOnce({ ok: false, status });
  logEvent('login_failed', { reason: 'bad_password' });
  expect(await cloudLogger.flush()).toBe(false);
  expect(cloudLogger._pending()).toBe(1);
  expect(await cloudLogger.flush()).toBe(true);
  expect(cloudLogger._pending()).toBe(0);
});

test('network errors cannot leak configuration or raw error credentials into console output', async () => {
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch.mockRejectedValueOnce(new Error(`failed ${connectionString} mongodb://root:fixture-secret@db/app`));
  logEvent('user_login', { userId: 'u1' });
  expect(await cloudLogger.flush()).toBe(false);
  const output = JSON.stringify(spy.mock.calls);
  expect(output).not.toContain(key);
  expect(output).not.toContain('fixture-secret');
  expect(output).toContain('will retry');
});

test('shutdown waits for an active send then drains the next batch without spinning', async () => {
  let finish;
  global.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  for (let i = 0; i < 45; i += 1) logEvent('gig_created', { gigId: `g${i}` });
  const draining = cloudLogger.flushAll();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  finish({ ok: true, status: 200 });
  await draining;
  expect(cloudLogger._pending()).toBe(0);
  const sent = global.fetch.mock.calls.flatMap(([, options]) => JSON.parse(options.body));
  expect(sent).toHaveLength(45);
  expect(new Set(sent.map((event) => event.data.baseData.properties.gigId)).size).toBe(45);
});

test('the queue stays bounded during a stalled delivery', async () => {
  let finish;
  global.fetch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  for (let i = 0; i < 1100; i += 1) logEvent('gig_created', { gigId: `g${i}` });
  expect(cloudLogger._pending()).toBe(1000);
  finish({ ok: true, status: 200 });
  await cloudLogger.flush();
});
