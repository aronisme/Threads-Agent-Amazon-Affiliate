import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import MediaStock from '@/db/models/MediaStock';
import cloudinaryUploader from '@/lib/utils/cloudinaryUploader';
import visionRotator from '@/lib/ai/visionRotator';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * POST /api/media-stock/export
 * Receives video URL from Chrome/Brave browser extension (from TikTok, Threads, Instagram, Reddit, or any site),
 * rehosts to Cloudinary, extracts punchline & category via AI Vision, and saves to MediaStock vault.
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
        { success: false, error: 'Unauthorized: Invalid or missing x-api-key' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const {
      videoUrl,
      title,
      sourceUrl,
      thumbnailUrl,
      category,
      notes = '',
    } = body;

    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'videoUrl is required and must be a valid URL string' },
        { status: 400, headers: corsHeaders }
      );
    }

    await connectToDatabase();

    // 2. Rehost video to Cloudinary Video bucket if external
    let finalVideoUrl = videoUrl.trim();
    if (!finalVideoUrl.includes('res.cloudinary.com')) {
      console.info(`☁️ [Extension Export] Re-hosting video to Cloudinary: ${finalVideoUrl}`);
      try {
        finalVideoUrl = await cloudinaryUploader.rehostMedia(finalVideoUrl, 'video');
      } catch (uploadErr: any) {
        console.warn(`⚠️ Cloudinary video rehost failed, using original url:`, uploadErr.message);
      }
    }

    // 3. Generate thumbnail if Cloudinary video
    let finalThumbUrl = thumbnailUrl?.trim() || null;
    if (!finalThumbUrl && finalVideoUrl.includes('res.cloudinary.com')) {
      finalThumbUrl = finalVideoUrl
        .replace(/\/upload\//i, '/upload/so_1/')
        .replace(/\.mp4$/i, '.jpg');
    }

    // 4. Autonomous AI Vision Analysis
    let visualContext: any = undefined;
    try {
      console.info(`👁️ [Extension Export] Running Autonomous AI Vision for: ${finalVideoUrl}...`);
      visualContext = await visionRotator.analyzeStockVideo({
        videoUrl: finalVideoUrl,
        title: title?.trim(),
        category: category && category !== 'AUTO' ? category : undefined,
        notes: notes.trim() || (sourceUrl ? `Captured from web: ${sourceUrl}` : ''),
      });
    } catch (visionErr) {
      console.warn('⚠️ [Extension Export] AI Vision non-blocking error:', visionErr);
    }

    // 5. Resolve Title & Category
    const resolvedTitle =
      title?.trim() ||
      visualContext?.autoTitle ||
      visualContext?.summaryDescription?.substring(0, 60) ||
      'Viral Web Video';

    const VALID_CATEGORIES = ['FUNNY', 'RELATABLE', 'AESTHETIC', 'SATISFYING', 'TECH_MEME', 'GENERAL'];
    let candidateCategory = category && category !== 'AUTO' ? category : visualContext?.autoCategory;
    if (candidateCategory === 'TECH') candidateCategory = 'TECH_MEME';
    const resolvedCategory = VALID_CATEGORIES.includes(candidateCategory) ? candidateCategory : 'GENERAL';

    // 6. Save to Database
    const mediaItem = await MediaStock.create({
      title: resolvedTitle,
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbUrl || '',
      category: resolvedCategory,
      notes: notes?.trim() || (sourceUrl ? `Source: ${sourceUrl}` : ''),
      visualContext: visualContext || undefined,
      active: true,
      timesUsed: 0,
    });

    console.info(`✅ [Extension Export] Video successfully saved to MediaStock: "${resolvedTitle}" [${resolvedCategory}] (ID: ${mediaItem._id})`);

    return NextResponse.json(
      {
        success: true,
        message: 'Video berhasil diexport ke Stok Media Viral & dianalisis oleh AI Vision.',
        mediaId: mediaItem._id,
        title: resolvedTitle,
        category: resolvedCategory,
        videoUrl: finalVideoUrl,
        visualContext,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('❌ Error in POST /api/media-stock/export:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
