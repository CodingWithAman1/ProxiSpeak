/**
 * The one place the client learns where the server lives.
 * No other module may hardcode a server URL.
 *
 * Resolution order:
 *   1. VITE_SERVER_URL (client/.env) — explicit override, wins always.
 *   2. Dev (vite dev)                — http://localhost:4000, the server's port.
 *   3. Production build              — '' (same origin: whoever served the
 *      build is expected to serve / proxy the socket too).
 */

const env = import.meta.env ?? {};

const override = typeof env.VITE_SERVER_URL === 'string' ? env.VITE_SERVER_URL.trim() : '';

export const SERVER_URL = override
  ? override.replace(/\/+$/, '')
  : env.DEV
    ? 'http://localhost:4000'
    : '';

export default SERVER_URL;
