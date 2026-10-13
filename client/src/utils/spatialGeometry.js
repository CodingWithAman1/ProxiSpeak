/**
 * Geospatial & acoustic geometry utilities for ProxiSpeak
 */

// Calculate Euclidean distance between two 2D points
export function calculateDistance(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Convert screen/canvas pixels to virtual meters for display (1 meter ≈ 15 pixels)
export function pixelsToMeters(pixels) {
  return (pixels / 15).toFixed(1);
}

/**
 * Computes proximity audio volume gain based on distance and earshot radius.
 * Applies a smooth natural falloff curve.
 */
export function calculateProximityGain(distance, radius, isOccluded = false) {
  if (distance >= radius) return 0;
  
  // Inner full-volume zone (within 20% of radius is 100% volume)
  const innerRadius = radius * 0.2;
  let gain = 1;

  if (distance > innerRadius) {
    const falloffDist = distance - innerRadius;
    const falloffRange = radius - innerRadius;
    // Smooth cosine or polynomial fade-out
    const normalized = falloffDist / falloffRange;
    gain = Math.max(0, 1 - Math.pow(normalized, 1.25));
  }

  // If occluded by a wall barrier, attenuate gain by 65%
  if (isOccluded) {
    gain *= 0.35;
  }

  return Math.min(1, Math.max(0, gain));
}

/**
 * Calculates stereo panning [-1.0 (full left) to +1.0 (full right)]
 * relative to player position.
 */
export function calculateStereoPan(player, peer, radius) {
  const dx = peer.x - player.x;
  // Normalize based on radius so full left/right occurs at radius edge
  const pan = dx / (radius || 1);
  return Math.max(-1, Math.min(1, pan));
}

/**
 * Line segment intersection test:
 * Checks whether line segment AB (player -> peer) intersects CD (wall).
 */
export function lineSegmentsIntersect(p1, p2, p3, p4) {
  const ccw = (A, B, C) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };

  return (
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
    ccw(p1, p2, p3) !== ccw(p1, p2, p4)
  );
}

/**
 * Checks if line of sight between two avatars is occluded by any acoustic wall.
 */
export function checkWallOcclusion(p1, p2, walls = []) {
  for (const wall of walls) {
    if (lineSegmentsIntersect(p1, p2, wall.start, wall.end)) {
      return true;
    }
  }
  return false;
}

/**
 * Find which room/zone a point (avatar position) is currently in.
 */
export function getContainingRoom(point, rooms = []) {
  for (const room of rooms) {
    if (
      point.x >= room.x &&
      point.x <= room.x + room.w &&
      point.y >= room.y &&
      point.y <= room.y + room.h
    ) {
      return room;
    }
  }
  return null;
}
