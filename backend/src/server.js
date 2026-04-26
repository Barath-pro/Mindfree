import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { isAllowedOrigin, validateEnv } from "./config/env.js";
import { registerChatSocket } from "./socket/chatSocket.js";
import { logger } from "./utils/logger.js";
import { User } from "./models/User.js";
import bcrypt from "bcryptjs";

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

  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true
    }
  });

  app.set("io", io);
  registerChatSocket(io);

  const port = Number(process.env.PORT || 5000);

  server.listen(port, () => {
    logger.info(`Server listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  logger.error("Failed to start server", { error: error.message, stack: error.stack });
  process.exit(1);
});
