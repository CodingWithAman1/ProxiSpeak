/**
 * Real-time User Presence Model with GeoJSON 2dsphere index for proximity querying.
 */
import mongoose from 'mongoose';

const UserPresenceSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    socketId: { type: String, required: true, index: true },
    roomId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: 'default' },
    color: { type: String, default: '#3b82f6' },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [x, y]
        required: true,
      },
    },
    orientation: { type: Number, default: 0 }, // angle in radians
    isSpeaking: { type: Boolean, default: false },
    isMuted: { type: Boolean, default: false },
    isDeafened: { type: Boolean, default: false },
    earshotRadius: { type: Number, default: 20 },
    lastSeen: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial proximity queries ($near, $geoWithin)
UserPresenceSchema.index({ location: '2dsphere', roomId: 1 });

/**
 * Finds all active users in a room within a given earshot radius.
 */
UserPresenceSchema.statics.findWithinEarshot = function (roomId, x, y, radius) {
  return this.find({
    roomId,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [x, y],
        },
        $maxDistance: radius,
      },
    },
  });
};

export const UserPresence = mongoose.models.UserPresence || mongoose.model('UserPresence', UserPresenceSchema);
export default UserPresence;
