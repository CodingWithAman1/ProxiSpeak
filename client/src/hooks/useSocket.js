import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { SERVER_URL } from '../config.js';

/**
 * Socket.io connection + world state (Day 4).
 *
 * The world (room blueprint + every avatar's position) lives in a ref,
 * NOT in React state: `user:moved` can arrive many times a second and
 * none of those updates should re-render React. The canvas reads the
 * ref directly on every animation frame. React state is reserved for
 * low-frequency facts only — connection status, the latest server
 * error, and a one-per-join summary — so joining, erroring and
 * disconnecting re-render, but avatar movement never does.
 *
 * Events (Day 3 contract):
 *   emit  join        { roomId, name }
 *   on    joined      { selfId, room, users: [{ id, x, y }] }
 *   on    user:joined { id, name, x, y }
 *   on    user:moved  { id, x, y }
 *   on    user:left   { id }
 *   on    error       { code, message, field? }
 */

export function createWorldState() {
  return {
    /** { roomId, name, width, height, obstacles: [] } from `joined`, else null. */
    room: null,
    /** Map<socketId, { id, name, x, y }> — every avatar in the room, self included. */
    users: new Map(),
    /** This client's socket id, from `joined.selfId`. */
    selfId: null,
  };
}

const toError = (err) => {
  if (err && typeof err === 'object' && typeof err.code === 'string') {
    return { code: err.code, message: err.message ?? err.code, field: err.field };
  }
  return { code: 'connection_failed', message: err?.message ?? 'could not reach the server' };
};

export function useSocket() {
  const worldRef = useRef(null);
  if (worldRef.current === null) worldRef.current = createWorldState();

  const socketRef = useRef(null);
  const pendingJoinRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | connecting | joined | disconnected | error
  const [error, setError] = useState(null);
  // Set once per successful `joined` (never per move): { roomId, roomName, selfId, name }.
  const [joinedInfo, setJoinedInfo] = useState(null);

  const teardownSocket = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    pendingJoinRef.current = null;
    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
    }
  }, []);

  const join = useCallback(
    ({ roomId, name }) => {
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      const normalizedRoom = typeof roomId === 'string' ? roomId.trim().toLowerCase() : '';

      // Start from a clean slate: a (re)join never inherits stale avatars.
      teardownSocket();
      const world = worldRef.current;
      world.room = null;
      world.users.clear();
      world.selfId = null;
      setJoinedInfo(null);
      setError(null);
      setStatus('connecting');

      pendingJoinRef.current = { roomId: normalizedRoom, name: trimmedName };

      // '' means same origin (production); socket.io-client defaults to
      // the page origin when no URL is passed.
      const socket = io(SERVER_URL || undefined, {
        autoConnect: true,
        reconnectionAttempts: 5,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        const pending = pendingJoinRef.current;
        if (pending) socket.emit('join', pending);
      });

      socket.on('joined', (payload) => {
        if (!payload || typeof payload !== 'object') return;
        const world = worldRef.current;
        world.room = payload.room ?? null;
        world.selfId = payload.selfId ?? socket.id ?? null;
        // Snapshot known names BEFORE clearing: `joined.users` carries
        // { id, x, y } only, so clearing first would discard every name
        // a `user:joined` already taught us (reading `existing` after
        // clear() was always undefined).
        const previousById = new Map(world.users);
        world.users.clear();
        for (const user of payload.users ?? []) {
          if (!user || typeof user.id !== 'string') continue;
          const existing = previousById.get(user.id);
          world.users.set(user.id, {
            id: user.id,
            // `joined.users` carries { id, x, y } only (Day 3); keep any
            // name a later `user:joined` already taught us, and label
            // ourselves with the name we just joined under.
            name:
              user.id === world.selfId
                ? (pendingJoinRef.current?.name ?? user.name ?? null)
                : (user.name ?? existing?.name ?? null),
            x: user.x,
            y: user.y,
          });
        }
        setError(null);
        setStatus('joined');
        setJoinedInfo({
          roomId: payload.room?.roomId ?? pendingJoinRef.current?.roomId ?? normalizedRoom,
          roomName: payload.room?.name ?? pendingJoinRef.current?.roomId ?? normalizedRoom,
          selfId: world.selfId,
          name: pendingJoinRef.current?.name ?? trimmedName,
        });
      });

      socket.on('user:joined', (user) => {
        if (!user || typeof user.id !== 'string') return;
        worldRef.current.users.set(user.id, {
          id: user.id,
          name: user.name ?? null,
          x: user.x,
          y: user.y,
        });
      });

      socket.on('user:moved', (user) => {
        if (!user || typeof user.id !== 'string') return;
        const world = worldRef.current;
        const existing = world.users.get(user.id);
        if (existing) {
          existing.x = user.x;
          existing.y = user.y;
        } else {
          world.users.set(user.id, { id: user.id, name: user.name ?? null, x: user.x, y: user.y });
        }
      });

      socket.on('user:left', (user) => {
        if (!user || typeof user.id !== 'string') return;
        worldRef.current.users.delete(user.id);
      });

      socket.on('error', (err) => {
        setError(toError(err));
        // A rejected join leaves us connected but not in a room; the
        // join screen reads `error` and stays up. Once joined, a later
        // error is surfaced without tearing the world down.
        setStatus((prev) => (prev === 'joined' ? prev : 'error'));
      });

      socket.on('connect_error', (err) => {
        setError({ code: 'connection_failed', message: err?.message ?? 'could not reach the server' });
        setStatus((prev) => (prev === 'joined' ? prev : 'error'));
      });

      socket.on('disconnect', () => {
        setStatus((prev) => (prev === 'joined' ? 'disconnected' : prev));
      });
    },
    [teardownSocket],
  );

  // Clean disconnect on unmount: no socket (and no presence document
  // server-side) outlives the component that opened it.
  useEffect(() => teardownSocket, [teardownSocket]);

  return { world: worldRef, status, error, joinedInfo, join };
}

export default useSocket;
