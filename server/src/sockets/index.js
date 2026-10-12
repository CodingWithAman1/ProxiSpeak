/**
 * Socket.io gateway (Day 3).
 *
 * The realtime channel is attached to the *existing* HTTP server, so it shares
 * the Express port and the `/health` endpoint keeps working untouched.
 *
 * Event contract (all payloads validated server-side):
 *   C -> S  join    { roomId, name }        S -> C  joined { selfId, room, users }
 *   C -> S  move    { x, y }                S -> C  user:moved { id, x, y }
 *   (disconnect)                            S -> C  user:joined / user:left
 *   S -> C  error   { code, message, field? }
 *
 * The room lifecycle, movement and cleanup handlers are layered on top of this
 * transport in the following commits; this file owns the connection lifecycle,
 * the origin policy and the per-socket state.
 */
import { Server } from 'socket.io';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { describeCorsOrigin, socketCorsOrigin } from '../utils/origin.js';

/**
 * @param {object} options
 * @param {import('node:http').Server} options.httpServer server Express already uses
 * @param {object} [options.config] config override (tests)
 * @param {object} [options.logger] logger override (tests)
 */
export function createSocketServer({ httpServer, config: cfg = config, logger: log = logger } = {}) {
  if (!httpServer) throw new Error('createSocketServer requires the HTTP server to attach to');

  const io = new Server(httpServer, {
    cors: {
      origin: socketCorsOrigin(cfg),
      methods: ['GET', 'POST'],
    },
    // Every client payload in this protocol is a handful of numbers, so a small
    // cap is plenty and keeps a hostile client from buffering megabytes.
    maxHttpBufferSize: 100_000,
  });

  io.on('connection', (socket) => {
    const socketLog = log.child(socket.id.slice(0, 6));
    socketLog.debug('socket connected');

    socket.on('disconnect', (reason) => socketLog.debug(`socket disconnected (${reason})`));
    socket.on('error', (err) => socketLog.error('socket error:', err?.message ?? err));
  });

  log.info(`Socket.io attached to the HTTP server (CORS: ${describeCorsOrigin(cfg)})`);
  return io;
}

export default createSocketServer;
