import mongoose from "mongoose";

const moderationLogSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      index: true
    },
    chatId: {
      type: String,
      required: true,
      index: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sourceType: {
      type: String,
      enum: ["text", "voice"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    transcript: {
      type: String,
      default: null
    },
    riskScore: {
      type: Number,
      required: true
    },
    actionTaken: {
      type: String,
      enum: ["allow", "warn", "block"],
      required: true
    },
    warningIssued: {
      type: Boolean,
      default: false
    },
    blockedReason: {
      type: String,
      default: null
    },
    flaggedCategories: {
      type: [String],
      default: []
    },
    topCategory: {
      type: String,
      default: null
    },
    provider: {
      type: String,
      default: "google-gemini"
    }
  },
  {
    timestamps: true
  }
);

export const ModerationLog = mongoose.model("ModerationLog", moderationLogSchema);
