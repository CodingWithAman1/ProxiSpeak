/**
 * Database connection layer with automatic reconnection and fallback handling.
 */
import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let isConnected = false;
let isMemoryFallback = false;

export async function connectDatabase() {
  if (isConnected) return mongoose.connection;

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 5000,
    });
    isConnected = true;
    isMemoryFallback = false;
    logger.info(`MongoDB connected successfully at ${config.mongo.uri}`);
    return mongoose.connection;
  } catch (err) {
    isConnected = false;
    isMemoryFallback = true;
    logger.warn(`MongoDB unavailable (${err.message}). Activating in-memory spatial storage fallback.`);
    return null;
  }
}

export function getDatabaseStatus() {
  return {
    connected: isConnected,
    isMemoryFallback,
    uri: config.mongo.uri,
    readyState: mongoose.connection.readyState,
  };
}

export async function disconnectDatabase() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected.');
  }
}

export default {
  connectDatabase,
  getDatabaseStatus,
  disconnectDatabase,
};
