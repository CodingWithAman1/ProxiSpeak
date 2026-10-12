/**
 * Payload validation for every event a client can send.
 *
 * Pure functions on purpose: they are the cheapest place to stop a malformed
 * or hostile payload, so they run before any database read/write and can be
 * unit tested without a server or a socket.
 */
import { ValidationError } from '../utils/errors.js';
import { clamp, isPlainObject, requireFiniteNumber, requireString, round2 } from '../utils/validate.js';

/**
 * Room ids are lowercased and restricted to url/file-system safe characters:
 * the id is used as a Socket.io room channel and as a MongoDB key, so dots,
 * slashes, dollar signs and colons are rejected outright.
 */
const ROOM_ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
/** Control characters would end up echoed to other clients — never allow them. */
const SAFE_NAME = /^[^\u0000-\u001f\u007f]+$/;

export const MAX_ROOM_ID_LENGTH = 48;
export const MAX_NAME_LENGTH = 24;

/** `join` -> { roomId, name }. Both fields are required. */
export function validateJoinPayload(payload, { maxNameLength = MAX_NAME_LENGTH } = {}) {
  const data = isPlainObject(payload) ? payload : {};

  const roomId = requireString(data.roomId ?? '', 'roomId', { min: 1, max: MAX_ROOM_ID_LENGTH }).toLowerCase();
  if (!ROOM_ID.test(roomId)) {
    throw new ValidationError('"roomId" may only contain a-z, 0-9, "-" and "_"', { field: 'roomId' });
  }

  const name = requireString(data.name ?? '', 'name', { min: 1, max: maxNameLength, pattern: SAFE_NAME });

  return { roomId, name };
}

/** Absurd magnitudes (1e300) are rejected outright rather than clamped. */
const MAX_COORDINATE = 1e6;

/**
 * `move` -> { x, y }. The server owns the position, so two independent guards
 * are applied to every accepted move:
 *
 *  bounds    — a coordinate outside the room is clamped into it, so no client
 *              can drive an avatar out of the floor plan;
 *  step      — the accepted position is at most `maxStepPx` away from the
 *              previous one, which is what makes teleporting impossible.
 *
 * @returns {{x:number,y:number,limited:boolean,outOfBounds:boolean}}
 */
export function validateMovePayload(payload, { room, previous, maxStepPx }) {
  const data = isPlainObject(payload) ? payload : {};

  const rawX = requireFiniteNumber(data.x, 'x', { min: -MAX_COORDINATE, max: MAX_COORDINATE });
  const rawY = requireFiniteNumber(data.y, 'y', { min: -MAX_COORDINATE, max: MAX_COORDINATE });

  let x = round2(clamp(rawX, 0, room.width));
  let y = round2(clamp(rawY, 0, room.height));
  const outOfBounds = x !== round2(rawX) || y !== round2(rawY);

  let limited = false;
  if (previous) {
    const dx = x - previous.x;
    const dy = y - previous.y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxStepPx) {
      // Keep the direction the client asked for, shorten the step.
      const ratio = maxStepPx / distance;
      x = round2(clamp(previous.x + dx * ratio, 0, room.width));
      y = round2(clamp(previous.y + dy * ratio, 0, room.height));
      limited = true;
    }
  }

  return { x, y, limited, outOfBounds };
}

export default validateJoinPayload;
