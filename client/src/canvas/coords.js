/**
 * Pure world <-> screen coordinate helpers (no React, no DOM, no canvas).
 *
 * The room is a fixed pixel plane (e.g. 1920x1080 from the server's
 * `joined` payload). The canvas is whatever size the window happens to
 * be. These helpers fit the whole room into the canvas with
 * letterboxing: one uniform scale, centred, empty bands on the sides
 * or top/bottom when the aspect ratios differ — never stretched.
 */

function requirePositiveFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive finite number, got ${value}`);
  }
}

function requireFinite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, got ${value}`);
  }
}

/**
 * Fit a room of (roomWidth x roomHeight) into a canvas of
 * (canvasWidth x canvasHeight) CSS pixels.
 *
 * @returns {{ scale: number, offsetX: number, offsetY: number,
 *             drawnWidth: number, drawnHeight: number,
 *             roomWidth: number, roomHeight: number,
 *             canvasWidth: number, canvasHeight: number }}
 */
export function computeViewport(roomWidth, roomHeight, canvasWidth, canvasHeight) {
  requirePositiveFinite(roomWidth, 'roomWidth');
  requirePositiveFinite(roomHeight, 'roomHeight');
  requirePositiveFinite(canvasWidth, 'canvasWidth');
  requirePositiveFinite(canvasHeight, 'canvasHeight');

  const scale = Math.min(canvasWidth / roomWidth, canvasHeight / roomHeight);
  const drawnWidth = roomWidth * scale;
  const drawnHeight = roomHeight * scale;

  return {
    scale,
    offsetX: (canvasWidth - drawnWidth) / 2,
    offsetY: (canvasHeight - drawnHeight) / 2,
    drawnWidth,
    drawnHeight,
    roomWidth,
    roomHeight,
    canvasWidth,
    canvasHeight,
  };
}

/** World (room pixel) coordinates -> screen (canvas CSS pixel) coordinates. */
export function worldToScreen(point, viewport) {
  requireFinite(point?.x, 'point.x');
  requireFinite(point?.y, 'point.y');
  return {
    x: viewport.offsetX + point.x * viewport.scale,
    y: viewport.offsetY + point.y * viewport.scale,
  };
}

/** Screen (canvas CSS pixel) coordinates -> world (room pixel) coordinates. Inverse of worldToScreen. */
export function screenToWorld(point, viewport) {
  requireFinite(point?.x, 'point.x');
  requireFinite(point?.y, 'point.y');
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

export default computeViewport;
