/**
 * Amazon Associates & FTC Compliance Layer
 * Programmatically guarantees that affiliate links have compliant disclosure
 * so LLMs cannot drop or omit required legal notices.
 */

export interface ComplianceResult {
  text: string;
  hasDisclosure: boolean;
  disclosureTag: string;
}

const DISCLOSURE_PATTERNS = [
  /#ad\b/i,
  /\(paid link\)/i,
  /\(commission earned\)/i,
  /\(ad\)/i,
  /#sponsored\b/i,
  /#affiliate\b/i,
];

/**
 * Ensures text containing an affiliate link carries compliant disclosure.
 * FTC & Amazon Associates allow standard hashtag '#ad' on social media platforms.
 */
export function enforceDisclosure(text: string, isAffiliate: boolean = false, customTag: string = '#ad'): ComplianceResult {
  if (!isAffiliate) {
    return { text, hasDisclosure: false, disclosureTag: '' };
  }

  // Check if compliant disclosure already exists
  const alreadyCompliant = DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text));
  if (alreadyCompliant) {
    return { text, hasDisclosure: true, disclosureTag: 'EXISTING' };
  }

  // Programmatically append standard compliant disclosure (#ad)
  const disclosureTag = customTag || '#ad';
  const trimmed = text.trim();
  const compliantText = `${trimmed} ${disclosureTag}`;

  return {
    text: compliantText,
    hasDisclosure: true,
    disclosureTag,
  };
}
