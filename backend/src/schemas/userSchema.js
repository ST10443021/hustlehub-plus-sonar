const mongoose = require('mongoose');

// Mirrors the in-memory user shape from Part 1 exactly, so the repository
// layer can present an identical public-user object regardless of which
// backing store is active (MongoDB, Inc., n.d.a).
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], default: 'client' },
    // Part 3 security fields. They are never returned by toPublicUser() in userRepository.js.
    // failedLoginAttempts/lockUntil drive account lockout; tokenVersion lets a logout (or an
    // administrator) invalidate every JWT previously issued to this user (OWASP, 2024c; OWASP, 2024e).
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
