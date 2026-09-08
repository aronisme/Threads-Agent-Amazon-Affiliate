import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';

export const dynamic = 'force-dynamic';

// In-memory fallback product storage for standalone/local testing
let inMemoryProducts: any[] = [
  {
    _id: 'prod_mock_1',
    name: 'Anker 735 65W GaN Charger',
    affiliateUrl: 'https://amzn.to/3example1',
    category: 'travel tech',
    notes: 'compact 3-port wall charger for MacBook & iPhone',
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

    // Support 1: Bulk text import ("Name | Link | Category | Notes" per line)
    if (body.bulkText && typeof body.bulkText === 'string') {
      const lines = body.bulkText.split('\n').map((l: string) => l.trim()).filter(Boolean);
      const inserted: any[] = [];

      for (const line of lines) {
        const parts = line.split('|').map((p: string) => p.trim());
        if (parts.length >= 2) {
          const [name, affiliateUrl, category, notes, imageUrl, videoUrl] = parts;
          const mediaType = videoUrl ? 'VIDEO' : imageUrl ? 'IMAGE' : 'NONE';

          if (!conn) {
            const mockProd = {
              _id: `prod_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              name,
              affiliateUrl,
              category: category || 'general',
              notes: notes || '',
              imageUrl: imageUrl || null,
              videoUrl: videoUrl || null,
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
              imageUrl: imageUrl || null,
              videoUrl: videoUrl || null,
              mediaType,
              active: true,
            });
            inserted.push(prod);
          }
        }
      }

      return NextResponse.json({ success: true, count: inserted.length, products: inserted });
    }

    // Support 3: Single product
    if (body.name && body.affiliateUrl) {
      const mediaType = body.videoUrl ? 'VIDEO' : body.imageUrl ? 'IMAGE' : 'NONE';

      if (!conn) {
        const mockProd = {
          _id: `prod_mock_${Date.now()}`,
          name: body.name,
          affiliateUrl: body.affiliateUrl,
          category: body.category || 'general',
          notes: body.notes || '',
          imageUrl: body.imageUrl || null,
          videoUrl: body.videoUrl || null,
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
        imageUrl: body.imageUrl || null,
        videoUrl: body.videoUrl || null,
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
