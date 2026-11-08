// Lists every file the README and the evidence pages link to that does not exist yet.
// Run from the repository root before submitting:  node docs/part3/check-evidence.mjs
import fs from 'node:fs';
import path from 'node:path';

const pages = ['README.md', 'docs/part3/EVIDENCE.md', 'docs/part3/LOGGING.md', 'docs/part3/STATIC_ANALYSIS.md'];
const missing = new Set();
for (const page of pages) {
  const text = fs.readFileSync(page, 'utf8');
  for (const match of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) {
    const target = decodeURIComponent(match[1].split('#')[0]);
    if (target && !fs.existsSync(path.join(path.dirname(page), target)) && !fs.existsSync(target)) missing.add(`${target}   (linked from ${page})`);
  }
}
if (missing.size === 0) {
  console.log('Every linked file exists.');
} else {
  console.log(`${missing.size} linked file(s) still missing:`);
  [...missing].sort().forEach((item) => console.log(`  - ${item}`));
  process.exitCode = 1;
}
