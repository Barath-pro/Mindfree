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

async function getBootstrappedApp() {
  bootstrapPromise ||= bootstrap();

  return bootstrapPromise;
}

export default async function handler(req, res) {
  try {
    const bootstrappedApp = await getBootstrappedApp();
    return bootstrappedApp(req, res);
  } catch (error) {
    logger.error("Failed to start Vercel backend", {
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
