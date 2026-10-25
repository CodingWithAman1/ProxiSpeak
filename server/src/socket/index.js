import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import { presenceStore } from '../db/index.js';
import { getNeighborsForUser } from '../services/spatialEngine.js';
import { setupWebRTCSignaling, syncMeshConnections } from './webrtc.js';

// Synchronized World State: Doors, Windows, Conference Seats
const initialDoorStates = [
  { id: 'door-top-entrance', isOpen: false, type: 'glass_double', orientation: 'horizontal' },
  { id: 'door-center-glass', isOpen: true, type: 'glass_double', orientation: 'horizontal' },
  { id: 'door-south-entrance', isOpen: false, type: 'glass_double', orientation: 'horizontal' },
  { id: 'door-boardroom', isOpen: false, type: 'wood_single', orientation: 'horizontal' },
  { id: 'door-devhub', isOpen: true, type: 'wood_single', orientation: 'vertical' },
  { id: 'door-focus-1', isOpen: false, type: 'wood_single', orientation: 'vertical' },
  { id: 'door-focus-2', isOpen: false, type: 'wood_single', orientation: 'vertical' },
  { id: 'door-restroom', isOpen: false, type: 'wood_single', orientation: 'horizontal' },
];

let liveDoors = [...initialDoorStates];

// Static walls for occlusion calculation
const officeWalls = [
  { id: 'w-top-1', start: { x: 18, y: 16 }, end: { x: 468, y: 16 } },
  { id: 'w-top-2', start: { x: 544, y: 16 }, end: { x: 1000, y: 16 } },
  { id: 'w-right', start: { x: 1000, y: 16 }, end: { x: 1000, y: 552 } },
  { id: 'w-bot-2', start: { x: 544, y: 552 }, end: { x: 1000, y: 552 } },
  { id: 'w-bot-1', start: { x: 18, y: 552 }, end: { x: 472, y: 552 } },
  { id: 'w-left', start: { x: 18, y: 16 }, end: { x: 18, y: 552 } },
  { id: 'w-dev-e1', start: { x: 436, y: 16 }, end: { x: 436, y: 168 } },
  { id: 'w-dev-e2', start: { x: 436, y: 204 }, end: { x: 436, y: 365 } },
  { id: 'w-dev-e-corner', start: { x: 410, y: 365 }, end: { x: 436, y: 365 } },
  { id: 'w-dev-e3', start: { x: 410, y: 365 }, end: { x: 410, y: 552 } },
  { id: 'w-corr-e1', start: { x: 577, y: 16 }, end: { x: 577, y: 205 } },
  { id: 'w-corr-e2', start: { x: 577, y: 205 }, end: { x: 577, y: 245 } },
  { id: 'w-corr-e3', start: { x: 577, y: 335 }, end: { x: 577, y: 552 } },
  { id: 'w-br-s1', start: { x: 577, y: 205 }, end: { x: 585, y: 205 } },
  { id: 'w-br-s2', start: { x: 625, y: 205 }, end: { x: 1000, y: 205 } },
  { id: 'w-rec-n1', start: { x: 410, y: 365 }, end: { x: 468, y: 365 } },
  { id: 'w-rec-n2', start: { x: 544, y: 365 }, end: { x: 577, y: 365 } },
  { id: 'w-pod-w1', start: { x: 852, y: 205 }, end: { x: 852, y: 228 } },
  { id: 'w-pod-w2', start: { x: 852, y: 264 }, end: { x: 852, y: 334 } },
  { id: 'w-pod-w3', start: { x: 852, y: 370 }, end: { x: 852, y: 440 } },
  { id: 'w-pod-div', start: { x: 852, y: 320 }, end: { x: 1000, y: 320 } },
  { id: 'w-rest-n1', start: { x: 852, y: 440 }, end: { x: 880, y: 440 } },
  { id: 'w-rest-n2', start: { x: 916, y: 440 }, end: { x: 1000, y: 440 } },
];

export function setupSocketGateway(httpServer, config) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.server.clientOrigins.length ? config.server.clientOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (${socket.handshake.address})`);

    // Setup WebRTC signaling relay for this socket
    setupWebRTCSignaling(io, socket);

    // 1. User joins the spatial workspace
    socket.on('user:join', async (userData) => {
      const user = {
        userId: userData.userId || `user-${socket.id.slice(0, 6)}`,
        name: userData.name || 'Anonymous Peer',
        color: userData.color || '#06b6d4',
        x: userData.x ?? 505,
        y: userData.y ?? 120,
        currentRoom: userData.currentRoom || 'corridor',
        isMuted: !!userData.isMuted,
        isDeafened: !!userData.isDeafened,
        isSpeaking: !!userData.isSpeaking,
        isSeated: !!userData.isSeated,
        earshotRadius: userData.earshotRadius || 150,
        socketId: socket.id,
      };

      await presenceStore.saveUser(user);
      logger.info(`User joined presence: ${user.name} (${user.userId}) at [${user.x}, ${user.y}]`);

      // Send initial workspace synchronization back to the user
      const allUsers = await presenceStore.getAllUsers();
      socket.emit('sync:initial_state', {
        self: user,
        peers: allUsers.filter((u) => u.userId !== user.userId),
        doors: liveDoors,
      });

      // Broadcast user:joined to all other clients
      socket.broadcast.emit('user:joined', user);

      // Compute initial proximity for this user
      const neighbors = getNeighborsForUser(user, allUsers, officeWalls, liveDoors);
      socket.emit('proximity:update', { neighbors });
      syncMeshConnections(socket, user, neighbors, io);
    });

    // 2. Real-time avatar movement
    socket.on('user:move', async ({ x, y, currentRoom }) => {
      const existing = await presenceStore.getUserBySocketId(socket.id);
      if (!existing) return;

      const updated = {
        userId: existing.userId,
        name: existing.name,
        color: existing.color,
        x,
        y,
        currentRoom: currentRoom || existing.currentRoom || 'corridor',
        isMuted: existing.isMuted,
        isDeafened: existing.isDeafened,
        isSpeaking: existing.isSpeaking,
        isSeated: existing.isSeated,
        earshotRadius: existing.earshotRadius || 150,
        socketId: socket.id,
      };

      await presenceStore.saveUser(updated);

      // Broadcast lightweight movement delta to peers
      socket.broadcast.emit('user:moved', {
        userId: updated.userId,
        socketId: socket.id,
        x,
        y,
        currentRoom: updated.currentRoom,
      });

      // Compute and emit proximity updates
      const allUsers = await presenceStore.getAllUsers();
      const neighbors = getNeighborsForUser(updated, allUsers, officeWalls, liveDoors);
      socket.emit('proximity:update', { neighbors });

      // Dynamically trigger WebRTC voice mesh connections based on proximity
      syncMeshConnections(socket, updated, neighbors, io);
    });

    // 3. User audio & mic state changes (mute, deafen, speaking)
    socket.on('user:state', async (stateUpdate) => {
      const existing = await presenceStore.getUserBySocketId(socket.id);
      if (!existing) return;

      const updated = {
        ...existing,
        ...stateUpdate,
        userId: existing.userId,
        socketId: socket.id,
      };

      await presenceStore.saveUser(updated);
      socket.broadcast.emit('user:state_changed', {
        userId: existing.userId,
        socketId: socket.id,
        ...stateUpdate,
      });
    });

    // 4. Synchronized door interactions
    socket.on('door:toggle', ({ doorId, isOpen }) => {
      liveDoors = liveDoors.map((door) => {
        if (door.id === doorId) {
          const nextState = isOpen !== undefined ? isOpen : !door.isOpen;
          return { ...door, isOpen: nextState };
        }
        return door;
      });

      const updatedDoor = liveDoors.find((d) => d.id === doorId);
      io.emit('door:updated', updatedDoor);
      logger.info(`Door state synced: ${doorId} -> ${updatedDoor?.isOpen ? 'OPEN' : 'CLOSED'}`);
    });

    // 5. Clean up on disconnect
    socket.on('disconnect', async () => {
      const removed = await presenceStore.removeUserBySocketId(socket.id);
      if (removed) {
        logger.info(`User departed: ${removed.name} (${removed.userId})`);
        io.emit('user:left', {
          userId: removed.userId,
          socketId: socket.id,
        });
      }
    });
  });

  return io;
}

export default setupSocketGateway;
