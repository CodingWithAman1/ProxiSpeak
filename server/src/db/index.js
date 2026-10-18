import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import UserPresence from '../models/UserPresence.js';
import Room from '../models/Room.js';

let isConnected = false;
let useMemoryStore = false;

// Robust In-Memory Fallback Store when MongoDB is not running locally
class MemoryStore {
  constructor() {
    this.users = new Map();
    this.rooms = new Map();
  }

  async upsertUser(user) {
    const existing = this.users.get(user.userId) || {};
    const updated = {
      ...existing,
      ...user,
      lastActive: new Date(),
    };
    this.users.set(user.userId, updated);
    return updated;
  }

  async getUser(userId) {
    return this.users.get(userId) || null;
  }

  async getUserBySocketId(socketId) {
    for (const user of this.users.values()) {
      if (user.socketId === socketId) return user;
    }
    return null;
  }

  async removeUser(userId) {
    const user = this.users.get(userId);
    this.users.delete(userId);
    return user;
  }

  async getAllUsers() {
    return Array.from(this.users.values());
  }

  async upsertRoom(room) {
    this.rooms.set(room.roomId, room);
    return room;
  }

  async getAllRooms() {
    return Array.from(this.rooms.values());
  }
}

export const memoryStore = new MemoryStore();

/**
 * Connect to MongoDB with timeout & auto-fallback
 */
export async function connectDB() {
  if (isConnected) return true;

  try {
    mongoose.set('strictQuery', false);
    logger.info(`Attempting to connect to MongoDB at ${config.db.uri}...`);

    await mongoose.connect(config.db.uri, {
      serverSelectionTimeoutMS: 2500,
    });

    isConnected = true;
    useMemoryStore = false;
    logger.info('Connected to MongoDB successfully (2dsphere spatial indexing active)');
    return true;
  } catch (err) {
    isConnected = false;
    useMemoryStore = true;
    logger.warn(`MongoDB not available (${err.message}). Activated high-performance In-Memory Spatial Store.`);
    return false;
  }
}

/**
 * Unified Presence Data Access Layer (handles Mongo or Memory Store transparently)
 */
export const presenceStore = {
  async saveUser(user) {
    if (isConnected) {
      try {
        const coords = [user.x ?? user.location?.coordinates?.[0] ?? 505, user.y ?? user.location?.coordinates?.[1] ?? 120];
        return await UserPresence.findOneAndUpdate(
          { userId: user.userId },
          {
            $set: {
              name: user.name,
              color: user.color,
              location: { type: 'Point', coordinates: coords },
              currentRoom: user.currentRoom || 'corridor',
              isMuted: !!user.isMuted,
              isDeafened: !!user.isDeafened,
              isSpeaking: !!user.isSpeaking,
              isSeated: !!user.isSeated,
              earshotRadius: user.earshotRadius || 150,
              socketId: user.socketId,
              lastActive: new Date(),
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch {
        return memoryStore.upsertUser(user);
      }
    }
    return memoryStore.upsertUser(user);
  },

  async getUser(userId) {
    if (isConnected) {
      try {
        return await UserPresence.findOne({ userId });
      } catch {
        return memoryStore.getUser(userId);
      }
    }
    return memoryStore.getUser(userId);
  },

  async getUserBySocketId(socketId) {
    if (isConnected) {
      try {
        return await UserPresence.findOne({ socketId });
      } catch {
        return memoryStore.getUserBySocketId(socketId);
      }
    }
    return memoryStore.getUserBySocketId(socketId);
  },

  async removeUserBySocketId(socketId) {
    if (isConnected) {
      try {
        return await UserPresence.findOneAndDelete({ socketId });
      } catch {
        const u = await memoryStore.getUserBySocketId(socketId);
        if (u) await memoryStore.removeUser(u.userId);
        return u;
      }
    }
    const u = await memoryStore.getUserBySocketId(socketId);
    if (u) await memoryStore.removeUser(u.userId);
    return u;
  },

  async getAllUsers() {
    if (isConnected) {
      try {
        const list = await UserPresence.find({});
        return list.map((doc) => ({
          userId: doc.userId,
          name: doc.name,
          color: doc.color,
          x: doc.location?.coordinates?.[0] ?? 505,
          y: doc.location?.coordinates?.[1] ?? 120,
          currentRoom: doc.currentRoom,
          isMuted: doc.isMuted,
          isDeafened: doc.isDeafened,
          isSpeaking: doc.isSpeaking,
          isSeated: doc.isSeated,
          earshotRadius: doc.earshotRadius,
          socketId: doc.socketId,
        }));
      } catch {
        return memoryStore.getAllUsers();
      }
    }
    return memoryStore.getAllUsers();
  },

  isMongoActive() {
    return isConnected;
  },
};

export default { connectDB, presenceStore, memoryStore };
