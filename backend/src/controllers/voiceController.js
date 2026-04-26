import fs from "fs/promises";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createModeratedMessage, ensureChatAccess } from "../services/chatService.js";
import { transcribeAudio } from "../services/transcriptionService.js";

export const uploadVoiceMessage = asyncHandler(async (req, res) => {
  await ensureChatAccess(req.params.chatId, req.user._id);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Voice file is required"
    });
  }

  const transcript = await transcribeAudio(req.file.path);
  const result = await createModeratedMessage({
    chatId: req.params.chatId,
    senderId: req.user._id,
    content: transcript,
    transcript,
    audioUrl: `/uploads/voice/${req.file.filename}`,
    messageType: "voice"
  });

  if (result.delivered) {
    req.app.get("io").to(req.params.chatId).emit("message:new", result.message);
  }

  res.status(200).json({
    success: result.delivered,
    blocked: !result.delivered && result.moderation?.actionTaken === "block",
    ...result
  });
});

export const transcribeVoicePreview = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Voice file is required"
    });
  }

  try {
    const transcript = await transcribeAudio(req.file.path);

    res.status(200).json({
      success: true,
      transcript
    });
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }
});
