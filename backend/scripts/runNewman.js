// Runs the Postman collection with Newman (Postman, n.d.) against a running API, such as the Docker
// Compose stack in the CI pipeline. Use a separate test database. Save counts and failures without JWTs.
require('dotenv').config();
const newman = require('newman');
const fs = require('fs');
const path = require('path');
const collection = JSON.parse(fs.readFileSync(path.join(__dirname, '../postman/HustleHub_Part3.postman_collection.json'), 'utf8'));
const baseUrl = process.env.NEWMAN_BASE_URL || 'https://localhost:5443';
collection.variable.find((v) => v.key === 'baseUrl').value = baseUrl;
// Optional admin credentials (an account created with scripts/seedAdmin.js) switch on the admin checks.
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  collection.variable.find((v) => v.key === 'adminEmail').value = process.env.ADMIN_EMAIL;
  collection.variable.find((v) => v.key === 'adminPassword').value = process.env.ADMIN_PASSWORD;
}
// The JUnit report lists test names and outcomes only (no tokens or response bodies), so it is safe to keep as CI evidence.
fs.mkdirSync(path.join(__dirname, '../test-results'), { recursive: true });
newman.run({ collection, insecure: true, reporters: ['cli', 'junit'], reporter: { junit: { export: path.join(__dirname, '../test-results/newman-junit.xml') } } }, (err, summary) => {
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
