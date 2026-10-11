/**
 * Boot sequence (Day 2): config -> MongoDB -> HTTP server. Redis, services and
 * the Socket.io gateway are wired into this boot on their own days.
 */
import http from 'node:http';
import process from 'node:process';
import config from './config/index.js';
import logger from './utils/logger.js';
import { connectMongo, disconnectMongo, ensureIndexes } from './db/mongo.js';
import { createApp } from './app.js';

const log = logger;

async function main() {
  // Connect before listening: a server without its database must never
  // accept traffic.
  await connectMongo();

  // The geospatial engine is useless without its indexes, so create them on
  // every boot (idempotent) rather than relying on a manual migration.
  await ensureIndexes();
  log.info('MongoDB connected, indexes ensured');

  const httpServer = http.createServer();
  const app = createApp({ config, logger: log });
  httpServer.on('request', app);

  await new Promise((resolve) => httpServer.listen(config.server.port, config.server.host, resolve));
  log.info(`ProxiSpeak server listening on ${config.server.host}:${config.server.port} (${config.nodeEnv})`);
  log.info('Health:  GET /health');

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`${signal} received, shutting down...`);
    // Force-exit if keep-alive connections do not drain in time.
    setTimeout(() => process.exit(1), 10000).unref();
    await new Promise((resolve) => httpServer.close(resolve));
    await disconnectMongo().catch(() => {});
    log.info('bye');
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => log.error('unhandled rejection:', reason));
}

main().catch((err) => {
  log.error('fatal startup error:', err);
  process.exit(1);
});
