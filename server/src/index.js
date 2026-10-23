/**
 * ProxiSpeak Server Entrypoint
 * Bootstraps HTTP server, MongoDB connection, default spatial environments, and Socket.io gateway.
 */
import http from 'node:http';
import process from 'node:process';
import config from './config/index.js';
import logger from './utils/logger.js';
import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './database/mongo.js';
import { seedRooms } from './seed/seedData.js';
import { setupSocketGateway } from './socket/index.js';

const log = logger;

async function bootstrap() {
  try {
    // 1. Connect to Database (with graceful memory fallback)
    await connectDatabase();

    // 2. Initialize default spatial environments & acoustic zones
    await seedRooms();

    // 3. Create HTTP & Express server
    const httpServer = http.createServer();
    const app = createApp({ config, logger: log });
    httpServer.on('request', app);

    // 4. Initialize real-time Socket.io gateway
    setupSocketGateway(httpServer);

    // 5. Start listening
    httpServer.listen(config.server.port, config.server.host, () => {
      log.info(`=======================================================`);
      log.info(` ProxiSpeak Engine running on http://${config.server.host}:${config.server.port}`);
      log.info(` Environment: ${config.nodeEnv}`);
      log.info(` Health check: http://${config.server.host}:${config.server.port}/health`);
      log.info(` Room API:     http://${config.server.host}:${config.server.port}/api/rooms`);
      log.info(`=======================================================`);
    });

    // 6. Graceful shutdown listeners
    let shuttingDown = false;
    const shutdown = async (signal) => {
      if (shuttingDown) return;
      shuttingDown = true;
      log.info(`${signal} received. Closing servers gracefully...`);

      httpServer.close(async () => {
        await disconnectDatabase();
        log.info('ProxiSpeak services shut down cleanly.');
        process.exit(0);
      });

      setTimeout(() => {
        log.warn('Forced exit timeout triggered.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('unhandledRejection', (reason) => log.error('Unhandled rejection:', reason));
  } catch (err) {
    log.error('Fatal bootstrap failure:', err);
    process.exit(1);
  }
}

bootstrap();
