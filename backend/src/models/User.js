import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const flagHistorySchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true },
    riskScore: { type: Number, required: true },
    actionTaken: { type: String, enum: ["allow", "warn", "block"], required: true },
    contentPreview: { type: String, maxlength: 240 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80
    },
    role: {
      type: String,
      enum: ["patient", "psychologist", "admin"],
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    warningCount: {
      type: Number,
      default: 0
    },
    isSuspended: {
      type: Boolean,
      default: false
    },
    tempBlockedUntil: {
      type: Date,
      default: null
    },
    flagHistory: {
      type: [flagHistorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    warningCount: this.warningCount,
    isSuspended: this.isSuspended,
    tempBlockedUntil: this.tempBlockedUntil
  };
};

export const User = mongoose.model("User", userSchema);

