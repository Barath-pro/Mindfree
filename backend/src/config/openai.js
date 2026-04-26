import "./env.js";
import OpenAI from "openai";

const PLACEHOLDER_KEYS = new Set(["sk-dev-placeholder", "sk-your-openai-key"]);

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

function parseApiKeys(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\r\n,]+/)
    .map(normalizeApiKey)
    .filter(Boolean);
}

const configuredApiKeys = [
  ...new Set([
    ...parseApiKeys(process.env.OPENAI_API_KEYS),
    normalizeApiKey(process.env.OPENAI_API_KEY)
  ].filter(Boolean))
];

const openaiClients = configuredApiKeys.map((apiKey) => new OpenAI({ apiKey }));

let nextClientIndex = 0;

export const openaiClientCount = openaiClients.length;

export function hasOpenAIClients() {
  return openaiClientCount > 0;
}

export function getOpenAIClient() {
  if (!hasOpenAIClients()) {
    return {
      client: null,
      clientCount: 0,
      clientIndex: -1
    };
  }

  const clientIndex = nextClientIndex;
  const client = openaiClients[clientIndex];

  nextClientIndex = (nextClientIndex + 1) % openaiClientCount;

  return {
    client,
    clientCount: openaiClientCount,
    clientIndex
  };
}

function shouldRetryWithNextClient(error) {
  const status = error?.status ?? error?.cause?.status;
  const code = error?.code ?? error?.cause?.code ?? error?.error?.code;
  const message = String(error?.message || "").toLowerCase();

  return (
    status === 429 ||
    code === "rate_limit_exceeded" ||
    code === "insufficient_quota" ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("quota")
  );
}

export async function withOpenAIClient(operation) {
  if (!hasOpenAIClients()) {
    throw new Error("No OpenAI API keys configured.");
  }

  let lastError;

  for (let attempt = 0; attempt < openaiClientCount; attempt += 1) {
    const { client, clientCount, clientIndex } = getOpenAIClient();

    try {
      return await operation({
        attempt,
        client,
        clientCount,
        clientIndex
      });
    } catch (error) {
      lastError = error;

      if (!shouldRetryWithNextClient(error) || attempt === openaiClientCount - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}
