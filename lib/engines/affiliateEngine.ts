import { AffiliateMode, IProduct, IAgentState } from '@/types';
import Product from '@/db/models/Product';
import connectToDatabase from '@/db/client';

export interface CommercialEvaluation {
  intentScore: number;       // 0.0 - 1.0
  relevanceScore: number;    // 0.0 - 1.0
  affiliateMode: AffiliateMode;
  matchedProduct: IProduct | null;
  reason: string;
}

// Regex patterns for detecting explicit commercial intent
const HIGH_INTENT_PATTERNS = [
  /where\s+(?:can\s+i|did\s+you|you\s+did|you|d\s+you|to)?\s*(?:get|buy|find|found|got|cop)\b/i,
  /amazon\s+link\b/i,
  /what\s+(is\s+the\s+link|link|brand|model|product)\b/i,
  /which\s+(one|brand|model)\b/i,
  /drop\s+the\s+link\b/i,
  /link\s+(please|pls)\b/i,
  /recommend\s+(me|a|any)\b/i,
  /what\s+(do\s+you\s+use|are\s+you\s+using)\b/i,
  /send\s+link\b/i,
  /w2c\b/i,
];

const MEDIUM_INTENT_PATTERNS = [
  /need\s+(to\s+buy|a\s+good|to\s+upgrade|new)\b/i,
  /looking\s+for\s+(a|an|some)\b/i,
  /any\s+suggestions\s+for\b/i,
  /what\s+do\s+you\s+think\s+of\b/i,
  /worth\s+(buying|getting)\b/i,
  /budget\s+under\b/i,
];

export class AffiliateEngine {
  /**
   * Score the commercial intent of an incoming text string (0.0 to 1.0)
   */
  public evaluateCommercialIntent(text: string): number {
    if (!text || text.trim().length === 0) return 0.0;
    const clean = text.toLowerCase();

    // Check high intent patterns
    for (const pattern of HIGH_INTENT_PATTERNS) {
      if (pattern.test(clean)) {
        return 0.95;
      }
    }

    // Check medium intent patterns
    for (const pattern of MEDIUM_INTENT_PATTERNS) {
      if (pattern.test(clean)) {
        return 0.65;
      }
    }

    // Keyword heuristics
    if (clean.includes('buy') || clean.includes('purchase') || clean.includes('price')) {
      return 0.55;
    }

    if (clean.includes('cable') || clean.includes('desk') || clean.includes('monitor') || clean.includes('charger') || clean.includes('gadget')) {
      return 0.25;
    }

    return 0.05;
  }

  /**
   * Select best matching product from the catalog given a text context
   */
  public async findBestProduct(contextText: string, state: IAgentState): Promise<{ product: IProduct | null; relevanceScore: number }> {
    const conn = await connectToDatabase();
    const contextLower = contextText.toLowerCase();

    let candidates: any[] = [];

    if (!conn) {
      candidates = [
        {
          _id: 'prod_mock_1',
          name: 'Anker 735 65W GaN Charger',
          brand: 'Anker',
          affiliateUrl: 'https://amzn.to/3example1',
          category: 'travel tech',
          notes: 'compact 3-port wall charger for MacBook & iPhone',
          useCases: ['travel', 'desk', 'fast charging'],
          allowedClaims: ['compact size', 'charges laptop and phone together'],
          active: true,
          timesMentioned: 2,
        },
        {
          _id: 'prod_mock_2',
          name: 'Ergonomic Desk Foot Rest',
          brand: 'ErgoComfort',
          affiliateUrl: 'https://amzn.to/3example2',
          category: 'desk setup',
          notes: 'teardrop memory foam design for lower back relief',
          useCases: ['desk posture', 'ergonomics', 'back pain'],
          allowedClaims: ['supportive foam', 'relieves foot fatigue'],
          active: true,
          timesMentioned: 1,
        },
      ];
    } else {
      candidates = await Product.find({ active: true }).lean();
    }

    if (candidates.length === 0) {
      return { product: null, relevanceScore: 0.0 };
    }

    let bestProduct: IProduct | null = null;
    let highestScore = 0.0;

    for (const prod of candidates) {
      let score = 0.2; // Base prior

      // Category matching
      if (prod.category && contextLower.includes(prod.category.toLowerCase())) {
        score += 0.4;
      }

      // Name words matching
      const nameWords = prod.name.toLowerCase().split(/\s+/);
      const nameMatches = nameWords.filter((w: string) => w.length > 3 && contextLower.includes(w));
      if (nameMatches.length > 0) {
        score += 0.35;
      }

      // Use-cases matching
      if (Array.isArray(prod.useCases)) {
        for (const uc of prod.useCases) {
          if (contextLower.includes(uc.toLowerCase())) {
            score += 0.3;
            break;
          }
        }
      }

      // Brand matching
      if (prod.brand && contextLower.includes(prod.brand.toLowerCase())) {
        score += 0.3;
      }

      // Penalize recently mentioned products
      if (state.recentProducts && state.recentProducts.includes(prod.name)) {
        score -= 0.3;
      }

      score = Math.min(1.0, Math.max(0.0, score));

      if (score > highestScore) {
        highestScore = score;
        bestProduct = prod;
      }
    }

    return { product: bestProduct, relevanceScore: +highestScore.toFixed(2) };
  }

  /**
   * Complete commercial decision pipeline
   */
  public async evaluate(contextText: string, state: IAgentState, explicitProduct?: any): Promise<CommercialEvaluation> {
    const intentScore = this.evaluateCommercialIntent(contextText);
    let product = explicitProduct || null;
    let relevanceScore = explicitProduct ? 0.95 : 0.0;

    if (!product) {
      const best = await this.findBestProduct(contextText, state);
      product = best.product;
      relevanceScore = best.relevanceScore;
    }

    // Check Commercial Pressure & Daily Budget
    const pressureScore = state.commercialPressureScore || 0;
    const dailyLimit = state.commercialBudget?.dailyLimit || 4.0;
    const currentSpent = state.commercialBudget?.currentSpent || 0;
    const budgetRemaining = dailyLimit - currentSpent;

    let affiliateMode: AffiliateMode = 'NONE';
    let reason = '';

    if (!product || relevanceScore < 0.3) {
      affiliateMode = 'NONE';
      reason = 'No sufficiently relevant product found in catalog';
    } else if (budgetRemaining <= 0 || pressureScore >= 0.85) {
      // Saturated commercial pressure -> Drop link, at most casual mention
      if (intentScore >= 0.7) {
        affiliateMode = 'SOFT_RECOMMENDATION';
        reason = `High intent but commercial pressure high (${pressureScore}). Soft recommendation without direct link.`;
      } else {
        affiliateMode = 'NONE';
        reason = `Commercial budget exhausted or pressure saturated (${pressureScore}). Throttled to NONE.`;
      }
    } else if (intentScore >= 0.7 && relevanceScore >= 0.5) {
      affiliateMode = 'DIRECT_LINK';
      reason = `High commercial intent (${intentScore}) and solid relevance (${relevanceScore}). Eligible for direct link with disclosure.`;
    } else if (intentScore >= 0.4 && relevanceScore >= 0.4) {
      affiliateMode = 'SOFT_RECOMMENDATION';
      reason = `Moderate commercial intent (${intentScore}). Soft recommendation appropriate.`;
    } else if (relevanceScore >= 0.6 && intentScore >= 0.3) {
      affiliateMode = 'MENTION_ONLY';
      reason = `Low commercial intent (${intentScore}) but topical inquiry. Mention category/tool without hard link.`;
    } else {
      affiliateMode = 'NONE';
      reason = `Regular social conversation (intent ${intentScore}). 100% organic banter with no commercial angle.`;
    }

    return {
      intentScore,
      relevanceScore,
      affiliateMode,
      matchedProduct: affiliateMode !== 'NONE' ? product : null,
      reason,
    };
  }
}

export const affiliateEngine = new AffiliateEngine();
export default affiliateEngine;
