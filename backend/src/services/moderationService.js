import { withGoogleClient } from "../config/google.js";
import { ModerationLog } from "../models/ModerationLog.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { logModeration } from "./activityLogService.js";
import { runFallbackModeration } from "./fallbackModerationService.js";

const WARNING_THRESHOLD = Number(process.env.MODERATION_WARNING_THRESHOLD || 0.5);
const BLOCK_THRESHOLD = Number(process.env.MODERATION_BLOCK_THRESHOLD || 0.8);
const TEMP_BLOCK_MINUTES = Number(process.env.TEMP_BLOCK_MINUTES || 15);
const WARNINGS_BEFORE_TEMP_BLOCK = Number(process.env.WARNINGS_BEFORE_TEMP_BLOCK || 3);
const GOOGLE_MODERATION_TIMEOUT_MS = Number(process.env.GOOGLE_MODERATION_TIMEOUT_MS || 2500);
const GOOGLE_MODERATION_QUOTA_COOLDOWN_MS = Number(
  process.env.GOOGLE_MODERATION_QUOTA_COOLDOWN_MS || 300000
);
const GOOGLE_MODERATION_NETWORK_COOLDOWN_MS = Number(
  process.env.GOOGLE_MODERATION_NETWORK_COOLDOWN_MS || 30000
);

let googleModerationDisabledUntil = 0;
let lastFallbackReason = "";


function getTimeoutError() {
  const error = new Error(`Google moderation timed out after ${GOOGLE_MODERATION_TIMEOUT_MS}ms`);
  error.code = "moderation_timeout";
  return error;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(getTimeoutError()), timeoutMs);
    })
  ]);
}

function shouldUseFallbackImmediately() {
  return googleModerationDisabledUntil > Date.now();
}

function isQuotaLikeError(error) {
  const status = error?.status ?? error?.cause?.status;
  const code = error?.code ?? error?.cause?.code ?? error?.error?.code;
  const message = String(error?.message || "").toLowerCase();

  return (
    status === 429 ||
    code === "resource_exhausted" ||
    code === "rate_limit_exceeded" ||
    code === "insufficient_quota" ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource exhausted") ||
    message.includes("too many requests")
  );
}

function isConnectivityLikeError(error) {
  const code = error?.code ?? error?.cause?.code;
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "moderation_timeout" ||
    message.includes("connection error") ||
    message.includes("fetch failed") ||
    message.includes("network") ||
    message.includes("timed out")
  );
}

function temporarilyDisableGoogleModeration(error) {
  if (isQuotaLikeError(error)) {
    googleModerationDisabledUntil = Date.now() + GOOGLE_MODERATION_QUOTA_COOLDOWN_MS;
    lastFallbackReason = "quota_or_rate_limit";
    return;
  }

  if (isConnectivityLikeError(error)) {
    googleModerationDisabledUntil = Date.now() + GOOGLE_MODERATION_NETWORK_COOLDOWN_MS;
    lastFallbackReason = "network_or_timeout";
  }
}

function getFallbackAssessment(content, reason) {
  logModeration("moderation_provider_fallback", {
    provider: "google-gemini",
    reason
  });

  return runFallbackModeration(content);
}

function getDecision(assessment) {
  if (assessment.hasInappropriateWords || assessment.riskScore >= WARNING_THRESHOLD) {
    return {
      actionTaken: "warn",
      warningIssued: true,
      blockedReason: null
    };
  }

  return {
    actionTaken: "allow",
    warningIssued: false,
    blockedReason: null
  };
}

async function getModerationAssessment(content) {
  if (shouldUseFallbackImmediately()) {
    return getFallbackAssessment(
      content,
      `Google moderation temporarily disabled (${lastFallbackReason || "recent failure"})`
    );
  }

  try {
    const completion = await withTimeout(
      withGoogleClient(({ client }) =>
        client.models.generateContent({
          model: process.env.GOOGLE_MODERATION_MODEL || "gemini-2.5-flash-lite",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `You are a content moderation assistant. Analyze the user's message and return strict JSON with exactly these fields:
{
  "hasInappropriateWords": boolean,
  "riskScore": number,
  "flaggedCategories": string[]
}

Rules:
- Use 0.0 for clearly safe text.
- Use values closer to 1.0 for toxic, abusive, sexual abuse, self-harm, violent, or highly unsafe content.
- Return only JSON with no markdown.

User message:
${content}`
                }
              ]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        })
      ),
      GOOGLE_MODERATION_TIMEOUT_MS
    );

    const analysis = JSON.parse(completion.text);
    googleModerationDisabledUntil = 0;
    lastFallbackReason = "";
    
    return {
      hasInappropriateWords: !!analysis.hasInappropriateWords,
      riskScore: typeof analysis.riskScore === "number" ? analysis.riskScore : 0,
      flaggedCategories: Array.isArray(analysis.flaggedCategories) ? analysis.flaggedCategories : [],
      topCategory: analysis.flaggedCategories?.[0] || null,
      provider: "google-gemini"
    };
  } catch (error) {
    temporarilyDisableGoogleModeration(error);
    return getFallbackAssessment(content, error.message);
  }
}

export async function assertUserCanSendMessages(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isSuspended) {
    throw new ApiError(403, "Your account has been suspended indefinitely due to multiple policy violations.");
  }

  if (user.tempBlockedUntil && user.tempBlockedUntil > new Date()) {
    throw new ApiError(403, `Messaging temporarily blocked until ${user.tempBlockedUntil.toISOString()}`);
  }

  return user;
}

export async function moderateMessage({
  messageId,
  chatId,
  senderId,
  content,
  sourceType,
  transcript = null
}) {
  const assessment = await getModerationAssessment(content);
  const { riskScore, flaggedCategories, topCategory, provider, hasInappropriateWords } = assessment;
  const decision = getDecision(assessment);
  const user = await User.findById(senderId);

  if (!user) {
    throw new ApiError(404, "Sender not found");
  }

  if (decision.actionTaken === "warn") {
    user.warningCount += 1;

    if (user.warningCount >= 3) {
      user.isSuspended = true;
      decision.actionTaken = "block";
      decision.blockedReason = "Account has been suspended due to 3 warnings.";
      
      user.flagHistory.push({
        messageId,
        riskScore,
        actionTaken: "block",
        contentPreview: content.slice(0, 240)
      });
    } else {
      decision.actionTaken = "block"; // Block the offending message from being sent
      decision.blockedReason = `Warning ${user.warningCount} of 3: Your message contains inappropriate language and was not sent.`;

      user.flagHistory.push({
        messageId,
        riskScore,
        actionTaken: "warn",
        contentPreview: content.slice(0, 240)
      });
    }
  }

  await user.save();

  const moderationPayload = {
    riskScore,
    flaggedCategories,
    topCategory,
    provider,
    ...decision
  };

  await ModerationLog.create({
    messageId,
    chatId,
    senderId,
    sourceType,
    content,
    transcript,
    riskScore,
    actionTaken: moderationPayload.actionTaken,
    warningIssued: moderationPayload.warningIssued,
    blockedReason: moderationPayload.blockedReason,
    flaggedCategories,
    topCategory,
    provider
  });

  logModeration("message_moderated", {
    senderId: senderId.toString(),
    chatId,
    messageId,
    riskScore,
    actionTaken: moderationPayload.actionTaken,
    topCategory,
    provider
  });

  return moderationPayload;
}
