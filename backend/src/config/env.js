import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(currentDir, "../../.env"),
  override: true
});

const requiredEnv = ["MONGODB_URI", "JWT_SECRET"];

export function getGoogleAuthClientIds() {
  return (process.env.GOOGLE_CLIENT_ID || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function validateEnv() {
  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getAllowedOrigins() {
  const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const expandedOrigins = new Set(configuredOrigins);

  for (const origin of configuredOrigins) {
    if (origin.includes("localhost")) {
      expandedOrigins.add(origin.replace("localhost", "127.0.0.1"));
    }

    if (origin.includes("127.0.0.1")) {
      expandedOrigins.add(origin.replace("127.0.0.1", "localhost"));
    }
  }

  return [...expandedOrigins];
}

export function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  return getAllowedOrigins().includes(origin);
}
