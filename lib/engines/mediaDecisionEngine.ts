/**
 * Media Decision Engine
 * Decides whether to attach a media asset and selects the single optimal asset from
 * the product's media library (images & videos stored on Cloudinary).
 * 
 * CORE RULE: We NEVER dump all media at once. Every post attaches at most 1 single asset,
 * rotating intelligently (LRU / anti-fatigue) to keep every post fresh.
 */

import { IProduct, PostType } from '@/types';

export type SelectedMediaFormat = 'TEXT' | 'IMAGE' | 'VIDEO';

export interface MediaDecisionResult {
  selectedFormat: SelectedMediaFormat;
  mediaUrl?: string;
  assetIndex?: number;
  reason: string;
}

export class MediaDecisionEngine {
  /**
   * Decide the single media asset (if any) to attach to a post
   */
  public decideMedia(product: IProduct | null | undefined, postType: PostType): MediaDecisionResult {
    // If no product or if postType is not product-related, default to TEXT
    if (!product || (postType !== 'CONTEXTUAL_PRODUCT' && postType !== 'STORY')) {
      return {
        selectedFormat: 'TEXT',
        reason: 'Post type does not warrant product media attachment.',
      };
    }

    // 1. Gather all unique images & videos (from arrays and legacy single fields)
    const imagePool: string[] = Array.from(
      new Set([
        ...(Array.isArray(product.images) ? product.images : []),
        ...(product.imageUrl ? [product.imageUrl] : []),
      ].filter(Boolean) as string[])
    );

    const videoPool: string[] = Array.from(
      new Set([
        ...(Array.isArray(product.videos) ? product.videos : []),
        ...(product.videoUrl ? [product.videoUrl] : []),
      ].filter(Boolean) as string[])
    );

    const hasImages = imagePool.length > 0;
    const hasVideos = videoPool.length > 0;

    // If product has zero media, return text
    if (!hasImages && !hasVideos) {
      return {
        selectedFormat: 'TEXT',
        reason: 'No media assets available in vault for this product.',
      };
    }

    // 2. Determine format probability distribution
    // Keep feed organic: 30-35% text-only even when media is present
    const roll = Math.random();
    let chosenFormat: SelectedMediaFormat = 'TEXT';

    if (hasImages && hasVideos) {
      // Prioritize high-engagement video reels (65%) to maximize scroll-stop attention
      if (roll < 0.65) {
        chosenFormat = 'VIDEO';
      } else if (roll < 0.85) {
        chosenFormat = 'IMAGE';
      } else {
        chosenFormat = 'TEXT';
      }
    } else if (hasVideos) {
      if (roll < 0.75) {
        chosenFormat = 'VIDEO';
      } else {
        chosenFormat = 'TEXT';
      }
    } else if (hasImages) {
      if (roll < 0.70) {
        chosenFormat = 'IMAGE';
      } else {
        chosenFormat = 'TEXT';
      }
    }

    if (chosenFormat === 'TEXT') {
      return {
        selectedFormat: 'TEXT',
        reason: 'Selected text-only format for natural timeline breathing room.',
      };
    }

    // 3. Select single asset using Anti-Fatigue / LRU rotation
    if (chosenFormat === 'IMAGE' && hasImages) {
      const selected = this.pickRotatingAsset(imagePool, product.lastMediaUsedUrl);
      return {
        selectedFormat: 'IMAGE',
        mediaUrl: selected.url,
        assetIndex: selected.index,
        reason: `Selected image asset ${selected.index + 1}/${imagePool.length} (Anti-Fatigue rotation).`,
      };
    }

    if (chosenFormat === 'VIDEO' && hasVideos) {
      const selected = this.pickRotatingAsset(videoPool, product.lastMediaUsedUrl);
      return {
        selectedFormat: 'VIDEO',
        mediaUrl: selected.url,
        assetIndex: selected.index,
        reason: `Selected video asset ${selected.index + 1}/${videoPool.length} (Anti-Fatigue rotation).`,
      };
    }

    return {
      selectedFormat: 'TEXT',
      reason: 'Fallback to text format.',
    };
  }

  /**
   * Helper to pick an asset from a pool, avoiding the one used on the previous post
   */
  private pickRotatingAsset(
    pool: string[],
    lastUsedUrl?: string
  ): { url: string; index: number } {
    if (pool.length === 1) {
      return { url: pool[0], index: 0 };
    }

    // Filter out the last used asset if we have alternatives
    const candidates = pool
      .map((url, index) => ({ url, index }))
      .filter((item) => item.url !== lastUsedUrl);

    const eligible = candidates.length > 0 ? candidates : pool.map((url, index) => ({ url, index }));
    const picked = eligible[Math.floor(Math.random() * eligible.length)];

    return picked;
  }
}

export const mediaDecisionEngine = new MediaDecisionEngine();
export default mediaDecisionEngine;
