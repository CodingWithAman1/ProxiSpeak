/**
 * ProxiSpeak Express Application Setup
 * Configures middleware, API routes, static client hosting, and global error handling.
 */
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import config, { SERVER_ROOT } from './config/index.js';
import logger from './utils/logger.js';
import apiRouter from './routes/api.js';

export function createApp({ config: cfg = config, logger: log = logger } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // CORS configuration
  app.use(
    cors({
      origin: cfg.server.clientOrigins.length ? cfg.server.clientOrigins : true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: '128kb' }));

  // REST API routes & Health checks
  app.use('/', apiRouter);

  // Serve static client bundle if built
  const clientDist = path.resolve(SERVER_ROOT, '..', 'client', 'dist');
  const serverPublic = path.resolve(SERVER_ROOT, 'public');

  const staticDir = fs.existsSync(clientDist) ? clientDist : fs.existsSync(serverPublic) ? serverPublic : null;

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next();
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  // 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.path}` });
  });

  // Global Error Handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status ?? 500;
    if (status >= 500) log.error(`${req.method} ${req.originalUrl} ->`, err.message);
    res.status(status).json({ ok: false, error: err.message });
  });

  return app;
}

export default createApp;
