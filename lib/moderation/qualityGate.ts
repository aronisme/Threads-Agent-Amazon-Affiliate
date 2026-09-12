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

  let workingText = text.trim();

  // If text slightly exceeds Threads limit (500 chars), attempt graceful truncation to nearest complete sentence
  if (workingText.length > 500) {
    const candidate = workingText.substring(0, 480);
    const lastBoundary = Math.max(
      candidate.lastIndexOf('. '),
      candidate.lastIndexOf('! '),
      candidate.lastIndexOf('? '),
      candidate.lastIndexOf('.\n'),
      candidate.lastIndexOf('!\n'),
      candidate.lastIndexOf('?\n'),
      candidate.lastIndexOf('\n\n')
    );
    if (lastBoundary > 150) {
      workingText = candidate.substring(0, lastBoundary + 1).trim();
    }
  }

  // 1. Length check for Threads (Max 500 characters)
  if (workingText.length > 500) {
    reasons.push(`Text exceeds Threads 500-char limit (Length: ${workingText.length})`);
    score -= 40;
  }

  // 2. Check for commercial spam language
  for (const pattern of BANNED_PATTERNS) {
    if (pattern.test(workingText)) {
      reasons.push(`Detected marketing/spam pattern: ${pattern.toString()}`);
      score -= 30;
    }
  }

  // 3. Hashtag check (Threads favors 0-1 clean topic tags, not spam piles)
  const hashtags = workingText.match(/#[\w\d_]+/g) || [];
  if (hashtags.length > 2) {
    reasons.push(`Too many hashtags (${hashtags.length}). Real Threads users rarely use hashtags.`);
    score -= 25;
  }

  // 4. Excessive punctuation or all-caps check
  const capsCount = (workingText.match(/[A-Z]/g) || []).length;
  if (workingText.length > 20 && capsCount / workingText.length > 0.4) {
    reasons.push('Excessive uppercase characters detected.');
    score -= 20;
  }

  const exclamationCount = (workingText.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    reasons.push('Too many exclamation marks (screams marketer/bot).');
    score -= 15;
  }

  const passed = score >= 60;

  // 5. Clean Markdown formatting: Strip asterisks (*word* or **word**) since Threads does not support Markdown and renders literal asterisks
  const cleanText = workingText
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
