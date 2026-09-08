import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  try {
    const { id } = params;
    const body = await req.json();

    const updated = await Product.findByIdAndUpdate(id, { $set: body }, { new: true });
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  await connectToDatabase();
  try {
    const { id } = params;
    const deleted = await Product.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Product removed from vault' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
