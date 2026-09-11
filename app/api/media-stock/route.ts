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
      category,
      duration,
      notes = '',
      autoAnalyzeVision = true,
    } = body;

    const parsedDuration = duration && !isNaN(Number(duration)) ? Math.round(Number(duration)) : null;
    if (parsedDuration && parsedDuration > 90) {
      return NextResponse.json(
        {
          success: false,
          error: `Video terlalu panjang (${parsedDuration} detik / > 1.5 menit). Maksimal durasi stok video viral adalah 90 detik agar kuota hemat dan performa Threads optimal.`,
        },
        { status: 400 }
      );
    }

    if (!videoUrl || !videoUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'videoUrl is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const cleanVideoUrl = videoUrl.trim();
    const duplicateQueries: any[] = [
      { videoUrl: cleanVideoUrl },
      { originalVideoUrl: cleanVideoUrl },
    ];
    const pathOnly = cleanVideoUrl.split('?')[0];
    if (pathOnly && pathOnly.length > 25) {
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      duplicateQueries.push({ originalVideoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
      duplicateQueries.push({ videoUrl: { $regex: escapeRegex(pathOnly), $options: 'i' } });
    }

    const existing = await MediaStock.findOne({ $or: duplicateQueries });

    if (existing) {
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        message: `Video ini sudah ada di Stok Media sebelumnya ("${existing.title}").`,
        item: existing,
      });
    }

    // 1. Rehost video to Cloudinary Video bucket if external
    let finalVideoUrl = cleanVideoUrl;
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

    // 3. Autonomous AI Vision Analysis
    let visualContext: any = undefined;
    if (autoAnalyzeVision) {
      try {
        console.info(`👁️ [MediaStock] Autonomous AI Vision analyzing video: ${finalVideoUrl}...`);
        visualContext = await visionRotator.analyzeStockVideo({
          videoUrl: finalVideoUrl,
          title: title?.trim(),
          category: category && category !== 'AUTO' ? category : undefined,
          notes: notes.trim(),
        });
      } catch (visionErr) {
        console.warn('⚠️ [MediaStock] Vision analysis failed, continuing without visualContext:', visionErr);
      }
    }

    // 4. Resolve Title & Category autonomously if user left them empty
    const resolvedTitle =
      title?.trim() ||
      visualContext?.autoTitle ||
      visualContext?.summaryDescription?.substring(0, 60) ||
      'Viral Video Moment';

    const resolvedCategory =
      category && category !== 'AUTO'
        ? category
        : visualContext?.autoCategory || 'FUNNY';

    // 5. Save to Database
    const mediaItem = await MediaStock.create({
      title: resolvedTitle,
      videoUrl: finalVideoUrl,
      originalVideoUrl: cleanVideoUrl,
      thumbnailUrl: finalThumbUrl,
      category: resolvedCategory,
      notes: notes.trim(),
      visualContext,
      duration: parsedDuration || undefined,
      active: true,
      timesUsed: 0,
    });

    return NextResponse.json({
      success: true,
      item: mediaItem,
      message: 'Media stock item processed and saved successfully.',
    });
  } catch (err: any) {
    console.error('❌ Error in POST /api/media-stock:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
