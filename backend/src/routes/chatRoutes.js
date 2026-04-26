import { Router } from "express";
import {
  createChat,
  deleteMessage,
  editMessage,
  getMessages,
  getMySafetyStatus,
  listChats,
  listContacts,
  sendTextMessage,
  clearMessages,
  removeChat
} from "../controllers/chatController.js";
import { transcribeVoicePreview, uploadVoiceMessage } from "../controllers/voiceController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { moderateIncomingText } from "../middleware/messageModerationMiddleware.js";
import { uploadVoice } from "../middleware/uploadMiddleware.js";
import { handleValidation } from "../utils/validation.js";
import {
  chatIdParamValidator,
  createChatValidator,
  editMessageValidator,
  messageIdParamValidator,
  sendMessageValidator
} from "../utils/validators.js";

const router = Router();

router.use(requireAuth);
router.get("/contacts", listContacts);
router.get("/", listChats);
router.get("/safety/me", getMySafetyStatus);
router.post("/voice/transcribe-preview", uploadVoice.single("audio"), transcribeVoicePreview);
router.post("/", createChatValidator, handleValidation, createChat);
router.get("/:chatId/messages", chatIdParamValidator, handleValidation, getMessages);
router.post("/:chatId/messages", sendMessageValidator, handleValidation, moderateIncomingText, sendTextMessage);
router.patch("/:chatId/messages/:messageId", editMessageValidator, handleValidation, editMessage);
router.delete("/:chatId/messages/:messageId", [...chatIdParamValidator, ...messageIdParamValidator], handleValidation, deleteMessage);
router.delete("/:chatId/messages", chatIdParamValidator, handleValidation, clearMessages);
router.delete("/:chatId", chatIdParamValidator, handleValidation, removeChat);
router.post("/:chatId/voice", chatIdParamValidator, handleValidation, uploadVoice.single("audio"), uploadVoiceMessage);

export default router;
