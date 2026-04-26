import mongoose from "mongoose";

const moderationStatusSchema = new mongoose.Schema(
  {
    riskScore: { type: Number, required: true },
    actionTaken: { type: String, enum: ["allow", "warn", "block"], required: true },
    warningIssued: { type: Boolean, default: false },
    flaggedCategories: { type: [String], default: [] },
    topCategory: { type: String, default: null },
    blockedReason: { type: String, default: null },
    provider: { type: String, default: "google-gemini" }
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      unique: true,
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
    messageType: {
      type: String,
      enum: ["text", "voice"],
      default: "text"
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000
    },
    transcript: {
      type: String,
      default: null
    },
    audioUrl: {
      type: String,
      default: null
    },
    moderationStatus: {
      type: moderationStatusSchema,
      required: true
    },
    editedAt: {
      type: Date,
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ chatId: 1, timestamp: 1 });

export const Message = mongoose.model("Message", messageSchema);
