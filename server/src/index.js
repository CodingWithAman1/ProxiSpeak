/**
 * Boot sequence (Day 1): config -> HTTP server. MongoDB, Redis, services and
 * the Socket.io gateway are wired into this boot on their own days.
 */
import http from 'node:http';
import process from 'node:process';
import config from './config/index.js';
import logger from './utils/logger.js';
import { createApp } from './app.js';

const log = logger;

const httpServer = http.createServer();
const app = createApp({ config, logger: log });
httpServer.on('request', app);

httpServer.listen(config.server.port, config.server.host, () => {
  log.info(`ProxiSpeak server listening on ${config.server.host}:${config.server.port} (${config.nodeEnv})`);
  log.info('Health:  GET /health');
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`${signal} received, shutting down...`);
  httpServer.close(() => {
    log.info('bye');
    process.exit(0);
  });
  // Force-exit if keep-alive connections do not drain in time.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => log.error('unhandled rejection:', reason));
