import { NextRequest, NextResponse } from 'next/server';
import cloudinaryCleaner from '@/lib/utils/cloudinaryCleaner';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const secretParam = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cleanup request' }, { status: 401 });
    }

    const retentionDays = Number(req.nextUrl.searchParams.get('days')) || 30;
    const report = await cloudinaryCleaner.runMonthlyCleanup(retentionDays);

    return NextResponse.json({
      success: true,
      message: `Cleaned up media older than ${retentionDays} days from Cloudinary and Database.`,
      report,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
