import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';
import cloudinaryUploader from '@/lib/utils/cloudinaryUploader';

export const dynamic = 'force-dynamic';

// Helper to parse comma/newline/space separated URLs into array
function parseUrlList(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter((u) => u.startsWith('http'));
  }
  if (typeof input === 'string') {
    return input
      .split(/[\n,;]+/)
      .map((u) => u.trim())
      .filter((u) => u.startsWith('http'));
  }
  return [];
}

// In-memory fallback product storage for standalone/local testing
let inMemoryProducts: any[] = [
  {
    _id: 'prod_mock_1',
    name: 'Anker 735 65W GaN Charger',
    affiliateUrl: 'https://amzn.to/3example1',
    category: 'travel tech',
    notes: 'compact 3-port wall charger for MacBook & iPhone',
    images: ['https://res.cloudinary.com/dwgfox722/image/upload/v1788897514/nwexeu1y65ftmjvhrku9.jpg'],
    imageUrl: 'https://res.cloudinary.com/dwgfox722/image/upload/v1788897514/nwexeu1y65ftmjvhrku9.jpg',
    videos: [],
    mediaType: 'IMAGE',
    active: true,
    timesMentioned: 2,
    createdAt: new Date(),
  },
  {
    _id: 'prod_mock_2',
    name: 'Ergonomic Desk Foot Rest',
    affiliateUrl: 'https://amzn.to/3example2',
    category: 'desk setup',
    notes: 'teardrop memory foam design for lower back relief',
    images: [],
    videos: [],
    mediaType: 'NONE',
    active: true,
    timesMentioned: 1,
    createdAt: new Date(),
  },
];

export async function GET(req: NextRequest) {
  const conn = await connectToDatabase();
  if (!conn) {
    return NextResponse.json({ success: true, products: inMemoryProducts });
  }

  try {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    return NextResponse.json({ success: true, products: inMemoryProducts });
  }
}

export async function POST(req: NextRequest) {
  const conn = await connectToDatabase();
  try {
    const body = await req.json();

    // Support 1: Bulk text import ("Name | Link | Category | Notes | Images | Videos" per line)
    if (body.bulkText && typeof body.bulkText === 'string') {
      const lines = body.bulkText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const inserted: any[] = [];

      for (const line of lines) {
        const parts = line.split('|').map((p: string) => p.trim());
        if (parts.length >= 2) {
          const [name, affiliateUrl, category, notes, rawImages, rawVideos] = parts;

          const imageCandidates = parseUrlList(rawImages);
          const videoCandidates = parseUrlList(rawVideos);

          // Automatically transfer external URLs into Cloudinary
          const rehostedImages = await cloudinaryUploader.rehostBatch(imageCandidates, 'image');
          const rehostedVideos = await cloudinaryUploader.rehostBatch(videoCandidates, 'video');

          const primaryImage = rehostedImages[0] || null;
          const primaryVideo = rehostedVideos[0] || null;
          const mediaType = rehostedVideos.length > 0 ? 'VIDEO' : rehostedImages.length > 0 ? 'IMAGE' : 'NONE';

          if (!conn) {
            const mockProd = {
              _id: `prod_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              affiliateUrl,
              category: category || 'general',
              notes: notes || '',
              images: rehostedImages,
              imageUrl: primaryImage,
              videos: rehostedVideos,
              videoUrl: primaryVideo,
              mediaType,
              active: true,
              timesMentioned: 0,
              createdAt: new Date(),
            };
            inMemoryProducts.unshift(mockProd);
            inserted.push(mockProd);
          } else {
            const prod = await Product.create({
              name,
              affiliateUrl,
              category: category || 'general',
              notes: notes || '',
              images: rehostedImages,
              imageUrl: primaryImage,
              videos: rehostedVideos,
              videoUrl: primaryVideo,
              mediaType,
              active: true,
            });
            inserted.push(prod);
          }
        }
      }

      return NextResponse.json({ success: true, count: inserted.length, products: inserted });
    }

    // Support 2: Single product
    if (body.name && body.affiliateUrl) {
      const rawImages = [
        ...parseUrlList(body.images),
        ...parseUrlList(body.imageUrl),
      ];
      const rawVideos = [
        ...parseUrlList(body.videos),
        ...parseUrlList(body.videoUrl),
      ];

      // Automatically rehost external media to Cloudinary
      const rehostedImages = await cloudinaryUploader.rehostBatch(rawImages, 'image');
      const rehostedVideos = await cloudinaryUploader.rehostBatch(rawVideos, 'video');

      const primaryImage = rehostedImages[0] || null;
      const primaryVideo = rehostedVideos[0] || null;
      const mediaType = rehostedVideos.length > 0 ? 'VIDEO' : rehostedImages.length > 0 ? 'IMAGE' : 'NONE';

      if (!conn) {
        const mockProd = {
          _id: `prod_mock_${Date.now()}`,
          name: body.name,
          affiliateUrl: body.affiliateUrl,
          category: body.category || 'general',
          notes: body.notes || '',
          images: rehostedImages,
          imageUrl: primaryImage,
          videos: rehostedVideos,
          videoUrl: primaryVideo,
          mediaType,
          active: body.active !== false,
          timesMentioned: 0,
          createdAt: new Date(),
        };
        inMemoryProducts.unshift(mockProd);
        return NextResponse.json({ success: true, product: mockProd });
      }

      const prod = await Product.create({
        name: body.name,
        affiliateUrl: body.affiliateUrl,
        category: body.category || 'general',
        notes: body.notes || '',
        images: rehostedImages,
        imageUrl: primaryImage,
        videos: rehostedVideos,
        videoUrl: primaryVideo,
        mediaType,
        active: body.active !== false,
      });
      return NextResponse.json({ success: true, product: prod });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid payload. Provide name & affiliateUrl, or bulkText with "|" separator' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
