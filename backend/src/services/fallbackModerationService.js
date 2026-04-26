const HIGH_RISK_PATTERNS = [
  /\bkill\b/i,
  /\bsuicide\b/i,
  /\bself harm\b/i,
  /\boverdose\b/i,
  /\bshoot\b/i,
  /\bstab\b/i,
  /\bsexual abuse\b/i,
  /\brape\b/i,
  /\bfuck\b/i,
  /\bshit\b/i,
  /\bbitch\b/i,
  /\basshole\b/i
];

const MEDIUM_RISK_PATTERNS = [
  /\bhate you\b/i,
  /\bworthless\b/i,
  /\bpanic attack\b/i,
  /\bdepressed\b/i,
  /\bcutting\b/i,
  /\bhurt myself\b/i,
  /\bwant to die\b/i
];

export function runFallbackModeration(content) {
  const normalizedContent = content.trim();
  let riskScore = 0.12;
  let flaggedCategories = [];
  let topCategory = "fallback_safe";

  if (HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalizedContent))) {
    riskScore = 0.92;
    flaggedCategories = ["self-harm-or-violence"];
    topCategory = "fallback_high_risk";
  } else if (MEDIUM_RISK_PATTERNS.some((pattern) => pattern.test(normalizedContent))) {
    riskScore = 0.64;
    flaggedCategories = ["mental-health-risk"];
    topCategory = "fallback_medium_risk";
  }

  return {
    hasInappropriateWords: riskScore > 0.5,
    riskScore,
    flaggedCategories,
    topCategory,
    provider: "fallback"
  };
}
