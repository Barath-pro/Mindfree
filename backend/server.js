import bcrypt from "bcryptjs";
import app from "./src/app.js";
import { connectDatabase } from "./src/config/db.js";
import { validateEnv } from "./src/config/env.js";
import { User } from "./src/models/User.js";
import { logger } from "./src/utils/logger.js";

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

let bootstrapPromise;

async function bootstrap() {
  validateEnv();
  await connectDatabase();
  await seedAdmin();
  return app;
}

bootstrapPromise ||= bootstrap().catch((error) => {
  logger.error("Failed to start Vercel backend", {
    error: error.message,
    stack: error.stack
  });
  throw error;
});

await bootstrapPromise;

export default app;
