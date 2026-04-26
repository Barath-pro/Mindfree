import { asyncHandler } from "../utils/asyncHandler.js";
import { ModerationLog } from "../models/ModerationLog.js";

export const getMyModerationLogs = asyncHandler(async (req, res) => {
  const logs = await ModerationLog.find({ senderId: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.status(200).json({ success: true, logs });
});

