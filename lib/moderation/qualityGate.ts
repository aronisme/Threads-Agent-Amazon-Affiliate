export interface QualityGateResult {
  passed: boolean;
  score: number; // 0-100
  reasons: string[];
  sanitizedText: string;
}

const BANNED_PATTERNS = [
  /click the link/i,
  /link in bio/i,
  /use code \w+/i,
  /\b(20|30|40|50|60|70)%\s*off\b/i,
  /#amazonfinds/i,
  /#musthave/i,
  /#affiliate/i,
  /#ad\b/i,
  /limited time deal/i,
  /swipe up/i,
  /hurry up/i,
];

export function runQualityGate(text: string): QualityGateResult {
  const reasons: string[] = [];
  let score = 95;

  if (!text || text.trim().length === 0) {
    return { passed: false, score: 0, reasons: ['Empty text'], sanitizedText: '' };
  }

  const trimmed = text.trim();

  // 1. Length check for Threads (Max 500 characters)
  if (trimmed.length > 500) {
    reasons.push(`Text exceeds Threads 500-char limit (Length: ${trimmed.length})`);
    score -= 40;
  }

  // 2. Check for commercial spam language
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(`Detected marketing/spam pattern: ${pattern.toString()}`);
      score -= 30;
    }
  }

  // 3. Hashtag check (Threads favors 0-1 clean topic tags, not spam piles)
  const hashtags = trimmed.match(/#[\w\d_]+/g) || [];
  if (hashtags.length > 2) {
    reasons.push(`Too many hashtags (${hashtags.length}). Real Threads users rarely use hashtags.`);
    score -= 25;
  }

  // 4. Excessive punctuation or all-caps check
  const capsCount = (trimmed.match(/[A-Z]/g) || []).length;
  if (trimmed.length > 20 && capsCount / trimmed.length > 0.4) {
    reasons.push('Excessive uppercase characters detected.');
    score -= 20;
  }

  const exclamationCount = (trimmed.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    reasons.push('Too many exclamation marks (screams marketer/bot).');
    score -= 15;
  }

  const passed = score >= 60;

  // 5. Clean Markdown formatting: Strip asterisks (*word* or **word**) since Threads does not support Markdown and renders literal asterisks
  const cleanText = trimmed
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/\*/g, '')
    .trim();

  return {
    passed,
    score: Math.max(0, score),
    reasons,
    sanitizedText: cleanText,
  };
}
