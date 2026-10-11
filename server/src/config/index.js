/**
 * Central configuration. Every tunable lives here and is sourced from .env
 * (server/.env wins over the repo-root .env). Nothing else in the codebase
 * reads process.env directly.
 *
 * Day 2 adds the mongo block (connection lifecycle). The world-projection and
 * Redis/socket config blocks are added on the days that actually introduce
 * those dependencies.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');
export const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

// dotenv never overrides an already-set key, so the more specific file is
// loaded first and therefore has the higher effective priority.
for (const candidate of [path.join(SERVER_ROOT, '.env'), path.join(REPO_ROOT, '.env')]) {
  if (fs.existsSync(candidate)) dotenv.config({ path: candidate });
}

const str = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const num = (key, fallback, { min = -Infinity, max = Infinity } = {}) => {
  const raw = process.env[key];
  const value = raw === undefined || raw === '' ? fallback : Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Env ${key} must be a number, got "${raw}"`);
  if (value < min || value > max) throw new Error(`Env ${key} must be within [${min}, ${max}], got ${value}`);
  return value;
};

const list = (key, fallback) => {
  const raw = str(key, fallback);
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const nodeEnv = str('NODE_ENV', 'development');

export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  logLevel: str('LOG_LEVEL', 'info'),

  server: Object.freeze({
    // Most PaaS hosts inject PORT; 4000 stays the local default.
    port: num('PORT', 4000, { min: 1, max: 65535 }),
    host: str('HOST', '0.0.0.0'),
    /**
     * Allowed browser origins (CLIENT_URL, comma separated). Empty on Day 1 =
     * any origin may call the API; once the React client exists this locks
     * down to the listed origins.
     */
    clientOrigins: list('CLIENT_URL', ''),
  }),

  mongo: Object.freeze({
    // Remote-capable connection string (local mongod or Atlas). Never logged
    // verbatim — db/mongo.js redacts credentials before any output.
    uri: str('MONGO_URI', 'mongodb://127.0.0.1:27017/proxispeak'),
    serverSelectionTimeoutMS: num('MONGO_TIMEOUT_MS', 8000, { min: 500 }),
  }),
});

export default config;
