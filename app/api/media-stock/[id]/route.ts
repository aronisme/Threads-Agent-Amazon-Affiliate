import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import MediaStock from '@/db/models/MediaStock';
import visionRotator from '@/lib/ai/visionRotator';
import cloudinaryCleaner from '@/lib/utils/cloudinaryCleaner';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const item = await MediaStock.findById(id);

    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    await connectToDatabase();

    const item = await MediaStock.findById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    // Re-trigger vision analysis if requested
    if (body.reAnalyzeVision) {
      const visualContext = await visionRotator.analyzeStockVideo({
        videoUrl: item.videoUrl,
        title: body.title || item.title,
        category: body.category || item.category,
        notes: body.notes !== undefined ? body.notes : item.notes,
      });
      item.visualContext = visualContext;
    }

    if (body.title !== undefined) item.title = body.title.trim();
    if (body.category !== undefined) item.category = body.category;
    if (body.active !== undefined) item.active = Boolean(body.active);
    if (body.notes !== undefined) item.notes = body.notes.trim();

    await item.save();

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const item = await MediaStock.findById(id);
    if (!item) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    // Attempt to purge from Cloudinary
    if (item.videoUrl) {
      const publicId = cloudinaryCleaner.extractPublicId(item.videoUrl);
      if (publicId) {
        await cloudinaryCleaner.destroyAsset(publicId, 'video');
      }
    }

    await MediaStock.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
