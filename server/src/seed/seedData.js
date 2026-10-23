/**
 * Default Seed Environments & Rooms
 * Provides rich virtual spaces with acoustic zones, walls, and spawn points.
 */
import Room from '../models/Room.js';
import { spatialStore } from '../services/spatialEngine.js';
import logger from '../utils/logger.js';

export const DEFAULT_ROOMS = [
  {
    slug: 'central-plaza',
    roomId: 'central-plaza',
    name: 'ProxiSpeak Central Plaza',
    description: 'Vibrant open-plan collaboration hub with breakout booths and acoustic partitions.',
    dimensions: { width: 120, height: 100 },
    spawnPoint: { x: 60, y: 50 },
    earshotDefault: 22,
    zones: [
      {
        id: 'lounge',
        name: 'Central Social Lounge',
        color: 'rgba(59, 130, 246, 0.15)',
        bounds: { x: 45, y: 35, width: 30, height: 30 },
        acousticProfile: 'standard',
      },
      {
        id: 'stage',
        name: 'Keynote Stage',
        color: 'rgba(168, 85, 247, 0.15)',
        bounds: { x: 45, y: 5, width: 30, height: 20 },
        acousticProfile: 'reverb_hall',
      },
      {
        id: 'booth1',
        name: 'Private Studio A',
        color: 'rgba(16, 185, 129, 0.15)',
        bounds: { x: 8, y: 15, width: 24, height: 30 },
        acousticProfile: 'quiet_booth',
      },
      {
        id: 'booth2',
        name: 'Private Studio B',
        color: 'rgba(16, 185, 129, 0.15)',
        bounds: { x: 8, y: 55, width: 24, height: 30 },
        acousticProfile: 'quiet_booth',
      },
      {
        id: 'cafe',
        name: 'Acoustic Coffee Bar',
        color: 'rgba(245, 158, 11, 0.15)',
        bounds: { x: 88, y: 30, width: 24, height: 40 },
        acousticProfile: 'standard',
      },
    ],
    walls: [
      // Studio A walls (with doorway)
      { id: 'w1', x1: 8, y1: 15, x2: 32, y2: 15, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w2', x1: 8, y1: 15, x2: 8, y2: 45, material: 'concrete', thickness: 3, attenuationDb: 30, cutoffFreq: 300 },
      { id: 'w3', x1: 8, y1: 45, x2: 32, y2: 45, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w4', x1: 32, y1: 15, x2: 32, y2: 25, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w5', x1: 32, y1: 35, x2: 32, y2: 45, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },

      // Studio B walls (with doorway)
      { id: 'w6', x1: 8, y1: 55, x2: 32, y2: 55, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w7', x1: 8, y1: 55, x2: 8, y2: 85, material: 'concrete', thickness: 3, attenuationDb: 30, cutoffFreq: 300 },
      { id: 'w8', x1: 8, y1: 85, x2: 32, y2: 85, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w9', x1: 32, y1: 55, x2: 32, y2: 65, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },
      { id: 'w10', x1: 32, y1: 75, x2: 32, y2: 85, material: 'glass', thickness: 2, attenuationDb: 22, cutoffFreq: 400 },

      // Coffee Bar partition
      { id: 'w11', x1: 88, y1: 30, x2: 88, y2: 45, material: 'wood', thickness: 2, attenuationDb: 14, cutoffFreq: 650 },
      { id: 'w12', x1: 88, y1: 55, x2: 88, y2: 70, material: 'wood', thickness: 2, attenuationDb: 14, cutoffFreq: 650 },
    ],
  },
  {
    slug: 'cyber-hub',
    roomId: 'cyber-hub',
    name: 'Neon Tech Hub',
    description: 'High-tech collaborative office with sound-dampened meeting pods and presentation arena.',
    dimensions: { width: 100, height: 100 },
    spawnPoint: { x: 50, y: 50 },
    earshotDefault: 18,
    zones: [
      {
        id: 'war-room',
        name: 'Executive War Room',
        color: 'rgba(239, 68, 68, 0.15)',
        bounds: { x: 10, y: 10, width: 35, height: 35 },
        acousticProfile: 'conference',
      },
      {
        id: 'dev-pit',
        name: 'Open Engineering Pit',
        color: 'rgba(59, 130, 246, 0.15)',
        bounds: { x: 55, y: 10, width: 35, height: 40 },
        acousticProfile: 'standard',
      },
      {
        id: 'zen-zone',
        name: 'Acoustic Zen Lounge',
        color: 'rgba(16, 185, 129, 0.15)',
        bounds: { x: 20, y: 60, width: 60, height: 30 },
        acousticProfile: 'quiet_booth',
      },
    ],
    walls: [
      // War room full acoustic insulation
      { id: 'ch_w1', x1: 10, y1: 10, x2: 45, y2: 10, material: 'soundproof', thickness: 3, attenuationDb: 28, cutoffFreq: 350 },
      { id: 'ch_w2', x1: 10, y1: 10, x2: 10, y2: 45, material: 'soundproof', thickness: 3, attenuationDb: 28, cutoffFreq: 350 },
      { id: 'ch_w3', x1: 10, y1: 45, x2: 45, y2: 45, material: 'soundproof', thickness: 3, attenuationDb: 28, cutoffFreq: 350 },
      { id: 'ch_w4', x1: 45, y1: 10, x2: 45, y2: 22, material: 'soundproof', thickness: 3, attenuationDb: 28, cutoffFreq: 350 },
      { id: 'ch_w5', x1: 45, y1: 32, x2: 45, y2: 45, material: 'soundproof', thickness: 3, attenuationDb: 28, cutoffFreq: 350 },
    ],
  },
  {
    slug: 'campus-quad',
    roomId: 'campus-quad',
    name: 'Global Innovation Quad',
    description: 'Expansive outdoor campus grounds with open amphitheater and study pavilion.',
    dimensions: { width: 140, height: 120 },
    spawnPoint: { x: 70, y: 60 },
    earshotDefault: 25,
    zones: [
      {
        id: 'amphi',
        name: 'Sunken Amphitheater',
        color: 'rgba(234, 179, 8, 0.15)',
        bounds: { x: 45, y: 40, width: 50, height: 40 },
        acousticProfile: 'open_air',
      },
      {
        id: 'library-pod',
        name: 'Silent Library Pavilion',
        color: 'rgba(99, 102, 241, 0.15)',
        bounds: { x: 15, y: 15, width: 30, height: 35 },
        acousticProfile: 'quiet_booth',
      },
    ],
    walls: [
      { id: 'cq_w1', x1: 15, y1: 15, x2: 45, y2: 15, material: 'concrete', thickness: 3, attenuationDb: 32, cutoffFreq: 250 },
      { id: 'cq_w2', x1: 15, y1: 15, x2: 15, y2: 50, material: 'concrete', thickness: 3, attenuationDb: 32, cutoffFreq: 250 },
      { id: 'cq_w3', x1: 15, y1: 50, x2: 45, y2: 50, material: 'concrete', thickness: 3, attenuationDb: 32, cutoffFreq: 250 },
      { id: 'cq_w4', x1: 45, y1: 15, x2: 45, y2: 28, material: 'concrete', thickness: 3, attenuationDb: 32, cutoffFreq: 250 },
      { id: 'cq_w5', x1: 45, y1: 38, x2: 45, y2: 50, material: 'concrete', thickness: 3, attenuationDb: 32, cutoffFreq: 250 },
    ],
  },
];

/**
 * Seeds default rooms into database and in-memory spatial cache.
 */
export async function seedRooms() {
  for (const roomData of DEFAULT_ROOMS) {
    spatialStore.setRoomWalls(roomData.slug, roomData.walls);

    try {
      if (Room.db && Room.db.readyState === 1) {
        await Room.findOneAndUpdate(
          { $or: [{ slug: roomData.slug }, { roomId: roomData.slug }] },
          roomData,
          { upsert: true, returnDocument: 'after' }
        );
      }
    } catch (err) {
      logger.warn(`Could not seed room ${roomData.slug} to DB: ${err.message}`);
    }
  }
  logger.info(`Initialized ${DEFAULT_ROOMS.length} spatial environments.`);
}

export default seedRooms;
