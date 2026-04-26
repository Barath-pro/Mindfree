import "./env.js";
import { GoogleGenAI } from "@google/genai";

const PLACEHOLDER_KEYS = new Set(["google-dev-placeholder", "your-google-api-key"]);

function normalizeApiKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || PLACEHOLDER_KEYS.has(normalized)) {
    return null;
  }

  return normalized;
}

const configuredApiKey = normalizeApiKey(process.env.GOOGLE_API_KEY);
const googleClient = configuredApiKey ? new GoogleGenAI({ apiKey: configuredApiKey }) : null;

export function hasGoogleClients() {
  return Boolean(googleClient);
}

export function getGoogleClient() {
  if (!hasGoogleClients()) {
    return {
      client: null,
      clientCount: 0
    };
  }

  return {
    client: googleClient,
    clientCount: 1
  };
}

export async function withGoogleClient(operation) {
  if (!hasGoogleClients()) {
    throw new Error("No Google API key configured.");
  }

  const { client, clientCount } = getGoogleClient();
  return operation({
    attempt: 0,
    client,
    clientCount
  });
}
