import app, { ensureBackendReady } from "../backend/server.js";
import { logger } from "../backend/src/utils/logger.js";

export default async function handler(req, res) {
  try {
    await ensureBackendReady();
    return app(req, res);
  } catch (error) {
    logger.error("Failed to start Vercel API", {
      error: error.message,
      stack: error.stack
    });

    res.statusCode = 500;
    return res.json({
      success: false,
      message: "Backend startup failed. Check Vercel environment variables and MongoDB Atlas access.",
      error: error.message
    });
  }
}
