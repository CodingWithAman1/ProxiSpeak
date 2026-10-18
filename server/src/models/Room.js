import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#38bdf8',
    },
    bounds: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      w: { type: Number, required: true },
      h: { type: Number, required: true },
    },
    doorId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
export default Room;
