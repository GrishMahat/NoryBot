// src/schemas/moderation.js

const mongoose = require('mongoose');

const moderationSchema = new mongoose.Schema({
  GuildID: {
    type: String,
    required: true,
    unique: true // Assuming each guild will have only one moderation configuration
  },
  // Define other moderation-related fields here as needed
});

module.exports = mongoose.model('Moderation', moderationSchema);
