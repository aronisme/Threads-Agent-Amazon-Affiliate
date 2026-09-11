import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import TrendTopic from '@/db/models/TrendTopic';
import trendRadar from '@/lib/radar/trendRadar';

export const dynamic = 'force-dynamic';

/**
 * GET /api/trends
 * Returns the current active US viral trends list from Google Trends & Reddit.
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '30', 10);
    const source = searchParams.get('source');

    const filter: Record<string, any> = { active: true, region: 'US' };
    if (source && source !== 'ALL') {
      filter.source = source;
    }

    let items = await TrendTopic.find(filter)
      .sort({ fetchedAt: -1, score: -1 })
      .limit(limit);

    // If database is empty, automatically run initial sync
    if (!items || items.length === 0) {
      console.info('📡 [TrendsAPI] Vault empty, triggering first US Trend Radar sync...');
      const syncResult = await trendRadar.syncUSTrends();
      items = syncResult.items;
    }

    const totalCount = await TrendTopic.countDocuments({ active: true, region: 'US' });

    return NextResponse.json({
      success: true,
      total: totalCount,
      items,
    });
  } catch (err: any) {
    console.error('❌ Error in GET /api/trends:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
