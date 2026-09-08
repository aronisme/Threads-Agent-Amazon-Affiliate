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
  /\(paid link\)/i,
  /\(commission earned\)/i,
  /\(ad\)/i,
  /#ad\b/i,
  /#sponsored\b/i,
  /#affiliate\b/i,
];

/**
 * Ensures text containing an affiliate link carries compliant disclosure.
 * Amazon Associates Operating Agreement mandates clear disclosure (e.g. "(paid link)").
 */
export function enforceDisclosure(text: string, isAffiliate: boolean = false): ComplianceResult {
  if (!isAffiliate) {
    return { text, hasDisclosure: false, disclosureTag: '' };
  }

  // Check if compliant disclosure already exists
  const alreadyCompliant = DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text));
  if (alreadyCompliant) {
    return { text, hasDisclosure: true, disclosureTag: 'EXISTING' };
  }

  // Programmatically append standard compliant disclosure
  const disclosureTag = '(paid link)';
  const trimmed = text.trim();
  const compliantText = `${trimmed} ${disclosureTag}`;

  return {
    text: compliantText,
    hasDisclosure: true,
    disclosureTag,
  };
}
