const { v4: uuidv4 } = require("uuid");
const { Schema, model } = require("mongoose");

const suggestionSchema = new Schema(
  {
    suggestionId: {
      type: String,
      default: uuidv4,
    },
    authorID: {
      type: String,
      required: true,
    },
    guildID: {
      type: String,
      required: true,
    },
    messageId: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      default: "pending",
    },
    upvotes: {
      type: [String],
      default: [],
    },
    downvotes: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = model("Suggestion", suggestionSchema);
