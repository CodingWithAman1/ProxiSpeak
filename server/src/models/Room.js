/**
 * Virtual Space / Room Schema with acoustic zones, boundaries, and wall segments.
 */
import mongoose from 'mongoose';

const WallSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    x1: { type: Number, required: true },
    y1: { type: Number, required: true },
    x2: { type: Number, required: true },
    y2: { type: Number, required: true },
    material: {
      type: String,
      enum: ['glass', 'drywall', 'concrete', 'wood', 'soundproof'],
      default: 'drywall',
    },
    thickness: { type: Number, default: 2 },
    attenuationDb: { type: Number, default: 18 },
    cutoffFreq: { type: Number, default: 480 },
  },
  { _id: false }
);

const ZoneSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, default: '#3b82f6' },
    bounds: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    acousticProfile: {
      type: String,
      enum: ['standard', 'conference', 'quiet_booth', 'open_air', 'reverb_hall'],
      default: 'standard',
    },
  },
  { _id: false }
);

const RoomSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    roomId: { type: String, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    dimensions: {
      width: { type: Number, default: 100 },
      height: { type: Number, default: 100 },
    },
    spawnPoint: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 50 },
    },
    earshotDefault: { type: Number, default: 20 },
    walls: [WallSchema],
    zones: [ZoneSchema],
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
export default Room;
