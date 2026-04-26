import { v4 as uuidv4 } from "uuid";
import { ensureChatAccess } from "../services/chatService.js";
import { assertUserCanSendMessages, moderateMessage } from "../services/moderationService.js";
import { ApiError } from "../utils/ApiError.js";

export async function moderateIncomingText(req, res, next) {
  try {
    const content = req.body.content?.trim();

    if (!content) {
      throw new ApiError(400, "Message content is required");
    }

    await assertUserCanSendMessages(req.user._id);
    await ensureChatAccess(req.params.chatId, req.user._id);

    const messageId = uuidv4();
    // REST messages are moderated before they are stored or broadcast.
    const moderation = await moderateMessage({
      messageId,
      chatId: req.params.chatId,
      senderId: req.user._id,
      content,
      sourceType: "text"
    });

    req.moderation = moderation;
    req.generatedMessageId = messageId;

    if (moderation.actionTaken === "block") {
      return res.status(200).json({
        success: false,
        blocked: true,
        moderation
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}
