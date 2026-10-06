const mongoose = require('mongoose');

// Mirrors the in-memory user shape from Part 1 exactly, so the repository
// layer can present an identical public-user object regardless of which
// backing store is active (MongoDB, Inc., n.d.).
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'freelancer', 'admin'], default: 'client' },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
