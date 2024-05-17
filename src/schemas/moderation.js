// src/schemas/moderation.js

import mongoose from 'mongoose';

const moderationSchema = new mongoose.Schema({
  GuildID: {
    type: String,
    required: true,
    unique: true // Assuming each guild will have only one moderation configuration
  },
  // Define other moderation-related fields here as needed
});

export default mongoose.model('Moderation', moderationSchema);
