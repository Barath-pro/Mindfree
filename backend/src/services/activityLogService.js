import { logger } from "../utils/logger.js";

export function logActivity(event, payload = {}) {
  logger.info("activity", { event, ...payload });
}

export function logModeration(event, payload = {}) {
  logger.warn("moderation", { event, ...payload });
}

