/**
 * Spatial Audio & Proximity Computation Engine
 * Runs on the server to compute real-time peer graphs, earshot proximity,
 * WebRTC mesh trigger requirements, and acoustic wall occlusion.
 */

export function calculateDistance(a, b) {
  const ax = a.x ?? a.location?.coordinates?.[0] ?? 0;
  const ay = a.y ?? a.location?.coordinates?.[1] ?? 0;
  const bx = b.x ?? b.location?.coordinates?.[0] ?? 0;
  const by = b.y ?? b.location?.coordinates?.[1] ?? 0;
  return Math.hypot(ax - bx, ay - by);
}

export function pixelsToMeters(pixels) {
  return Number((pixels / 15).toFixed(1));
}

export function calculateProximityGain(distance, earshotRadius, isOccluded = false) {
  if (distance > earshotRadius) return 0;
  if (distance <= 0) return 1;

  // Inverse exponential falloff curve: loud when close, gradual fade to edge
  const normalized = 1 - distance / earshotRadius;
  const rawGain = Math.pow(normalized, 1.4);

  // Apply acoustic low-pass attenuation if muffled behind solid walls or closed doors
  return Number(Math.max(0, Math.min(1, isOccluded ? rawGain * 0.35 : rawGain)).toFixed(3));
}

export function calculateStereoPan(listener, source, maxRadius = 150) {
  const lx = listener.x ?? listener.location?.coordinates?.[0] ?? 0;
  const sx = source.x ?? source.location?.coordinates?.[0] ?? 0;
  const dx = sx - lx;
  const pan = dx / (maxRadius || 1);
  return Number(Math.max(-1, Math.min(1, pan)).toFixed(3));
}

export function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

export function checkWallOcclusion(posA, posB, walls = []) {
  const ax = posA.x ?? posA.location?.coordinates?.[0] ?? 0;
  const ay = posA.y ?? posA.location?.coordinates?.[1] ?? 0;
  const bx = posB.x ?? posB.location?.coordinates?.[0] ?? 0;
  const by = posB.y ?? posB.location?.coordinates?.[1] ?? 0;

  for (const wall of walls) {
    if (linesIntersect(ax, ay, bx, by, wall.start.x, wall.start.y, wall.end.x, wall.end.y)) {
      return true;
    }
  }
  return false;
}

/**
 * Computes proximity neighbors for a specific user against all other active users
 */
export function getNeighborsForUser(user, allUsers = [], walls = [], doors = []) {
  // Combine static walls with closed doors to form the effective acoustic occluder set
  const activeAcousticWalls = [...walls];
  doors.forEach((door) => {
    if (!door.isOpen) {
      if (door.orientation === 'vertical') {
        const midX = door.x + door.w / 2;
        activeAcousticWalls.push({
          start: { x: midX, y: door.y },
          end: { x: midX, y: door.y + door.h },
        });
      } else {
        const midY = door.y + door.h / 2;
        activeAcousticWalls.push({
          start: { x: door.x, y: midY },
          end: { x: door.x + door.w, y: midY },
        });
      }
    }
  });

  const earshot = user.earshotRadius || 150;
  const neighbors = [];

  for (const other of allUsers) {
    if (other.userId === user.userId) continue;

    const dist = calculateDistance(user, other);
    const inRange = dist <= earshot;
    const isOccluded = inRange ? checkWallOcclusion(user, other, activeAcousticWalls) : false;
    const gain = inRange ? calculateProximityGain(dist, earshot, isOccluded) : 0;
    const pan = inRange ? calculateStereoPan(user, other, earshot) : 0;

    neighbors.push({
      userId: other.userId,
      socketId: other.socketId,
      name: other.name,
      color: other.color,
      x: other.x ?? other.location?.coordinates?.[0] ?? 0,
      y: other.y ?? other.location?.coordinates?.[1] ?? 0,
      distance: Number(dist.toFixed(1)),
      distanceMeters: pixelsToMeters(dist),
      inRange,
      isOccluded,
      gain,
      pan,
      isMuted: !!other.isMuted,
      isSpeaking: !!other.isSpeaking,
      isSeated: !!other.isSeated,
    });
  }

  return neighbors;
}

export default {
  calculateDistance,
  pixelsToMeters,
  calculateProximityGain,
  calculateStereoPan,
  checkWallOcclusion,
  getNeighborsForUser,
};
