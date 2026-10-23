/**
 * Real-time Socket.io Gateway for ProxiSpeak
 * Handles presence tracking, 60fps spatial updates, earshot diffs,
 * WebRTC voice mesh signaling, and simulation bots.
 */
import { Server } from 'socket.io';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { spatialStore, computeSpatialAudioProfile } from '../services/spatialEngine.js';
import { DEFAULT_ROOMS } from '../seed/seedData.js';
import UserPresence from '../models/UserPresence.js';

export function setupSocketGateway(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.server.clientOrigins.length ? config.server.clientOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Track active peer earshot graph: socketId -> Set(peerUserId)
  const peerAudibilityMap = new Map();
  // Track active bot timers per room: roomId -> Array(timerIds)
  const botTimers = new Map();

  io.on('connection', (socket) => {
    let currentRoomId = null;
    let currentUserId = null;
    peerAudibilityMap.set(socket.id, new Set());

    logger.debug(`Socket connected: ${socket.id}`);

    /**
     * User joins a spatial room
     */
    socket.on('presence:join', async (data) => {
      const { roomId = 'central-plaza', user = {} } = data;
      currentRoomId = roomId;
      currentUserId = user.userId || `usr_${socket.id.slice(0, 6)}`;

      socket.join(roomId);

      // Find room spawn coordinates
      const roomDef = DEFAULT_ROOMS.find((r) => r.slug === roomId) || DEFAULT_ROOMS[0];
      const initialX = user.x ?? roomDef.spawnPoint.x;
      const initialY = user.y ?? roomDef.spawnPoint.y;

      const presence = {
        userId: currentUserId,
        socketId: socket.id,
        roomId,
        name: user.name || `User ${socket.id.slice(0, 4)}`,
        avatar: user.avatar || 'avatar-1',
        color: user.color || '#3b82f6',
        x: initialX,
        y: initialY,
        orientation: 0,
        isSpeaking: false,
        isMuted: false,
        isDeafened: false,
        earshotRadius: user.earshotRadius || roomDef.earshotDefault || config.spatial.defaultEarshotRadius,
      };

      spatialStore.setUser(roomId, presence);

      // Persist to MongoDB if available
      try {
        if (UserPresence.db && UserPresence.db.readyState === 1) {
          await UserPresence.findOneAndUpdate(
            { userId: currentUserId },
            {
              ...presence,
              location: { type: 'Point', coordinates: [initialX, initialY] },
            },
            { upsert: true }
          );
        }
      } catch (err) {
        // In-memory fallback
      }

      const allUsers = spatialStore.getAllUsers(roomId);
      const roomWalls = spatialStore.getRoomWalls(roomId);

      // Notify current user with initial state
      socket.emit('presence:init', {
        self: presence,
        room: roomDef,
        users: allUsers.filter((u) => u.userId !== currentUserId),
        walls: roomWalls,
      });

      // Broadcast new user to all other room members
      socket.to(roomId).emit('presence:joined', presence);

      logger.info(`User ${presence.name} (${currentUserId}) joined room "${roomId}"`);
    });

    /**
     * User movement tick: computes earshot diffs and triggers WebRTC renegotiations
     */
    socket.on('presence:move', (coords) => {
      if (!currentRoomId || !currentUserId) return;

      const user = spatialStore.getUser(currentRoomId, currentUserId);
      if (!user) return;

      user.x = coords.x;
      user.y = coords.y;
      if (typeof coords.orientation === 'number') {
        user.orientation = coords.orientation;
      }
      spatialStore.setUser(currentRoomId, user);

      // Broadcast position to all peers in room for visual canvas rendering
      socket.to(currentRoomId).emit('presence:moved', {
        userId: currentUserId,
        x: user.x,
        y: user.y,
        orientation: user.orientation,
      });

      // Compute earshot diffs against all other peers
      const peers = spatialStore.getAllUsers(currentRoomId);
      const walls = spatialStore.getRoomWalls(currentRoomId);
      const audibleSet = peerAudibilityMap.get(socket.id) || new Set();

      for (const peer of peers) {
        if (peer.userId === currentUserId) continue;

        // Acoustic profile as listener
        const profile = computeSpatialAudioProfile(user, peer, walls);
        const wasAudible = audibleSet.has(peer.userId);

        if (profile.inEarshot && !wasAudible) {
          audibleSet.add(peer.userId);
          // Entered earshot: initiate WebRTC audio connection
          socket.emit('proximity:enter', {
            peerId: peer.userId,
            peerSocketId: peer.socketId,
            peerName: peer.name,
            profile,
          });

          // Also notify peer of our entry
          const reverseProfile = computeSpatialAudioProfile(peer, user, walls);
          io.to(peer.socketId).emit('proximity:enter', {
            peerId: user.userId,
            peerSocketId: socket.id,
            peerName: user.name,
            profile: reverseProfile,
          });
        } else if (!profile.inEarshot && wasAudible) {
          audibleSet.delete(peer.userId);
          // Exited earshot: crossfade out and tear down WebRTC audio connection
          socket.emit('proximity:exit', { peerId: peer.userId });
          io.to(peer.socketId).emit('proximity:exit', { peerId: user.userId });
        } else if (profile.inEarshot && wasAudible) {
          // Still in earshot: update volume gain, stereo pan, and wall occlusion
          socket.emit('proximity:update', {
            peerId: peer.userId,
            profile,
          });

          const reverseProfile = computeSpatialAudioProfile(peer, user, walls);
          io.to(peer.socketId).emit('proximity:update', {
            peerId: user.userId,
            profile: reverseProfile,
          });
        }
      }
    });

    /**
     * User state changed (mic muted, speaking, deafened)
     */
    socket.on('presence:state', (state) => {
      if (!currentRoomId || !currentUserId) return;

      const user = spatialStore.getUser(currentRoomId, currentUserId);
      if (!user) return;

      if (typeof state.isSpeaking === 'boolean') user.isSpeaking = state.isSpeaking;
      if (typeof state.isMuted === 'boolean') user.isMuted = state.isMuted;
      if (typeof state.isDeafened === 'boolean') user.isDeafened = state.isDeafened;
      if (typeof state.earshotRadius === 'number') user.earshotRadius = state.earshotRadius;

      spatialStore.setUser(currentRoomId, user);

      socket.to(currentRoomId).emit('presence:state-changed', {
        userId: currentUserId,
        isSpeaking: user.isSpeaking,
        isMuted: user.isMuted,
        isDeafened: user.isDeafened,
        earshotRadius: user.earshotRadius,
      });
    });

    /**
     * WebRTC Signaling: Offer
     */
    socket.on('signal:offer', ({ toSocketId, toUserId, offer }) => {
      io.to(toSocketId).emit('signal:offer', {
        fromSocketId: socket.id,
        fromUserId: currentUserId,
        offer,
      });
    });

    /**
     * WebRTC Signaling: Answer
     */
    socket.on('signal:answer', ({ toSocketId, toUserId, answer }) => {
      io.to(toSocketId).emit('signal:answer', {
        fromSocketId: socket.id,
        fromUserId: currentUserId,
        answer,
      });
    });

    /**
     * WebRTC Signaling: ICE Candidate
     */
    socket.on('signal:ice-candidate', ({ toSocketId, toUserId, candidate }) => {
      io.to(toSocketId).emit('signal:ice-candidate', {
        fromSocketId: socket.id,
        fromUserId: currentUserId,
        candidate,
      });
    });

    /**
     * Spatial Text Chat (Room Broadcast or Earshot Whisper)
     */
    socket.on('chat:send', ({ text, isWhisper = false }) => {
      if (!currentRoomId || !currentUserId || !text?.trim()) return;

      const sender = spatialStore.getUser(currentRoomId, currentUserId);
      if (!sender) return;

      const messageObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        senderId: currentUserId,
        senderName: sender.name,
        senderColor: sender.color,
        text: text.trim(),
        isWhisper,
        timestamp: new Date().toISOString(),
      };

      if (!isWhisper) {
        // Room broadcast
        io.to(currentRoomId).emit('chat:message', messageObj);
      } else {
        // Earshot whisper: only send to sender and users within audible radius
        socket.emit('chat:message', messageObj);
        const peers = spatialStore.getAllUsers(currentRoomId);
        const walls = spatialStore.getRoomWalls(currentRoomId);

        for (const peer of peers) {
          if (peer.userId === currentUserId) continue;
          const profile = computeSpatialAudioProfile(peer, sender, walls);
          if (profile.inEarshot) {
            io.to(peer.socketId).emit('chat:message', messageObj);
          }
        }
      }
    });

    /**
     * Simulation: Spawn automated testing bots
     */
    socket.on('simulation:spawn', ({ count = 2 }) => {
      if (!currentRoomId) return;

      const roomDef = DEFAULT_ROOMS.find((r) => r.slug === currentRoomId) || DEFAULT_ROOMS[0];
      const botNames = ['Bot Maya (Designer)', 'Bot Liam (Engineer)', 'Bot Sarah (Product)', 'Bot David (DevOps)'];
      const botColors = ['#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

      const spawnedBots = [];

      for (let i = 0; i < Math.min(count, 4); i++) {
        const botId = `bot_${Date.now()}_${i}`;
        const spawnX = Math.max(10, Math.min(roomDef.dimensions.width - 10, roomDef.spawnPoint.x + (i + 1) * 8 - 12));
        const spawnY = Math.max(10, Math.min(roomDef.dimensions.height - 10, roomDef.spawnPoint.y + ((i % 2 === 0 ? 1 : -1) * 6)));

        const botUser = {
          userId: botId,
          socketId: `socket_${botId}`,
          roomId: currentRoomId,
          name: botNames[i % botNames.length],
          avatar: `bot-${i + 1}`,
          color: botColors[i % botColors.length],
          x: spawnX,
          y: spawnY,
          orientation: 0,
          isSpeaking: false,
          isMuted: false,
          isDeafened: false,
          isBot: true,
          earshotRadius: roomDef.earshotDefault || config.spatial.defaultEarshotRadius,
        };

        spatialStore.setUser(currentRoomId, botUser);
        io.to(currentRoomId).emit('presence:joined', botUser);
        spawnedBots.push(botUser);
      }

      // Start autonomous wandering & speaking simulation
      const intervalId = setInterval(() => {
        const users = spatialStore.getAllUsers(currentRoomId);
        const activeBots = users.filter((u) => u.isBot);

        if (activeBots.length === 0) {
          clearInterval(intervalId);
          return;
        }

        for (const bot of activeBots) {
          // Autonomous wander with boundary collision avoidance
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.2 + Math.random() * 1.5;
          const newX = Math.max(8, Math.min(roomDef.dimensions.width - 8, bot.x + Math.cos(angle) * speed));
          const newY = Math.max(8, Math.min(roomDef.dimensions.height - 8, bot.y + Math.sin(angle) * speed));

          bot.x = Math.round(newX * 10) / 10;
          bot.y = Math.round(newY * 10) / 10;
          bot.orientation = angle;

          // Toggle occasional voice activity simulation
          if (Math.random() > 0.65) {
            bot.isSpeaking = !bot.isSpeaking;
          }

          spatialStore.setUser(currentRoomId, bot);

          io.to(currentRoomId).emit('presence:moved', {
            userId: bot.userId,
            x: bot.x,
            y: bot.y,
            orientation: bot.orientation,
          });

          io.to(currentRoomId).emit('presence:state-changed', {
            userId: bot.userId,
            isSpeaking: bot.isSpeaking,
            isMuted: false,
            isDeafened: false,
            earshotRadius: bot.earshotRadius,
          });
        }
      }, 400);

      if (!botTimers.has(currentRoomId)) botTimers.set(currentRoomId, []);
      botTimers.get(currentRoomId).push(intervalId);

      socket.emit('simulation:spawned', { count: spawnedBots.length, bots: spawnedBots });
    });

    /**
     * Simulation: Clear all bots
     */
    socket.on('simulation:clear', () => {
      if (!currentRoomId) return;

      const timers = botTimers.get(currentRoomId) || [];
      timers.forEach((t) => clearInterval(t));
      botTimers.set(currentRoomId, []);

      const users = spatialStore.getAllUsers(currentRoomId);
      for (const u of users) {
        if (u.isBot) {
          spatialStore.removeUser(currentRoomId, u.userId);
          io.to(currentRoomId).emit('presence:left', { userId: u.userId, socketId: u.socketId });
        }
      }
    });

    /**
     * User disconnects
     */
    socket.on('disconnect', () => {
      peerAudibilityMap.delete(socket.id);
      const removed = spatialStore.removeSocket(socket.id);

      if (removed) {
        const { roomId, user } = removed;
        io.to(roomId).emit('presence:left', {
          userId: user.userId,
          socketId: socket.id,
        });

        // Clean up from MongoDB
        try {
          if (UserPresence.db && UserPresence.db.readyState === 1) {
            UserPresence.deleteOne({ userId: user.userId }).exec();
          }
        } catch (err) {
          // ignore
        }

        logger.info(`User ${user.name} (${user.userId}) left room "${roomId}"`);
      }
    });
  });

  return io;
}

export default setupSocketGateway;
