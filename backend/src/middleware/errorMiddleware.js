import { logger } from "../utils/logger.js";

export function notFound(_req, res) {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
}

export function errorHandler(error, _req, res, _next) {
  logger.error(error.message, { stack: error.stack, details: error.details });

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Internal server error",
    details: error.details || null
  });
}

