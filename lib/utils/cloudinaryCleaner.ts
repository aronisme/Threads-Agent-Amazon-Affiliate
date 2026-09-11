import crypto from 'crypto';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';
import MediaStock from '@/db/models/MediaStock';

export interface CleanupReport {
  timestamp: string;
  totalImagesChecked: number;
  totalVideosChecked: number;
  imagesDestroyed: number;
  videosDestroyed: number;
  productsPruned: number;
  mediaStockPruned: number;
  errors: string[];
}

export class CloudinaryCleaner {
  private apiKey: string;
  private apiSecret: string;
  private imageCloudName: string;
  private videoCloudName: string;

  constructor() {
    this.apiKey = process.env.CLOUDINARY_API_KEY || '998587333379558';
    this.apiSecret = process.env.CLOUDINARY_API_SECRET || 'XlqeFnWbS-th2SQqAHZ5Hxn-WPg';
    this.imageCloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_IMAGE ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME_IMAGE ||
      'dwgfox722';
    this.videoCloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_VIDEO ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME_VIDEO ||
      'drkbqpxqf';
  }

  /**
   * Extracts Cloudinary publicId from a secure URL
   * E.g.: https://res.cloudinary.com/dwgfox722/image/upload/v1726058923/lynke_app/prod_123.jpg
   * Returns: lynke_app/prod_123
   */
  public extractPublicId(url: string): string | null {
    if (!url || !url.includes('res.cloudinary.com')) return null;

    try {
      // Split on /upload/
      const parts = url.split('/upload/');
      if (parts.length < 2) return null;

      let pathAfterUpload = parts[1];
      // Remove version prefix if present e.g. v1726058923/
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

      // Remove query parameters or fragments if any
      pathAfterUpload = pathAfterUpload.split('?')[0].split('#')[0];

      // Remove file extension
      const lastDotIndex = pathAfterUpload.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
      }

      return pathAfterUpload;
    } catch {
      return null;
    }
  }

  /**
   * Destroys a single asset on Cloudinary using HMAC-SHA1 signature
   */
  public async destroyAsset(
    publicId: string,
    resourceType: 'image' | 'video' = 'image',
    overrideCloudName?: string
  ): Promise<boolean> {
    const cloudName =
      overrideCloudName ||
      (resourceType === 'video' ? this.videoCloudName : this.imageCloudName);

    if (!this.apiKey || !this.apiSecret) {
      console.warn('⚠️ CloudinaryCleaner: Missing API Key or Secret. Skipping API destruction.');
      return false;
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const toSign = `public_id=${publicId}&timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');

      const formData = new URLSearchParams();
      formData.append('public_id', publicId);
      formData.append('timestamp', timestamp.toString());
      formData.append('api_key', this.apiKey);
      formData.append('signature', signature);

      const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        console.info(`🗑️ [CloudinaryCleaner] Destroyed ${resourceType} (${publicId}):`, data.result);
        return data.result === 'ok' || data.result === 'not found';
      } else {
        const err = await res.text();
        console.warn(`⚠️ [CloudinaryCleaner] Destroy failed for ${publicId} (${res.status}): ${err.substring(0, 100)}`);
        return false;
      }
    } catch (err: any) {
      console.error(`❌ [CloudinaryCleaner] Error destroying ${publicId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Run monthly cleanup on Cloudinary assets and Database records
   * Finds assets older than 30 days or belonging to inactive/pruned products.
   */
  public async runMonthlyCleanup(retentionDays = 30): Promise<CleanupReport> {
    const report: CleanupReport = {
      timestamp: new Date().toISOString(),
      totalImagesChecked: 0,
      totalVideosChecked: 0,
      imagesDestroyed: 0,
      videosDestroyed: 0,
      productsPruned: 0,
      mediaStockPruned: 0,
      errors: [],
    };

    console.info(`🧹 [CloudinaryCleaner] Starting monthly cleanup routine (retention: ${retentionDays} days)...`);

    await connectToDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // 1. Cleanup Old / Inactive Products Media
    try {
      const oldOrInactiveProducts = await Product.find({
        $or: [
          { active: false, updatedAt: { $lt: cutoffDate } },
          { createdAt: { $lt: cutoffDate }, active: false },
        ],
      }).limit(50);

      for (const prod of oldOrInactiveProducts) {
        let modified = false;

        // Clean images
        if (Array.isArray(prod.images)) {
          for (const imgUrl of prod.images) {
            report.totalImagesChecked++;
            const publicId = this.extractPublicId(imgUrl);
            if (publicId) {
              const destroyed = await this.destroyAsset(publicId, 'image');
              if (destroyed) report.imagesDestroyed++;
            }
          }
          prod.images = [];
          prod.imageUrl = null;
          modified = true;
        }

        // Clean videos
        if (Array.isArray(prod.videos)) {
          for (const vidUrl of prod.videos) {
            report.totalVideosChecked++;
            const publicId = this.extractPublicId(vidUrl);
            if (publicId) {
              const destroyed = await this.destroyAsset(publicId, 'video');
              if (destroyed) report.videosDestroyed++;
            }
          }
          prod.videos = [];
          prod.videoUrl = null;
          modified = true;
        }

        if (modified) {
          prod.mediaType = 'NONE';
          await prod.save();
          report.productsPruned++;
        }
      }
    } catch (err: any) {
      report.errors.push(`Product cleanup error: ${err.message}`);
    }

    // 2. Cleanup Old / Inactive MediaStock
    try {
      const oldMediaStock = await MediaStock.find({
        $or: [
          { active: false, updatedAt: { $lt: cutoffDate } },
          { timesUsed: { $gte: 5 }, updatedAt: { $lt: cutoffDate } },
        ],
      }).limit(30);

      for (const item of oldMediaStock) {
        report.totalVideosChecked++;
        const publicId = this.extractPublicId(item.videoUrl);
        if (publicId) {
          const destroyed = await this.destroyAsset(publicId, 'video');
          if (destroyed) report.videosDestroyed++;
        }
        await MediaStock.findByIdAndDelete(item._id);
        report.mediaStockPruned++;
      }
    } catch (err: any) {
      report.errors.push(`MediaStock cleanup error: ${err.message}`);
    }

    console.info('✅ [CloudinaryCleaner] Cleanup routine finished:', JSON.stringify(report));
    return report;
  }
}

export default new CloudinaryCleaner();
