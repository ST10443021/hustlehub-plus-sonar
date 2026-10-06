const mongoose = require('mongoose');
const config = require('./env');

async function connectDB() {
  if (config.nodeEnv === 'test') return false;
  if (!config.mongoUri) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  console.log('Connected to MongoDB.');
  return true;
}

function isDbConnected() {
  if (config.nodeEnv === 'test') return false;
  if (mongoose.connection.readyState === 1) return true;
  const err = new Error('The database is unavailable. Please try again later.');
  err.statusCode = 503;
  err.expose = true;
  throw err;
}

module.exports = { connectDB, isDbConnected };
