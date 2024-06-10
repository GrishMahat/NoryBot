import {Schema, model} from 'mongoose';

const imageSchema = new Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  userTag: {
    type: String,
    required: true,
  },
  approved: {
    type: Boolean,
    default: false,
  },
  approvedBy: {
    type: String,
    default: null,
  },
  addedBy: {
    type: String,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

export default model('Image', imageSchema);
