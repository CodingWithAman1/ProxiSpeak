/**
 * REST API Endpoints for ProxiSpeak
 */
import { Router } from 'express';
import Room from '../models/Room.js';
import { DEFAULT_ROOMS } from '../seed/seedData.js';
import { spatialStore, computeSpatialAudioProfile } from '../services/spatialEngine.js';
import { getDatabaseStatus } from '../database/mongo.js';

const router = Router();
const startedAt = Date.now();

/**
 * Health check & platform telemetry
 */
router.get('/health', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const memory = process.memoryUsage();

  res.status(200).json({
    status: 'ok',
    service: 'proxispeak',
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    database: {
      connected: dbStatus.connected,
      mode: dbStatus.isMemoryFallback ? 'in-memory-fallback' : 'mongodb',
    },
    metrics: {
      activeRooms: spatialStore.rooms.size,
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
  });
});

/**
 * Get all available rooms
 */
router.get('/api/rooms', async (req, res) => {
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const rooms = await Room.find().lean();
      if (rooms.length > 0) {
        return res.json({ ok: true, data: rooms });
      }
    }
    // Fallback to default in-memory seed rooms
    return res.json({ ok: true, data: DEFAULT_ROOMS });
  } catch (err) {
    return res.json({ ok: true, data: DEFAULT_ROOMS });
  }
});

/**
 * Get single room by slug
 */
router.get('/api/rooms/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const dbStatus = getDatabaseStatus();
    if (dbStatus.connected) {
      const room = await Room.findOne({ slug }).lean();
      if (room) return res.json({ ok: true, data: room });
    }

    const defaultRoom = DEFAULT_ROOMS.find((r) => r.slug === slug);
    if (defaultRoom) return res.json({ ok: true, data: defaultRoom });

    return res.status(404).json({ ok: false, error: `Room "${slug}" not found` });
  } catch (err) {
    const defaultRoom = DEFAULT_ROOMS.find((r) => r.slug === slug);
    if (defaultRoom) return res.json({ ok: true, data: defaultRoom });
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * Get live active presence for a room
 */
router.get('/api/rooms/:slug/presence', (req, res) => {
  const { slug } = req.params;
  const users = spatialStore.getAllUsers(slug);
  res.json({
    ok: true,
    roomId: slug,
    count: users.length,
    users,
  });
});

/**
 * Spatial Engine Audit / Verification endpoint
 * Computes exact distance, gain, pan, and wall occlusion between any two coordinates.
 */
router.get('/api/spatial/audit', (req, res) => {
  const {
    roomId = 'central-plaza',
    x1 = 50,
    y1 = 50,
    o1 = 0,
    r1 = 20,
    x2 = 60,
    y2 = 50,
  } = req.query;

  const walls = spatialStore.getRoomWalls(roomId);
  const listener = { x: Number(x1), y: Number(y1), orientation: Number(o1), earshotRadius: Number(r1) };
  const speaker = { x: Number(x2), y: Number(y2) };

  const audit = computeSpatialAudioProfile(listener, speaker, walls);

  res.json({
    ok: true,
    roomId,
    listener,
    speaker,
    wallsEvaluated: walls.length,
    audit,
  });
});

export default router;
