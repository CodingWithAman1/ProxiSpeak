/**
 * ProxiSpeak — Central Application Configuration
 * Loads environment variables with strong type validation and defaults.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(__dirname, '..', '..');
export const REPO_ROOT = path.resolve(SERVER_ROOT, '..');

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
    port: num('PORT', 4000, { min: 1, max: 65535 }),
    host: str('HOST', '0.0.0.0'),
    clientOrigins: list('CLIENT_URL', 'http://localhost:5173,http://localhost:4000,http://127.0.0.1:5173,http://127.0.0.1:4000'),
  }),

  mongo: Object.freeze({
    uri: str('MONGO_URI', 'mongodb://127.0.0.1:27017/proxispeak'),
  }),

  redis: Object.freeze({
    url: str('REDIS_URL', 'redis://127.0.0.1:6379'),
    enabled: str('REDIS_ENABLED', 'false') === 'true',
  }),

  spatial: Object.freeze({
    defaultEarshotRadius: num('DEFAULT_EARSHOT_RADIUS', 20, { min: 5, max: 100 }),
    minHearingDistance: num('MIN_HEARING_DISTANCE', 2, { min: 0.5, max: 20 }),
    wallAttenuationDb: num('WALL_ATTENUATION_DB', 18, { min: 0, max: 60 }),
    wallCutoffFreq: num('WALL_CUTOFF_FREQ', 480, { min: 100, max: 4000 }),
    tickRateMs: num('TICK_RATE_MS', 50, { min: 16, max: 200 }),
  }),
});

export default config;
