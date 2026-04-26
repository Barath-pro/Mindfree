import { asyncHandler } from "../utils/asyncHandler.js";
import {
  createModeratedMessage,
  getAvailableContacts,
  getChatMessages,
  getFlagHistory,
  getOrCreateChat,
  storeApprovedMessage,
  getUserChats,
  clearChatMessages,
  deleteChat,
  updateChatMessage,
  deleteChatMessage
} from "../services/chatService.js";

export const listContacts = asyncHandler(async (req, res) => {
  const contacts = await getAvailableContacts(req.user);
  res.status(200).json({ success: true, contacts });
});

export const createChat = asyncHandler(async (req, res) => {
  const chat = await getOrCreateChat(req.user._id, req.body.participantId);
  res.status(200).json({ success: true, chat });
});

export const listChats = asyncHandler(async (req, res) => {
  const chats = await getUserChats(req.user._id);
  res.status(200).json({ success: true, chats });
});

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await getChatMessages(req.params.chatId, req.user._id);
  res.status(200).json({ success: true, messages });
});

export const sendTextMessage = asyncHandler(async (req, res) => {
  const result = req.moderation
    ? await storeApprovedMessage({
        messageId: req.generatedMessageId,
        chatId: req.params.chatId,
        senderId: req.user._id,
        content: req.body.content,
        messageType: "text",
        moderation: req.moderation
      })
    : await createModeratedMessage({
        chatId: req.params.chatId,
        senderId: req.user._id,
        content: req.body.content,
        messageType: "text"
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

export const getMySafetyStatus = asyncHandler(async (req, res) => {
  const data = await getFlagHistory(req.user._id);
  res.status(200).json({ success: true, ...data });
});

export const clearMessages = asyncHandler(async (req, res) => {
  await clearChatMessages(req.params.chatId, req.user._id);
  res.status(200).json({ success: true, message: "Chat cleared successfully" });
});

export const removeChat = asyncHandler(async (req, res) => {
  await deleteChat(req.params.chatId, req.user._id);
  res.status(200).json({ success: true, message: "Chat removed successfully" });
});

export const editMessage = asyncHandler(async (req, res) => {
  const result = await updateChatMessage({
    chatId: req.params.chatId,
    messageId: req.params.messageId,
    userId: req.user._id,
    content: req.body.content
  });

  if (result.delivered) {
    req.app.get("io").to(req.params.chatId).emit("message:update", result.message);
  }

  res.status(200).json({
    success: result.delivered,
    blocked: !result.delivered && result.moderation?.actionTaken === "block",
    ...result
  });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const result = await deleteChatMessage({
    chatId: req.params.chatId,
    messageId: req.params.messageId,
    userId: req.user._id
  });

  req.app.get("io").to(req.params.chatId).emit("message:delete", {
    chat_id: req.params.chatId,
    message_id: req.params.messageId
  });

  res.status(200).json(result);
});
