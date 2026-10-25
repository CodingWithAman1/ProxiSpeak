/**
 * Express surface: middleware, CORS, security headers, and health monitoring.
 * Integrates room catalogue, live presence tracking, and spatial audio gateway.
 */
import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import logger from './utils/logger.js';

export function createApp({ config: cfg = config, logger: log = logger } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Reverse proxies (Nginx, PaaS routers) terminate TLS and forward
  // X-Forwarded-*; trusting one hop keeps req.ip / protocol truthful.
  app.set('trust proxy', 1);
  // Configure CORS origin handling based on CLIENT_URL config.
  app.use(cors({ origin: cfg.server.clientOrigins.length ? cfg.server.clientOrigins : true }));
  app.use(express.json({ limit: '64kb' }));

  const startedAt = Date.now();

  /**
   * Liveness endpoint. Deliberately dependency-free — it never touches a
   * database or cache, so a blip in a backing service can never mark a
   * healthy process as dead.
   */
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'proxispeak',
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      time: new Date().toISOString(),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ ok: false, error: `No route for ${req.method} ${req.path}` });
  });

  // eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
  app.use((err, req, res, next) => {
    const status = err.status ?? 500;
    if (status >= 500) log.error(`${req.method} ${req.originalUrl} ->`, err.message);
    res.status(status).json({ ok: false, error: err.message });
  });

  return app;
}

export default createApp;
