// Creates (or reports) the single administrator account.
//
// Public registration cannot create admins on purpose (OWASP, 2021 - Broken Access Control), so
// the first admin is created from the command line by someone with access to the server:
//
//   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='A-long-Passw0rd' node scripts/seedAdmin.js
//   docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... backend node scripts/seedAdmin.js
//
// The password must satisfy the same policy as registration and is hashed with bcrypt before it is
// stored (OWASP, 2024a). It is read from the environment, never from a file in the repository.
const { connectDB } = require('../src/config/db');
const userRepository = require('../src/repositories/userRepository');
const authService = require('../src/services/authService');
const { logEvent } = require('../src/utils/eventLogger');

const POLICY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

async function main() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Set ADMIN_EMAIL to a valid email address.');
  if (!POLICY.test(password) || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be 8-72 characters with a lowercase letter, an uppercase letter and a number.');
  }

  await connectDB();
  const existing = await userRepository.findByEmail(email);
  if (existing) {
    console.log(`An account for ${email} already exists (role: ${existing.role}). Nothing was changed.`);
    return;
  }
  const passwordHash = await authService.hashPassword(password);
  const admin = await userRepository.create({ email, passwordHash, role: 'admin' });
  logEvent('user_registered', { userId: admin.id, role: 'admin', via: 'seedAdmin' });
  console.log(`Admin account created for ${email}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
