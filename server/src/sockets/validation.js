/**
 * Payload validation for every event a client can send.
 *
 * Pure functions on purpose: they are the cheapest place to stop a malformed
 * or hostile payload, so they run before any database read/write and can be
 * unit tested without a server or a socket.
 */
import { ValidationError } from '../utils/errors.js';
import { isPlainObject, requireString } from '../utils/validate.js';

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

export default validateJoinPayload;
