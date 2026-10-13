/**
 * Canvas renderer — plain functions, no React.
 *
 * Everything here takes a 2D context plus the world ref the socket hook
 * maintains, and paints one frame. The component owns the canvas, the
 * devicePixelRatio transform and the requestAnimationFrame loop; this
 * module only knows how to draw in CSS-pixel coordinates.
 */
import { computeViewport, worldToScreen } from './coords.js';

/** Distinct colour per obstacle type, straight from the server's data. */
export const OBSTACLE_COLORS = Object.freeze({
  wall: '#8a93a6',
  desk: '#c98a3d',
  screen: '#4f8cff',
  pillar: '#9b7bea',
  plant: '#4caf7d',
});

const OBSTACLE_FALLBACK = '#6b7280';
const GRID_STEP_WORLD = 120; // px on the room plane between grid lines

export function obstacleColor(type) {
  return OBSTACLE_COLORS[type] ?? OBSTACLE_FALLBACK;
}

/**
 * Draw the static room: letterbox backdrop, floor, light grid and
 * obstacles. Avatar rendering is layered on top by drawWorld (Day 4,
 * next commit) — this function is the room without people.
 *
 * @param {CanvasRenderingContext2D} ctx context already scaled for DPR
 * @param {{ room: object|null }} world world ref contents
 * @param {{ width: number, height: number }} size canvas size in CSS pixels
 * @returns the viewport used, or null when there is nothing to draw
 */
export function drawRoom(ctx, world, size) {
  const { width, height } = size;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#05070d';
  ctx.fillRect(0, 0, width, height);

  const room = world?.room;
  if (!room) return null;

  const viewport = computeViewport(room.width, room.height, width, height);
  const floorTopLeft = worldToScreen({ x: 0, y: 0 }, viewport);
  const floorBottomRight = worldToScreen({ x: room.width, y: room.height }, viewport);

  // Floor.
  ctx.fillStyle = '#151c2e';
  ctx.fillRect(floorTopLeft.x, floorTopLeft.y, viewport.drawnWidth, viewport.drawnHeight);

  // Light grid inside the floor only.
  ctx.strokeStyle = 'rgba(163, 179, 214, 0.14)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = GRID_STEP_WORLD; x < room.width; x += GRID_STEP_WORLD) {
    const from = worldToScreen({ x, y: 0 }, viewport);
    const to = worldToScreen({ x, y: room.height }, viewport);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  for (let y = GRID_STEP_WORLD; y < room.height; y += GRID_STEP_WORLD) {
    const from = worldToScreen({ x: 0, y }, viewport);
    const to = worldToScreen({ x: room.width, y }, viewport);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();

  // Floor border so the room edge reads against the letterbox bands.
  ctx.strokeStyle = 'rgba(229, 233, 240, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(floorTopLeft.x, floorTopLeft.y, viewport.drawnWidth, viewport.drawnHeight);

  // Obstacles: server data only ({ id, type, x, y, w, h, ... }), painted
  // in room coordinates so the layout matches every other client.
  for (const obstacle of room.obstacles ?? []) {
    const topLeft = worldToScreen(obstacle, viewport);
    ctx.fillStyle = obstacleColor(obstacle.type);
    ctx.globalAlpha = 0.85;
    ctx.fillRect(topLeft.x, topLeft.y, obstacle.w * viewport.scale, obstacle.h * viewport.scale);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(5, 7, 13, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(topLeft.x, topLeft.y, obstacle.w * viewport.scale, obstacle.h * viewport.scale);

    if (viewport.scale > 0.25) {
      ctx.fillStyle = 'rgba(229, 233, 240, 0.75)';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(obstacle.type ?? ''), topLeft.x + 3, topLeft.y - 2);
    }
  }

  void floorBottomRight;
  return viewport;
}

export default drawRoom;
