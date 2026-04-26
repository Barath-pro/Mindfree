import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { Chat } from "../models/Chat.js";
import { Message } from "../models/Message.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { logActivity } from "./activityLogService.js";
import { assertUserCanSendMessages, moderateMessage } from "./moderationService.js";

function mapMessage(message) {
  const sender = message.senderId?._id ? message.senderId.toSafeObject() : null;
  const senderId = message.senderId?._id ? message.senderId._id.toString() : message.senderId.toString();

  return {
    id: message._id.toString(),
    message_id: message.messageId,
    chat_id: message.chatId,
    sender_id: senderId,
    sender,
    timestamp: message.timestamp,
    content: message.content,
    transcript: message.transcript,
    audioUrl: message.audioUrl,
    messageType: message.messageType,
    moderation_status: message.moderationStatus,
    editedAt: message.editedAt
  };
}

async function refreshChatLastMessage(chatId) {
  const lastMessage = await Message.findOne({ chatId }).sort({ timestamp: -1 });

  await Chat.findOneAndUpdate(
    { chatId },
    { lastMessageAt: lastMessage?.timestamp || new Date() }
  );

  return lastMessage;
}

function mapChat(chat, currentUserId, lastMessage = null) {
  const counterpart = chat.participants.find(
    (participant) => participant._id.toString() !== currentUserId.toString()
  );

  return {
    id: chat._id.toString(),
    chat_id: chat.chatId,
    participants: chat.participants.map((participant) => participant.toSafeObject()),
    counterpart: counterpart ? counterpart.toSafeObject() : null,
    lastMessageAt: chat.lastMessageAt,
    lastMessage
  };
}

export async function getAvailableContacts(currentUser) {
  const counterpartRole = currentUser.role === "patient" ? "psychologist" : "patient";
  const contacts = await User.find({ role: counterpartRole }).sort({ fullName: 1 });
  return contacts.map((user) => user.toSafeObject());
}

export async function getOrCreateChat(currentUserId, participantId) {
  if (currentUserId.toString() === participantId.toString()) {
    throw new ApiError(400, "You cannot create a chat with yourself");
  }

  const [currentUser, participant] = await Promise.all([
    User.findById(currentUserId),
    User.findById(participantId)
  ]);

  if (!currentUser || !participant) {
    throw new ApiError(404, "Participant not found");
  }

  if (currentUser.role === participant.role) {
    throw new ApiError(400, "Chats must be between a patient and a psychologist");
  }

  let chat = await Chat.findOne({
    participants: { $all: [currentUserId, participantId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] }
  }).populate("participants");

  if (!chat) {
    chat = await Chat.create({
      chatId: uuidv4(),
      participants: [currentUserId, participantId]
    });
    chat = await chat.populate("participants");
  }

  logActivity("chat_opened", {
    userId: currentUserId.toString(),
    participantId: participantId.toString(),
    chatId: chat.chatId
  });

  return mapChat(chat, currentUserId);
}

export async function getUserChats(userId) {
  const chats = await Chat.find({ participants: userId })
    .populate("participants")
    .sort({ lastMessageAt: -1 });

  const results = [];

  for (const chat of chats) {
    const lastMessage = await Message.findOne({ chatId: chat.chatId })
      .sort({ timestamp: -1 })
      .populate("senderId");

    results.push(mapChat(chat, userId, lastMessage ? mapMessage(lastMessage) : null));
  }

  return results;
}

export async function ensureChatAccess(chatId, userId) {
  const chat = await Chat.findOne({ chatId }).populate("participants");

  if (!chat) {
    throw new ApiError(404, "Chat not found");
  }

  const hasAccess = chat.participants.some((participant) => participant._id.toString() === userId.toString());

  if (!hasAccess) {
    throw new ApiError(403, "You do not have access to this chat");
  }

  return chat;
}

export async function getChatMessages(chatId, userId) {
  await ensureChatAccess(chatId, userId);

  const messages = await Message.find({ chatId }).populate("senderId").sort({ timestamp: 1 });
  return messages.map(mapMessage);
}

export async function createModeratedMessage({
  chatId,
  senderId,
  content,
  messageType = "text",
  transcript = null,
  audioUrl = null
}) {
  await assertUserCanSendMessages(senderId);
  await ensureChatAccess(chatId, senderId);

  const messageId = uuidv4();
  const moderation = await moderateMessage({
    messageId,
    chatId,
    senderId,
    content,
    sourceType: messageType,
    transcript
  });

  if (moderation.actionTaken === "block") {
    return {
      delivered: false,
      message: null,
      moderation
    };
  }

  return storeApprovedMessage({
    messageId,
    chatId,
    senderId,
    content,
    messageType,
    transcript,
    audioUrl,
    moderation
  });
}

export async function storeApprovedMessage({
  messageId,
  chatId,
  senderId,
  content,
  messageType = "text",
  transcript = null,
  audioUrl = null,
  moderation
}) {
  await ensureChatAccess(chatId, senderId);

  const message = await Message.create({
    messageId,
    chatId,
    senderId,
    content,
    transcript,
    audioUrl,
    messageType,
    moderationStatus: moderation
  });

  await Chat.findOneAndUpdate({ chatId }, { lastMessageAt: new Date() });

  const populatedMessage = await Message.findById(message._id).populate("senderId");

  logActivity("message_created", {
    chatId,
    senderId: senderId.toString(),
    messageId,
    messageType
  });

  return {
    delivered: true,
    message: mapMessage(populatedMessage),
    moderation
  };
}

export async function getFlagHistory(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    warningCount: user.warningCount,
    tempBlockedUntil: user.tempBlockedUntil,
    flags: [...user.flagHistory].sort((a, b) => b.createdAt - a.createdAt)
  };
}

export async function clearChatMessages(chatId, userId) {
  await ensureChatAccess(chatId, userId);
  await Message.deleteMany({ chatId });
  await Chat.findOneAndUpdate({ chatId }, { lastMessageAt: new Date() });
}

export async function deleteChat(chatId, userId) {
  const chat = await ensureChatAccess(chatId, userId);
  await Message.deleteMany({ chatId });
  await Chat.findByIdAndDelete(chat._id);
}

export async function updateChatMessage({ chatId, messageId, userId, content }) {
  await ensureChatAccess(chatId, userId);

  const message = await Message.findOne({ chatId, messageId }).populate("senderId");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.senderId._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only edit your own messages");
  }

  if (message.messageType !== "text") {
    throw new ApiError(400, "Only text messages can be edited");
  }

  const moderation = await moderateMessage({
    messageId,
    chatId,
    senderId: userId,
    content,
    sourceType: "text"
  });

  if (moderation.actionTaken === "block") {
    return {
      delivered: false,
      message: null,
      moderation
    };
  }

  message.content = content;
  message.transcript = null;
  message.audioUrl = null;
  message.moderationStatus = moderation;
  message.editedAt = new Date();
  await message.save();

  const updatedMessage = await Message.findById(message._id).populate("senderId");

  logActivity("message_updated", {
    chatId,
    senderId: userId.toString(),
    messageId
  });

  return {
    delivered: true,
    message: mapMessage(updatedMessage),
    moderation
  };
}

export async function deleteChatMessage({ chatId, messageId, userId }) {
  await ensureChatAccess(chatId, userId);

  const message = await Message.findOne({ chatId, messageId }).populate("senderId");

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.senderId._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  await Message.deleteOne({ _id: message._id });

  if (message.audioUrl) {
    const relativeAudioPath = message.audioUrl.replace(/^\//, "");
    await fs.unlink(path.resolve(relativeAudioPath)).catch(() => {});
  }

  await refreshChatLastMessage(chatId);

  logActivity("message_deleted", {
    chatId,
    senderId: userId.toString(),
    messageId,
    messageType: message.messageType
  });

  return {
    success: true,
    messageId,
    chatId
  };
}
