/**
 * Geospatial, acoustic & collision geometry utilities for ProxiSpeak
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
    const normalized = falloffDist / falloffRange;
    gain = Math.max(0, 1 - Math.pow(normalized, 1.25));
  }

  // If occluded by a closed door or solid wall, attenuate gain by 65%
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
 * Checks if line of sight between two avatars is occluded by any acoustic wall or closed door.
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

/**
 * Minimum distance from point (px, py) to a 2D line segment (x1, y1) -> (x2, y2)
 */
export function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  // Projection parameter t
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}

/**
/**
 * Checks if a candidate position collides with any solid wall, closed door, or canvas boundary.
 * Note: If a door is open (isOpen === true and openProgress >= 0.6), it allows passage freely!
 */
export function isPositionColliding(pos, radius = 12, walls = [], doors = []) {
  // 1. Outer canvas boundary limits
  if (pos.x < 24 || pos.x > 1000 || pos.y < 24 || pos.y > 548) {
    return true;
  }

  // 2. Check against solid static walls
  for (const wall of walls) {
    const dist = distanceToSegment(pos.x, pos.y, wall.start.x, wall.start.y, wall.end.x, wall.end.y);
    if (dist < radius) {
      return true;
    }
  }

  // 3. Check against closed doors (closed doors act as solid physical barriers)
  for (const door of doors) {
    const isPassable = door.isOpen && (door.openProgress === undefined || door.openProgress >= 0.6);
    if (!isPassable) {
      let x1, y1, x2, y2;
      if (door.orientation === 'vertical' || door.w < door.h) {
        const midX = door.x + door.w / 2;
        x1 = midX;
        y1 = door.y;
        x2 = midX;
        y2 = door.y + door.h;
      } else {
        const midY = door.y + door.h / 2;
        x1 = door.x;
        y1 = midY;
        x2 = door.x + door.w;
        y2 = midY;
      }
      const dist = distanceToSegment(pos.x, pos.y, x1, y1, x2, y2);
      if (dist < radius) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Smooth axis-separated collision resolution with wall sliding
 * Allows avatar to glide along walls and doorframes when moving diagonally rather than getting stuck.
 */
export function resolvePlayerMovement(currentPos, nextPos, radius = 12, walls = [], doors = []) {
  // If no collision at destination, allow movement directly
  if (!isPositionColliding(nextPos, radius, walls, doors)) {
    return nextPos;
  }

  // Try sliding along X axis only
  const tryX = { x: nextPos.x, y: currentPos.y };
  const canMoveX = !isPositionColliding(tryX, radius, walls, doors);

  // Try sliding along Y axis only
  const tryY = { x: currentPos.x, y: nextPos.y };
  const canMoveY = !isPositionColliding(tryY, radius, walls, doors);

  if (canMoveX && !canMoveY) {
    return tryX;
  }
  if (!canMoveX && canMoveY) {
    return tryY;
  }
  if (canMoveX && canMoveY) {
    // Both axes are valid; pick the one with greater movement delta
    return Math.abs(nextPos.x - currentPos.x) >= Math.abs(nextPos.y - currentPos.y) ? tryX : tryY;
  }

  // Completely blocked; remain in current valid position
  return currentPos;
}

/**
 * Checks if a straight line path between start and end is free of wall/door collisions
 */
export function isPathClear(startPos, endPos, radius = 12, walls = [], doors = []) {
  const dist = Math.hypot(endPos.x - startPos.x, endPos.y - startPos.y);
  const steps = Math.max(2, Math.ceil(dist / 8));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const pt = {
      x: startPos.x + (endPos.x - startPos.x) * t,
      y: startPos.y + (endPos.y - startPos.y) * t,
    };
    if (isPositionColliding(pt, radius, walls, doors)) {
      return false;
    }
  }
  return true;
}

