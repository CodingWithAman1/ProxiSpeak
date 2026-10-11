/** MongoDB connection lifecycle. A database is mandatory for this project. */
import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

mongoose.set('strictQuery', true);

const log = logger.child('mongo');

/** Strip credentials from a connection string before it reaches any log. */
const redact = (uri) => uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');

export async function connectMongo({ uri = config.mongo.uri } = {}) {
  mongoose.connection.on('connected', () => log.info('connected'));
  mongoose.connection.on('error', (err) => log.error('connection error:', err.message));
  mongoose.connection.on('disconnected', () => log.warn('disconnected'));

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMS,
      maxPoolSize: 50,
      minPoolSize: 5,
      retryWrites: true,
    });
  } catch (err) {
    log.error(
      `Cannot reach MongoDB at "${redact(uri)}".\n` +
        '  Start a local server (mongod --dbpath ./data) or point MONGO_URI at your\n' +
        '  Atlas cluster. The geospatial engine stores every avatar as a 2dsphere\n' +
        '  GeoJSON point, so MongoDB is required.',
    );
    throw err;
  }

  return mongoose.connection;
}

/** Graceful disconnect — closes the pool so the process can exit cleanly. */
export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

/**
 * Create every index the app depends on — most importantly the 2dsphere index
 * on UserPresence.location that backs $near / $geoWithin. Idempotent, and run
 * on every boot so a fresh (remote) database is usable immediately without a
 * manual migration step.
 *
 * Each model is wired in by the commit that adds it (UserPresence, Room).
 */
export async function ensureIndexes() {
  return {};
}

export { mongoose, redact as redactUri };
