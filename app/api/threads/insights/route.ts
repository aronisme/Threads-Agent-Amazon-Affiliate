import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import stateManager from '@/lib/memory/stateManager';
import ThreadsClient from '@/lib/threads/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const state = await stateManager.getState();
    const userId = state.credentials?.userId || state.threadsUserId || process.env.THREADS_USER_ID;
    const accessToken = state.credentials?.accessToken || process.env.THREADS_ACCESS_TOKEN;
    const threadsClient = new ThreadsClient(userId, accessToken, state.dryRunMode);

    const mediaId = req.nextUrl.searchParams.get('mediaId');

    if (mediaId) {
      const postInsights = await threadsClient.getPostInsights(mediaId);
      return NextResponse.json({
        success: true,
        mediaId,
        insights: postInsights,
      });
    }

    const userInsights = await threadsClient.getUserInsights();
    const profile = await threadsClient.getProfile();

    return NextResponse.json({
      success: true,
      profile,
      insights: userInsights,
    });
  } catch (err: any) {
    console.error('❌ Failed to fetch Threads insights:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch insights' },
      { status: 500 }
    );
  }
}
