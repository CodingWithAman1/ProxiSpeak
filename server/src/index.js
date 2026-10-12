/**
 * Boot sequence (Day 3): config -> MongoDB -> HTTP server -> Socket.io on the
 * same server (and therefore the same port). Redis and the client bundle are
 * wired into this boot on their own days.
 */
import http from 'node:http';
import process from 'node:process';
import config from './config/index.js';
import logger from './utils/logger.js';
import { connectMongo, disconnectMongo, ensureIndexes } from './db/mongo.js';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/index.js';

const log = logger;

async function main() {
  // Connect before listening: a server without its database must never
  // accept traffic.
  await connectMongo();

  // The geospatial engine is useless without its indexes, so create them on
  // every boot (idempotent) rather than relying on a manual migration.
  await ensureIndexes();
  log.info('MongoDB indexes ready (UserPresence.location: 2dsphere)');

  const httpServer = http.createServer();
  const app = createApp({ config, logger: log });
  httpServer.on('request', app);

  // The websocket shares the HTTP server, so there is exactly one port to open,
  // proxy and firewall.
  const io = createSocketServer({ httpServer, config, logger: log });

  await new Promise((resolve) => httpServer.listen(config.server.port, config.server.host, resolve));
  log.info(`ProxiSpeak server listening on ${config.server.host}:${config.server.port} (${config.nodeEnv})`);
  log.info('Health:  GET /health');
  log.info('Socket:  io() on the same origin');

  // One shutdown routine for every signal: the guard makes a second SIGINT
  // during a slow drain a no-op instead of a second teardown.
  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`${signal} received, shutting down...`);
    // Force-exit if keep-alive connections do not drain in time.
    setTimeout(() => process.exit(1), 10000).unref();
    // Close the realtime channel first so clients get a clean disconnect
    // instead of a dropped TCP connection.
    await new Promise((resolve) => io.close(resolve));
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
