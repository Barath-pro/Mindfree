import bcrypt from "bcryptjs";
import app from "./src/app.js";
import { connectDatabase } from "./src/config/db.js";
import { validateEnv } from "./src/config/env.js";
import { User } from "./src/models/User.js";
import { logger } from "./src/utils/logger.js";

let isReady = false;
let startupError;

async function seedAdmin() {
  const existing = await User.findOne({ email: "admin@gmail.com" });

  if (!existing) {
    const passwordHash = await bcrypt.hash("Pine@pple17", 10);
    await User.create({
      fullName: "Platform Admin",
      email: "admin@gmail.com",
      role: "admin",
      passwordHash
    });
    logger.info("Admin user seeded.");
  }
}

async function bootstrap() {
  validateEnv();
  await connectDatabase();
  await seedAdmin();
  isReady = true;
}

app.get("/api/health", (_req, res) => {
  res.status(startupError ? 500 : 200).json({
    success: !startupError,
    status: startupError ? "startup_failed" : isReady ? "ok" : "starting",
    error: startupError?.message,
    timestamp: new Date().toISOString()
  });
});

bootstrap().catch((error) => {
  startupError = error;
  logger.error("Failed to start Vercel backend", {
    error: error.message,
    stack: error.stack
  });
});

export default app;
