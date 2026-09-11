import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import MediaStock from '@/db/models/MediaStock';
import visionRotator from '@/lib/ai/visionRotator';

export const dynamic = 'force-dynamic';

/**
 * POST /api/media-stock/upload
 * Handles direct multipart/form-data video upload from user's machine,
 * transfers to Cloudinary video cloud, runs autonomous AI Vision, and stores in Vault.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const manualCategory = formData.get('category') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No video file provided' }, { status: 400 });
    }

    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME_VIDEO ||
      process.env.VITE_CLOUDINARY_CLOUD_NAME_VIDEO ||
      'drkbqpxqf';
    const uploadPreset =
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
      process.env.VITE_CLOUDINARY_UPLOAD_PRESET_VIDEO ||
      'vidgram';

    // 1. Upload direct binary blob to Cloudinary
    console.info(`☁️ [MediaStock Upload] Uploading "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) to Cloudinary...`);
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('upload_preset', uploadPreset);

    const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Cloudinary video upload failed: ${errText.substring(0, 150)}`);
    }

    const uploadData = await uploadRes.json();
    const secureUrl = uploadData.secure_url;
    console.info(`✅ [MediaStock Upload] Cloudinary video ready at: ${secureUrl}`);

    // 2. Generate frame thumbnail
    const thumbUrl = secureUrl.replace(/\/upload\//i, '/upload/so_1/').replace(/\.mp4$/i, '.jpg');

    // 3. Autonomous AI Vision Analysis
    await connectToDatabase();
    let visualContext: any = null;

    try {
      console.info(`👁️ [MediaStock Upload] AI Vision automatically scanning scene & punchline...`);
      visualContext = await visionRotator.analyzeStockVideo({
        videoUrl: secureUrl,
        title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
        category: manualCategory && manualCategory !== 'AUTO' ? manualCategory : undefined,
      });
    } catch (vErr) {
      console.warn('⚠️ [MediaStock Upload] AI Vision non-blocking error:', vErr);
    }

    const resolvedTitle =
      visualContext?.autoTitle ||
      visualContext?.summaryDescription?.substring(0, 50) ||
      file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') ||
      'Viral Video Moment';

    const resolvedCategory =
      manualCategory && manualCategory !== 'AUTO'
        ? manualCategory
        : visualContext?.autoCategory || 'FUNNY';

    // 4. Save to Database
    const mediaItem = await MediaStock.create({
      title: resolvedTitle,
      videoUrl: secureUrl,
      thumbnailUrl: thumbUrl,
      category: resolvedCategory,
      notes: visualContext?.summaryDescription || '',
      visualContext,
      active: true,
      timesUsed: 0,
    });

    return NextResponse.json({
      success: true,
      item: mediaItem,
      message: 'Video uploaded and analyzed by AI Vision successfully!',
    });
  } catch (err: any) {
    console.error('❌ Error in /api/media-stock/upload:', err);
    return NextResponse.json({ success: false, error: err.message || 'Upload failed' }, { status: 500 });
  }
}
