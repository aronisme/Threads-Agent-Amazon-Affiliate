import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';
import cloudinaryUploader from '@/lib/utils/cloudinaryUploader';
import { AmazonProductExportPayload } from '@/types';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
};

/**
 * Handle CORS Preflight from Chrome Extensions
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Ingestion API for Chrome Extension Scraper
 * Securely receives full Amazon product export payloads, filters and re-hosts
 * top media to Cloudinary, distills human creator context, and upserts into Knowledge Vault.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Request via x-api-key or Bearer Token
    const apiKeyHeader =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const expectedSecret =
      process.env.CRON_SECRET || 'threads_agent_secret_cron_key_999';

    if (!apiKeyHeader || apiKeyHeader !== expectedSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Unauthorized. Provide a valid API key in x-api-key header matching your CRON_SECRET.',
        },
        { status: 401, headers: corsHeaders }
      );
    }

    const payload: AmazonProductExportPayload = await req.json();

    // 2. Validate Essential Fields
    if (!payload.asin || !payload.title) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid payload. "asin" and "title" are mandatory.',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const affiliateUrl =
      payload.affiliateLink?.trim() ||
      payload.productUrl?.trim() ||
      `https://amazon.com/dp/${payload.asin}`;

    // 3. Smart Media Filtering (Guardrail against timeout & Cloudinary quota exhaustion)
    // Images: Filter top 3-4 images, prioritizing MAIN, PT01, PT02 and isHiRes
    const rawImageUrls: string[] = [];
    if (Array.isArray(payload.images) && payload.images.length > 0) {
      // Sort images: MAIN first, then PT01, PT02, then isHiRes
      const sortedImages = [...payload.images].sort((a, b) => {
        if (a.variant === 'MAIN') return -1;
        if (b.variant === 'MAIN') return 1;
        if (a.isHiRes && !b.isHiRes) return -1;
        if (!a.isHiRes && b.isHiRes) return 1;
        return 0;
      });

      for (const img of sortedImages) {
        if (img.url && img.url.startsWith('http') && !rawImageUrls.includes(img.url)) {
          // Exclude likely size charts or tiny thumbnails
          if (!/size[-_]?chart/i.test(img.url)) {
            rawImageUrls.push(img.url);
          }
        }
        if (rawImageUrls.length >= 5) break; // Max 5 high-quality photos
      }
    }

    // Videos: Filter at most 4 direct MP4 videos (exclude .m3u8 HLS streams)
    const rawVideoUrls: string[] = [];
    if (Array.isArray(payload.videos) && payload.videos.length > 0) {
      for (const vid of payload.videos) {
        if (vid.mp4Url && vid.mp4Url.startsWith('http') && vid.mp4Url.includes('.mp4') && !rawVideoUrls.includes(vid.mp4Url)) {
          rawVideoUrls.push(vid.mp4Url);
          if (rawVideoUrls.length >= 4) break; // Max 4 MP4 videos
        }
      }
    }

    // 4. Automatically re-host filtered media to Cloudinary (Anti-bot resilient)
    console.info(
      `📥 [Ingest] Processing ASIN: ${payload.asin} - Transferring ${rawImageUrls.length} images & ${rawVideoUrls.length} videos to Cloudinary...`
    );

    const rehostedImages = await cloudinaryUploader.rehostBatch(rawImageUrls, 'image');
    const rehostedVideos = await cloudinaryUploader.rehostBatch(rawVideoUrls, 'video');

    const primaryImage = rehostedImages[0] || null;
    const primaryVideo = rehostedVideos[0] || null;
    const mediaType =
      rehostedVideos.length > 0 ? 'VIDEO' : rehostedImages.length > 0 ? 'IMAGE' : 'NONE';

    // 5. Category & Notes Distillation
    // Extract category from breadcrumbs (take the most specific child)
    let category = 'general';
    if (Array.isArray(payload.breadcrumbs) && payload.breadcrumbs.length > 0) {
      category = payload.breadcrumbs[payload.breadcrumbs.length - 1].trim();
    }

    // Distill conversational knowledge (Creator Notes + top bullets + social proof)
    const bulletSummary = Array.isArray(payload.bullets)
      ? payload.bullets.slice(0, 3).map((b) => b.trim()).join('. ')
      : '';

    const socialProof =
      payload.rating && payload.reviewCount
        ? `Rated ${payload.rating}/5 from ${payload.reviewCount} customer reviews.`
        : '';

    const distilledNotes = [
      payload.creatorNotes?.trim(),
      bulletSummary,
      socialProof,
    ]
      .filter(Boolean)
      .join(' | ');

    // 6. Availability Guardrail (Prevent promoting out-of-stock items)
    const isActive = payload.isOutOfStock ? false : true;

    // 7. Upsert into MongoDB Database
    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json(
        {
          success: true,
          action: 'SIMULATED',
          asin: payload.asin,
          name: payload.title,
          rehostedImages: rehostedImages.length,
          rehostedVideos: rehostedVideos.length,
          message: 'Standalone mode: Product processed without persistent DB.',
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const existingProduct = await Product.findOne({ asin: payload.asin });
    const isUpdate = Boolean(existingProduct);

    const updatedDoc = await Product.findOneAndUpdate(
      { asin: payload.asin },
      {
        $set: {
          name: payload.title.trim(),
          brand: payload.brand?.trim() || existingProduct?.brand || '',
          asin: payload.asin.trim(),
          affiliateUrl,
          category,
          price: payload.price?.trim() || existingProduct?.price || '',
          listPrice: payload.listPrice?.trim() || existingProduct?.listPrice || '',
          discount: payload.discount?.trim() || existingProduct?.discount || '',
          currency: payload.currency || '$',
          rating: payload.rating?.trim() || existingProduct?.rating || '',
          reviewCount: payload.reviewCount?.trim() || existingProduct?.reviewCount || '',
          bullets: Array.isArray(payload.bullets) ? payload.bullets : existingProduct?.bullets || [],
          breadcrumbs: Array.isArray(payload.breadcrumbs) ? payload.breadcrumbs : existingProduct?.breadcrumbs || [],
          creatorNotes: payload.creatorNotes?.trim() || existingProduct?.creatorNotes || '',
          notes: distilledNotes || existingProduct?.notes || '',
          images: rehostedImages.length > 0 ? rehostedImages : existingProduct?.images || [],
          imageUrl: primaryImage || existingProduct?.imageUrl || null,
          videos: rehostedVideos.length > 0 ? rehostedVideos : existingProduct?.videos || [],
          videoUrl: primaryVideo || existingProduct?.videoUrl || null,
          mediaType: mediaType !== 'NONE' ? mediaType : existingProduct?.mediaType || 'NONE',
          active: isActive,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.info(
      `✅ [Ingest] ASIN ${payload.asin} ${isUpdate ? 'UPDATED' : 'CREATED'} in Vault: "${payload.title.substring(0, 40)}..."`
    );

    return NextResponse.json(
      {
        success: true,
        action: isUpdate ? 'UPDATED' : 'CREATED',
        productId: updatedDoc._id,
        asin: updatedDoc.asin,
        name: updatedDoc.name,
        active: updatedDoc.active,
        rehostedMedia: {
          images: rehostedImages.length,
          videos: rehostedVideos.length,
        },
        message: isUpdate
          ? 'Product successfully updated in Agent Knowledge Vault.'
          : 'Product successfully ingested into Agent Knowledge Vault.',
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('❌ Error in /api/products/ingest:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
