import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info("MongoDB connected");
}

