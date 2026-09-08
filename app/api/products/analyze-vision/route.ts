import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';
import visionRotator from '@/lib/ai/visionRotator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, imageUrl, productName, category, notes } = body;

    let targetImageUrl = imageUrl;
    let targetName = productName || 'Product';
    let targetCategory = category || 'gadgets';
    let targetNotes = notes || '';
    let productDoc: any = null;

    if (productId) {
      await connectToDatabase();
      productDoc = await Product.findById(productId);
      if (productDoc) {
        targetImageUrl = targetImageUrl || productDoc.imageUrl;
        targetName = productDoc.name;
        targetCategory = productDoc.category || targetCategory;
        targetNotes = productDoc.notes || targetNotes;
      }
    }

    if (!targetImageUrl) {
      return NextResponse.json(
        { success: false, error: 'Missing imageUrl or product does not have an imageUrl set' },
        { status: 400 }
      );
    }

    // Run multi-tier vision analysis (Groq -> xKiro -> Mistral -> Heuristic)
    const visualContext = await visionRotator.analyzeProductImage({
      imageUrl: targetImageUrl,
      productName: targetName,
      category: targetCategory,
      notes: targetNotes,
    });

    // If productId was provided, persist to database
    if (productDoc) {
      productDoc.visualContext = visualContext;
      if (!productDoc.imageUrl && targetImageUrl) {
        productDoc.imageUrl = targetImageUrl;
      }
      await productDoc.save();
    }

    return NextResponse.json({
      success: true,
      visualContext,
      product: productDoc
        ? {
            id: productDoc._id,
            name: productDoc.name,
            visualContext: productDoc.visualContext,
          }
        : null,
    });
  } catch (err: any) {
    console.error('❌ Error in /api/products/analyze-vision:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
