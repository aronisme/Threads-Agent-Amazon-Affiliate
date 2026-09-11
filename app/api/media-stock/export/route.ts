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

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * GET /api/media-stock/export?checkUrl=...&sourceUrl=...
 * Quickly checks if a video or source page already exists in MediaStock to prevent duplicate exports.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkUrl = searchParams.get('checkUrl')?.trim();
    const sourceUrl = searchParams.get('sourceUrl')?.trim();

    if (!checkUrl && !sourceUrl) {
      return NextResponse.json(
        { success: false, error: 'checkUrl or sourceUrl is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    await connectToDatabase();

    const queries: any[] = [];
    if (checkUrl) {
      queries.push({ videoUrl: checkUrl });
      queries.push({ originalVideoUrl: checkUrl });
      const pathOnly = checkUrl.split('?')[0];
      if (pathOnly && pathOnly.length > 25) {
        queries.push({ videoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
        queries.push({ originalVideoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
      }
    }

    if (sourceUrl) {
      queries.push({ sourceUrl });
      queries.push({ notes: { $regex: escapeRegex(sourceUrl), $options: 'i' } });
    }

    const existing = await MediaStock.findOne({ $or: queries });

    return NextResponse.json(
      {
        success: true,
        exists: !!existing,
        mediaId: existing?._id || null,
        title: existing?.title || null,
        category: existing?.category || null,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * POST /api/media-stock/export
 * Receives video URL from Chrome/Brave browser extension (from TikTok, Threads, Instagram, Reddit, or any site),
 * checks for duplicates (skips re-upload & vision tokens if existing),
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

    const cleanOriginalUrl = videoUrl.trim();
    const cleanSourceUrl = sourceUrl?.trim() || '';

    // 2. Anti-Duplication Check (Save Cloudinary bandwidth & AI Vision tokens)
    const duplicateQueries: any[] = [
      { videoUrl: cleanOriginalUrl },
      { originalVideoUrl: cleanOriginalUrl },
    ];

    if (cleanSourceUrl) {
      duplicateQueries.push({ sourceUrl: cleanSourceUrl });
      duplicateQueries.push({ notes: { $regex: escapeRegex(cleanSourceUrl), $options: 'i' } });
    }

    // Match root path of video to handle expiring CDN URL tokens (Meta/TikTok/Twitter)
    const pathOnly = cleanOriginalUrl.split('?')[0];
    if (pathOnly && pathOnly.length > 25) {
      duplicateQueries.push({ originalVideoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
      duplicateQueries.push({ videoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
    }

    const existingMedia = await MediaStock.findOne({ $or: duplicateQueries });
    if (existingMedia) {
      console.info(`⚡ [Anti-Duplikat] Video sudah ada di MediaStock! ID: ${existingMedia._id} ("${existingMedia.title}")`);
      return NextResponse.json(
        {
          success: true,
          isDuplicate: true,
          message: `Video ini sudah ada di Stok Media sebelumnya ("${existingMedia.title}"). Otomatis dicegah duplikasi (hemat kuota & token AI).`,
          mediaId: existingMedia._id,
          title: existingMedia.title,
          category: existingMedia.category,
          videoUrl: existingMedia.videoUrl,
          thumbnailUrl: existingMedia.thumbnailUrl,
          visualContext: existingMedia.visualContext,
        },
        { headers: corsHeaders }
      );
    }

    // 3. Rehost video to Cloudinary Video bucket if external
    let finalVideoUrl = cleanOriginalUrl;
    if (!finalVideoUrl.includes('res.cloudinary.com')) {
      console.info(`☁️ [Extension Export] Re-hosting video to Cloudinary: ${finalVideoUrl}`);
      try {
        finalVideoUrl = await cloudinaryUploader.rehostMedia(finalVideoUrl, 'video');
      } catch (uploadErr: any) {
        console.warn(`⚠️ Cloudinary video rehost failed, using original url:`, uploadErr.message);
      }
    }

    // 4. Generate thumbnail if Cloudinary video
    let finalThumbUrl = thumbnailUrl?.trim() || null;
    if (!finalThumbUrl && finalVideoUrl.includes('res.cloudinary.com')) {
      finalThumbUrl = finalVideoUrl
        .replace(/\/upload\//i, '/upload/so_1/')
        .replace(/\.mp4$/i, '.jpg');
    }

    // 5. Autonomous AI Vision Analysis
    let visualContext: any = undefined;
    try {
      console.info(`👁️ [Extension Export] Running Autonomous AI Vision for: ${finalVideoUrl}...`);
      visualContext = await visionRotator.analyzeStockVideo({
        videoUrl: finalVideoUrl,
        title: title?.trim(),
        category: category && category !== 'AUTO' ? category : undefined,
        notes: notes.trim() || (cleanSourceUrl ? `Captured from web: ${cleanSourceUrl}` : ''),
      });
    } catch (visionErr) {
      console.warn('⚠️ [Extension Export] AI Vision non-blocking error:', visionErr);
    }

    // 6. Resolve Title & Category
    const resolvedTitle =
      title?.trim() ||
      visualContext?.autoTitle ||
      visualContext?.summaryDescription?.substring(0, 60) ||
      'Viral Web Video';

    const VALID_CATEGORIES = ['FUNNY', 'RELATABLE', 'AESTHETIC', 'SATISFYING', 'TECH_MEME', 'GENERAL'];
    let candidateCategory = category && category !== 'AUTO' ? category : visualContext?.autoCategory;
    if (candidateCategory === 'TECH') candidateCategory = 'TECH_MEME';
    const resolvedCategory = VALID_CATEGORIES.includes(candidateCategory) ? candidateCategory : 'GENERAL';

    // 7. Save to Database
    const mediaItem = await MediaStock.create({
      title: resolvedTitle,
      videoUrl: finalVideoUrl,
      originalVideoUrl: cleanOriginalUrl,
      sourceUrl: cleanSourceUrl || null,
      thumbnailUrl: finalThumbUrl || '',
      category: resolvedCategory,
      notes: notes?.trim() || (cleanSourceUrl ? `Source: ${cleanSourceUrl}` : ''),
      visualContext: visualContext || undefined,
      active: true,
      timesUsed: 0,
    });

    console.info(`✅ [Extension Export] Video successfully saved to MediaStock: "${resolvedTitle}" [${resolvedCategory}] (ID: ${mediaItem._id})`);

    return NextResponse.json(
      {
        success: true,
        isDuplicate: false,
        message: 'Video berhasil diexport ke Stok Media Viral & dianalisis oleh AI Vision.',
        mediaId: mediaItem._id,
        title: resolvedTitle,
        category: resolvedCategory,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbUrl || '',
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
