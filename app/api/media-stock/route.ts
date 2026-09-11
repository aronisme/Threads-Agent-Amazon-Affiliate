import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import MediaStock from '@/db/models/MediaStock';
import cloudinaryUploader from '@/lib/utils/cloudinaryUploader';
import visionRotator from '@/lib/ai/visionRotator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-stock
 * Lists stock non-affiliate videos with filters
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filter: Record<string, any> = {};
    if (category && category !== 'ALL') {
      filter.category = category;
    }
    if (active !== null && active !== undefined && active !== '') {
      filter.active = active === 'true';
    }

    const items = await MediaStock.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error('❌ Error in GET /api/media-stock:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/media-stock
 * Creates a new media stock entry (re-hosting external video and extracting AI Vision if requested)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      videoUrl,
      thumbnailUrl,
      category = 'GENERAL',
      notes = '',
      autoAnalyzeVision = true,
    } = body;

    if (!title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'Title and videoUrl are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 1. Rehost video to Cloudinary Video bucket if external
    let finalVideoUrl = videoUrl.trim();
    if (!finalVideoUrl.includes('res.cloudinary.com')) {
      console.info(`☁️ [MediaStock] Re-hosting stock video to Cloudinary: ${finalVideoUrl}`);
      finalVideoUrl = await cloudinaryUploader.rehostMedia(finalVideoUrl, 'video');
    }

    // 2. Generate thumbnail if Cloudinary video
    let finalThumbUrl = thumbnailUrl?.trim() || null;
    if (!finalThumbUrl && finalVideoUrl.includes('res.cloudinary.com')) {
      finalThumbUrl = finalVideoUrl
        .replace(/\/upload\//i, '/upload/so_1/')
        .replace(/\.mp4$/i, '.jpg');
    }

    // 3. Optional AI Vision Analysis
    let visualContext = undefined;
    if (autoAnalyzeVision) {
      try {
        console.info(`👁️ [MediaStock] Analyzing video with AI Vision: "${title}"...`);
        visualContext = await visionRotator.analyzeStockVideo({
          videoUrl: finalVideoUrl,
          title,
          category,
          notes,
        });
      } catch (visionErr) {
        console.warn('⚠️ [MediaStock] Vision analysis failed, continuing without visualContext:', visionErr);
      }
    }

    // 4. Save to Database
    const mediaItem = await MediaStock.create({
      title: title.trim(),
      videoUrl: finalVideoUrl,
      thumbnailUrl: finalThumbUrl,
      category,
      notes: notes.trim(),
      visualContext,
      active: true,
      timesUsed: 0,
    });

    return NextResponse.json({
      success: true,
      item: mediaItem,
      message: 'Media stock item created successfully.',
    });
  } catch (err: any) {
    console.error('❌ Error in POST /api/media-stock:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
