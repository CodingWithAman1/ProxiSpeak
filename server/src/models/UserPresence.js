import mongoose from 'mongoose';

const UserPresenceSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#06b6d4',
    },
    // GeoJSON Point for 2dsphere proximity & earshot calculations
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [x, y]
        required: true,
        default: [505, 120],
      },
    },
    currentRoom: {
      type: String,
      default: 'corridor',
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isDeafened: {
      type: Boolean,
      default: false,
    },
    isSpeaking: {
      type: Boolean,
      default: false,
    },
    isSeated: {
      type: Boolean,
      default: false,
    },
    earshotRadius: {
      type: Number,
      default: 150,
    },
    socketId: {
      type: String,
      default: null,
      index: true,
    },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for MongoDB geospatial queries ($near, $geoWithin, $geoNear)
UserPresenceSchema.index({ location: '2dsphere' });

export const UserPresence = mongoose.models.UserPresence || mongoose.model('UserPresence', UserPresenceSchema);
export default UserPresence;
