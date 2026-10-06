// Run against a separate test database. Save counts and failures without JWTs.
require('dotenv').config();
const newman = require('newman');
const fs = require('fs');
const path = require('path');
const collection = JSON.parse(fs.readFileSync(path.join(__dirname, '../postman/HustleHub_Part2.postman_collection.json'), 'utf8'));
const baseUrl = process.env.NEWMAN_BASE_URL || 'https://localhost:5443';
collection.variable.find((v) => v.key === 'baseUrl').value = baseUrl;
newman.run({ collection, insecure: true, reporters: ['cli'] }, (err, summary) => {
  if (err) { console.error('Newman could not run:', err.message); process.exitCode = 1; return; }
  const result = {
    checkedAt: new Date().toISOString(), baseUrl,
    note: 'Self-signed local certificate accepted for this check. No request tokens or response bodies are saved.',
    requests: summary.run.stats.requests, assertions: summary.run.stats.assertions,
    failures: summary.run.failures.map((f) => ({ request: f.source?.name, test: f.error?.test, message: f.error?.message })),
  };
  const out = path.join(__dirname, '../test-results'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'newman-summary.json'), JSON.stringify(result, null, 2));
  console.log('Safe summary saved to test-results/newman-summary.json');
  if (result.failures.length) process.exitCode = 1;
});
