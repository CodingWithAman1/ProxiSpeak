/**
 * Spatial Engine — Computes real-time proximity falloff, stereo panning angles,
 * and raycasting wall occlusion.
 */
import config from '../config/index.js';

/**
 * Checks if two line segments (p1->p2 and p3->p4) intersect.
 */
export function lineSegmentsIntersect(p1x, p1y, p2x, p2y, p3x, p3y, p4x, p4y) {
  const ccw = (ax, ay, bx, by, cx, cy) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };

  const a = ccw(p1x, p1y, p3x, p3y, p4x, p4y);
  const b = ccw(p2x, p2y, p3x, p3y, p4x, p4y);
  const c = ccw(p1x, p1y, p2x, p2y, p3x, p3y);
  const d = ccw(p1x, p1y, p2x, p2y, p4x, p4y);

  return a !== b && c !== d;
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates proximity gain based on distance, min hearing distance, and earshot radius.
 * Uses a smooth cosine/inverse falloff curve.
 */
export function calculateProximityGain(distance, earshotRadius, minDistance = config.spatial.minHearingDistance) {
  if (distance <= minDistance) return 1.0;
  if (distance >= earshotRadius) return 0.0;

  // Normalized distance 0..1 between minDistance and earshotRadius
  const normalized = (distance - minDistance) / (earshotRadius - minDistance);
  // Smooth cosine roll-off: 1 at 0, 0 at 1
  return Math.max(0, Math.min(1, 0.5 * (1 + Math.cos(normalized * Math.PI))));
}

/**
 * Calculates relative angle (azimuth) from listener to source in range [-180, 180] degrees,
 * taking listener orientation into account.
 * Panning value: -1.0 (full left) to +1.0 (full right).
 */
export function calculateStereoPan(listenerX, listenerY, listenerOrientation, sourceX, sourceY) {
  const dx = sourceX - listenerX;
  const dy = sourceY - listenerY;
  if (dx === 0 && dy === 0) return 0;

  // World angle from listener to source in radians
  const angleToSource = Math.atan2(dy, dx);
  // Relative angle to listener facing direction
  let relativeAngle = angleToSource - listenerOrientation;

  // Normalize to [-PI, PI]
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

  // Stereo pan from sine of relative angle: -1 (left) to 1 (right)
  return Math.sin(relativeAngle);
}

/**
 * Raycasts line of sight against all room walls to compute acoustic occlusion.
 */
export function checkWallOcclusion(p1x, p1y, p2x, p2y, walls = []) {
  let occludedWalls = 0;
  let totalAttenuationDb = 0;
  let lowestCutoffFreq = 20000;

  for (const wall of walls) {
    if (lineSegmentsIntersect(p1x, p1y, p2x, p2y, wall.x1, wall.y1, wall.x2, wall.y2)) {
      occludedWalls += 1;
      totalAttenuationDb += wall.attenuationDb || config.spatial.wallAttenuationDb;
      const cutoff = wall.cutoffFreq || config.spatial.wallCutoffFreq;
      if (cutoff < lowestCutoffFreq) {
        lowestCutoffFreq = cutoff;
      }
    }
  }

  const isOccluded = occludedWalls > 0;
  // Convert dB attenuation to linear gain multiplier: gain = 10^(-dB / 20)
  const occlusionGainFactor = isOccluded ? Math.max(0.05, Math.pow(10, -totalAttenuationDb / 20)) : 1.0;

  return {
    isOccluded,
    wallCount: occludedWalls,
    totalAttenuationDb,
    occlusionGainFactor,
    cutoffFreq: isOccluded ? lowestCutoffFreq : 20000,
  };
}

/**
 * Complete acoustic relationship computation between listener and speaker.
 */
export function computeSpatialAudioProfile(listener, speaker, roomWalls = []) {
  const distance = calculateDistance(listener.x, listener.y, speaker.x, speaker.y);
  const earshot = listener.earshotRadius || config.spatial.defaultEarshotRadius;
  const inEarshot = distance <= earshot;

  if (!inEarshot) {
    return {
      inEarshot: false,
      distance: Math.round(distance * 100) / 100,
      gain: 0,
      pan: 0,
      isOccluded: false,
      cutoffFreq: 20000,
    };
  }

  const baseGain = calculateProximityGain(distance, earshot, config.spatial.minHearingDistance);
  const occlusion = checkWallOcclusion(listener.x, listener.y, speaker.x, speaker.y, roomWalls);
  const effectiveGain = baseGain * occlusion.occlusionGainFactor;
  const pan = calculateStereoPan(listener.x, listener.y, listener.orientation || 0, speaker.x, speaker.y);

  return {
    inEarshot: true,
    distance: Math.round(distance * 100) / 100,
    baseGain: Math.round(baseGain * 1000) / 1000,
    gain: Math.round(effectiveGain * 1000) / 1000,
    pan: Math.round(pan * 1000) / 1000,
    isOccluded: occlusion.isOccluded,
    occlusionGainFactor: occlusion.occlusionGainFactor,
    cutoffFreq: occlusion.cutoffFreq,
    wallCount: occlusion.wallCount,
  };
}

/**
 * In-memory spatial state store for instant low-latency presence tracking.
 */
class SpatialStore {
  constructor() {
    this.rooms = new Map(); // roomId -> Map(userId, presence)
    this.roomWalls = new Map(); // roomId -> Array(walls)
  }

  setRoomWalls(roomId, walls) {
    this.roomWalls.set(roomId, walls || []);
  }

  getRoomWalls(roomId) {
    return this.roomWalls.get(roomId) || [];
  }

  setUser(roomId, user) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    this.rooms.get(roomId).set(user.userId, { ...user, lastSeen: Date.now() });
  }

  getUser(roomId, userId) {
    return this.rooms.get(roomId)?.get(userId) || null;
  }

  removeUser(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(userId);
      if (room.size === 0) this.rooms.delete(roomId);
    }
  }

  removeSocket(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      for (const [userId, user] of room.entries()) {
        if (user.socketId === socketId) {
          room.delete(userId);
          return { roomId, user };
        }
      }
    }
    return null;
  }

  getAllUsers(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return Array.from(room.values());
  }

  /**
   * Computes spatial audit for all active users in a room.
   */
  computeProximityGraph(roomId) {
    const users = this.getAllUsers(roomId);
    const walls = this.getRoomWalls(roomId);
    const graph = {};

    for (let i = 0; i < users.length; i++) {
      const u1 = users[i];
      graph[u1.userId] = {
        user: u1,
        connections: {},
      };

      for (let j = 0; j < users.length; j++) {
        if (i === j) continue;
        const u2 = users[j];
        const profile = computeSpatialAudioProfile(u1, u2, walls);
        graph[u1.userId].connections[u2.userId] = profile;
      }
    }

    return graph;
  }
}

export const spatialStore = new SpatialStore();
export default spatialStore;
