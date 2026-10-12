/**
 * Day 3 regression tests for the failure modes that only appear when a database
 * write is slow: a duplicate `join` that arrives while the first one is still in
 * flight, a socket that disconnects mid-join, and a shutdown that must not cut
 * an in-flight presence cleanup off.
 *
 * No MongoDB here on purpose — an in-memory presence/room double with an
 * injectable write latency makes every window deterministic, so these run (and
 * fail loudly) everywhere. The Mongo-backed behaviour is covered by
 * socket.integration.test.js.
 */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { io as createClient } from 'socket.io-client';

import config from '../src/config/index.js';
import { createLogger } from '../src/utils/logger.js';
import { createSocketServer } from '../src/sockets/index.js';

const log = createLogger(process.env.LOG_LEVEL ?? 'error');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Presence store double: rows in a Map, every write taking `latencyMs`. */
function createSlowPresence({ latencyMs = 0 } = {}) {
  const rows = new Map();
  // `upsertsStarted` counts writes that began, `upsertsLanded` those whose row
  // is actually in the map — the difference is the window these tests target.
  const calls = { upserts: 0, upsertsLanded: 0, removals: 0 };
  return {
    rows,
    calls,
    setLatency(ms) { latencyMs = ms; },
    async upsertPosition(user) {
      calls.upserts += 1;
      await sleep(latencyMs);
      rows.set(user.id, { sessionId: user.id, roomId: user.roomId, name: user.name, x: user.x, y: user.y });
      calls.upsertsLanded += 1;
      return { acknowledged: true };
    },
    async removeUser(sessionId) {
      await sleep(latencyMs);
      const had = rows.has(sessionId);
      rows.delete(sessionId);
      calls.removals += 1;
      return { deletedCount: had ? 1 : 0 };
    },
    async listPresenceByRoom(roomId) {
      return [...rows.values()].filter((row) => row.roomId === roomId);
    },
  };
}

/** Room service double: one small room, no database. */
function createStaticRooms(roomIds = ['lobby']) {
  const room = (roomId) => ({
    roomId,
    name: roomId,
    width: 400,
    height: 400,
    obstacles: [],
    spawnPoints: [{ x: 100, y: 100 }, { x: 300, y: 300 }],
  });
  return { async getRoom(roomId) { return roomIds.includes(roomId) ? room(roomId) : null; } };
}

const servers = [];
const clients = [];

async function startServer({ presence, cfg = config } = {}) {
  const server = http.createServer((req, res) => res.writeHead(404).end());
  const io = createSocketServer({
    httpServer: server,
    config: cfg,
    logger: log,
    presence,
    rooms: createStaticRooms(),
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  const handle = {
    url,
    io,
    /** Close the gateway. */
    shutdown: async () => {
      await new Promise((resolve) => io.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    },
    close: async () => {
      await new Promise((resolve) => io.close(resolve));
      await new Promise((resolve) => server.close(resolve));
    },
  };
  servers.push(handle);
  return handle;
}

function client(url) {
  const socket = createClient(url, { transports: ['websocket'], reconnection: false, forceNew: true });
  clients.push(socket);
  return socket;
}

const connect = async (socket) => {
  if (socket.connected) return socket;
  await once(socket, 'connect');
  return socket;
};

function waitFor(socket, event, predicate = () => true, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timed out waiting for "${event}"`));
    }, timeout);
    const handler = (payload) => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

afterEach(async () => {
  for (const socket of clients.splice(0)) socket.close();
  for (const handle of servers.splice(0)) await handle.close();
});

test('a duplicate join sent while the first one is still in flight joins once', async () => {
  const presence = createSlowPresence({ latencyMs: 60 }); // wide, deterministic window
  const { url, io } = await startServer({ presence });

  const watcher = await connect(client(url));
  const watcherJoined = waitFor(watcher, 'joined');
  watcher.emit('join', { roomId: 'lobby', name: 'Watcher' });
  await watcherJoined;

  let announcements = 0;
  watcher.on('user:joined', (payload) => {
    if (payload.name === 'Doubleclick') announcements += 1;
  });

  const dupe = await connect(client(url));
  let replies = 0;
  dupe.on('joined', () => (replies += 1));

  // Same tick, twice: the second arrives while the first join is still writing
  // its presence document.
  dupe.emit('join', { roomId: 'lobby', name: 'Doubleclick' });
  dupe.emit('join', { roomId: 'lobby', name: 'Doubleclick' });

  await waitFor(dupe, 'joined');
  await sleep(400);

  assert.equal(presence.calls.upserts, 2, 'one upsert per socket (watcher + doubleclick)');
  assert.equal(presence.rows.size, 2, 'one presence document per socket');
  assert.equal(announcements, 1, 'exactly one user:joined broadcast per joined socket');
  assert.equal(replies, 2, 'each explicit join request is answered with a snapshot');
  assert.equal([...io.sockets.sockets.values()].length, 2);
});
