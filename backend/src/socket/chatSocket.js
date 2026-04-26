import { authenticateSocket } from "../middleware/authMiddleware.js";
import { createModeratedMessage, ensureChatAccess, getUserChats } from "../services/chatService.js";
import { logActivity } from "../services/activityLogService.js";

export function registerChatSocket(io) {
  io.use(authenticateSocket);

  io.on("connection", async (socket) => {
    const userId = socket.user._id;
    const chats = await getUserChats(userId);

    chats.forEach((chat) => socket.join(chat.chat_id));

    logActivity("socket_connected", {
      userId: userId.toString(),
      socketId: socket.id
    });

    socket.on("join-chat", async ({ chatId }, callback = () => {}) => {
      try {
        await ensureChatAccess(chatId, userId);
        socket.join(chatId);
        callback({ success: true });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    socket.on("send-message", async ({ chatId, content }, callback = () => {}) => {
      try {
        // Ack payloads tell the sender exactly how moderation resolved.
        const result = await createModeratedMessage({
          chatId,
          senderId: userId,
          content,
          messageType: "text"
        });

        if (!result.delivered) {
          callback({ success: false, blocked: true, moderation: result.moderation });
          return;
        }

        io.to(chatId).emit("message:new", result.message);

        if (result.moderation.warningIssued) {
          socket.emit("message:warning", {
            chatId,
            moderation: result.moderation
          });
        }

        callback({ success: true, message: result.message, moderation: result.moderation });
      } catch (error) {
        callback({ success: false, message: error.message });
      }
    });

    socket.on("disconnect", () => {
      logActivity("socket_disconnected", {
        userId: userId.toString(),
        socketId: socket.id
      });
    });
  });
}
