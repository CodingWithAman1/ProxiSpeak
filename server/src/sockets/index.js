/**
 * Socket.io gateway (Day 3).
 *
 * The realtime channel is attached to the *existing* HTTP server, so it shares
 * the Express port and the `/health` endpoint keeps working untouched.
 *
 * Event contract (every inbound payload is validated server-side):
 *   C -> S  join     { roomId, name }   S -> C  joined     { selfId, room, users }
 *   C -> S  move     { x, y }           S -> C  user:moved { id, x, y }
 *   (socket disconnects)                S -> C  user:left  { id }
 *   other clients in the room           S -> C  user:joined { id, name, x, y }
 *   any rejection                       S -> C  error       { code, message, field? }
 *
 * Payloads carry ids, names and pixels only — never a connection string, a
 * document `_id` or any other database detail.
 */
import { Server } from 'socket.io';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import { describeCorsOrigin, socketCorsOrigin } from '../utils/origin.js';
import { createGeoTransform } from '../utils/geo.js';
import { validateJoinPayload } from './validation.js';
import * as presenceStore from '../services/presenceStore.js';
import * as roomService from '../services/roomService.js';

/** Deterministic colour for avatars: the Day 3 `join` payload carries a name only. */
const DEFAULT_AVATAR_COLOR = '#4f8cff';

/**
 * @param {object} options
 * @param {import('node:http').Server} options.httpServer the server Express already uses
 * @param {object} [options.config] config override
 * @param {object} [options.logger] logger override
 * @param {object} [options.presence] presence store override (defaults to the Day 2 store)
 * @param {object} [options.rooms] room service override (defaults to the Day 2 service)
 * @returns {import('socket.io').Server}
 */
export function createSocketServer({
  httpServer,
  config: cfg = config,
  logger: log = logger,
  presence = presenceStore,
  rooms = roomService,
} = {}) {
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

  // One transform per process: the room is a flat pixel plane, MongoDB wants
  // GeoJSON, and both must always agree.
  const geo = createGeoTransform(cfg.world);

  io.on('connection', (socket) => registerHandlers(socket, { io, cfg, log, presence, rooms, geo }));

  log.info(`Socket.io attached to the HTTP server (CORS: ${describeCorsOrigin(cfg)})`);
  return io;
}

function registerHandlers(socket, ctx) {
  const { cfg, log, presence, rooms, geo } = ctx;
  const socketLog = log.child(socket.id.slice(0, 6));

  /** This socket's presence: null until it has joined a room successfully. */
  let session = null;

  const fail = (code, message, field) =>
    socket.emit('error', field ? { code, message, field } : { code, message });

  /**
   * Every handler runs through here, so one malformed payload can never take
   * the process down: validation errors become a documented `error` event and
   * unexpected failures are logged (message only, never the payload) and
   * answered with a generic code.
   */
  const guard = (event, handler) => async (payload) => {
    try {
      await handler(payload);
    } catch (err) {
      if (err instanceof AppError && err.status < 500) {
        socketLog.debug(`${event} rejected: ${err.message}`);
        fail(err.code, err.message, err.details?.field);
        return;
      }
      socketLog.error(`${event} failed:`, err?.message ?? err);
      fail('server_error', 'the server could not process that request');
    }
  };

  socketLog.debug('socket connected');

  // ------------------------------------------------------------------ join ---
  socket.on(
    'join',
    guard('join', async (payload) => {
      const { roomId, name } = validateJoinPayload(payload);

      // A repeated join for the room this socket is already in is a no-op apart
      // from a fresh snapshot: no second presence document, no second
      // `user:joined` for the people already inside.
      if (session && session.roomId === roomId) {
        const users = await snapshotUsers(presence, roomId);
        socket.emit('joined', buildJoined(socket.id, session.room, users));
        socketLog.debug(`duplicate join ignored (already in "${roomId}")`);
        return;
      }

      // One socket owns one room. Switching rooms means reconnecting, so a
      // stray join can never leave a presence document behind in a room the
      // socket no longer belongs to.
      if (session) {
        throw new AppError(`this socket already joined "${session.roomId}" — reconnect to join another room`, {
          code: 'already_joined',
          status: 409,
        });
      }

      const room = await rooms.getRoom(roomId);
      if (!room) {
        throw new AppError(
          `room "${roomId}" does not exist — run \`npm run seed\` to create the default rooms`,
          { code: 'room_not_found', status: 404 },
        );
      }

      const occupants = await snapshotUsers(presence, roomId);
      const spawn = chooseSpawn(room, occupants, cfg.world);

      const user = {
        id: socket.id,
        roomId,
        name,
        color: DEFAULT_AVATAR_COLOR,
        avatar: 'circle',
        x: spawn.x,
        y: spawn.y,
        angle: 0,
        instanceId: cfg.server.instanceId,
        lastSeen: Date.now(),
      };

      // Presence first: a user that is broadcast to the room but missing from
      // the database would be an invisible ghost on the next join.
      await presence.upsertPosition(user, geo);

      session = { roomId, room, user };
      socket.data.roomId = roomId;
      await socket.join(roomId);

      socket.to(roomId).emit('user:joined', { id: user.id, name: user.name, x: user.x, y: user.y });

      const users = await snapshotUsers(presence, roomId);
      socket.emit('joined', buildJoined(socket.id, room, users));
      socketLog.info(`joined "${roomId}" as "${name}" (${users.length} in room)`);
    }),
  );

  socket.on('disconnect', (reason) => socketLog.debug(`socket disconnected (${reason})`));
  socket.on('error', (err) => socketLog.error('socket error:', err?.message ?? err));
}

// ------------------------------------------------------------- wire format ---

/** The `joined` reply: who you are, the room blueprint and everybody inside. */
const buildJoined = (selfId, room, users) => ({ selfId, room: toRoomPayload(room), users });

/**
 * Room dimensions + obstacles, whitelisted field by field. Spawn points and
 * document internals stay on the server; collision/occlusion logic does not
 * exist yet, so obstacles are shipped as data only.
 */
function toRoomPayload(room) {
  return {
    roomId: room.roomId,
    name: room.name,
    width: room.width,
    height: room.height,
    obstacles: (room.obstacles ?? []).map((o) => ({
      id: o.id,
      type: o.type,
      x: o.x,
      y: o.y,
      w: o.w,
      h: o.h,
      blocksAudio: o.blocksAudio !== false,
      attenuation: o.attenuation ?? 0.2,
    })),
  };
}

/** Presence rows -> the minimal `{ id, x, y }` list the client needs. */
async function snapshotUsers(presence, roomId) {
  const rows = await presence.listPresenceByRoom(roomId);
  return rows.map((row) => ({ id: row.sessionId, x: row.x, y: row.y }));
}

/**
 * Spawn on the point furthest away from the users already inside, so two
 * clients never stack on the same pixel. Deterministic: ties keep the first
 * point, and a room without spawn points falls back to its centre.
 */
function chooseSpawn(room, occupants, world) {
  const points = room.spawnPoints?.length ? room.spawnPoints : [{ x: world.width / 2, y: world.height / 2 }];
  let best = points[0];
  if (occupants.length) {
    let bestDistance = -1;
    for (const point of points) {
      const nearest = Math.min(...occupants.map((u) => Math.hypot(u.x - point.x, u.y - point.y)));
      if (nearest > bestDistance) {
        bestDistance = nearest;
        best = point;
      }
    }
  }
  return { x: Math.round(best.x), y: Math.round(best.y) };
}

export default createSocketServer;
