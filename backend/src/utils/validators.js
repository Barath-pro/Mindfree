import { body, param } from "express-validator";

const roles = ["patient", "psychologist"];

export const registerValidator = [
  body("fullName").trim().isLength({ min: 2, max: 80 }),
  body("email").isEmail().normalizeEmail(),
  body("password").isStrongPassword({
    minLength: 8,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 0
  }),
  body("role").isIn(roles)
];

export const loginValidator = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 })
];

export const googleLoginValidator = [
  body("credential").isString().trim().notEmpty(),
  body("role").optional().isIn(roles)
];

export const createChatValidator = [body("participantId").isMongoId()];

export const chatIdParamValidator = [param("chatId").isUUID()];
export const messageIdParamValidator = [param("messageId").isUUID()];

export const sendMessageValidator = [
  ...chatIdParamValidator,
  body("content").trim().isLength({ min: 1, max: 2000 })
];

export const editMessageValidator = [
  ...chatIdParamValidator,
  ...messageIdParamValidator,
  body("content").trim().isLength({ min: 1, max: 2000 })
];
