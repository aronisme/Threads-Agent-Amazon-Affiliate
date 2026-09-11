import { NextRequest, NextResponse } from 'next/server';
import trendRadar from '@/lib/radar/trendRadar';

export const dynamic = 'force-dynamic';

/**
 * POST /api/trends/sync
 * Manually or programmatically triggers an immediate sync with Google Trends US, Google News, and Reddit.
 */
export async function POST(req: NextRequest) {
  try {
    const result = await trendRadar.syncUSTrends();

    return NextResponse.json({
      success: true,
      message: `Berhasil menyinkronkan ${result.totalSaved} topik tren viral AS terbaru dari Google Trends & Reddit.`,
      totalSaved: result.totalSaved,
      items: result.items,
    });
  } catch (err: any) {
    console.error('❌ Error in POST /api/trends/sync:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
