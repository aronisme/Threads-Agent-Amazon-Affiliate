import { NextRequest, NextResponse } from 'next/server';
import ThreadsClient from '@/lib/threads/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || process.env.THREADS_USER_ID;
    const accessToken = body.accessToken || process.env.THREADS_ACCESS_TOKEN;

    if (!userId || !accessToken) {
      return NextResponse.json({
        success: false,
        message: 'Threads User ID and Access Token must be provided.',
      });
    }

    if (accessToken.startsWith('mock_')) {
      return NextResponse.json({
        success: true,
        message: 'Simulation Mock Token verified successfully. Ready for dry-run testing.',
        profile: {
          id: userId,
          username: 'threads_creator_ai (Simulated)',
        },
      });
    }

    // Call live Threads Graph API /me endpoint
    const client = new ThreadsClient(userId, accessToken, false);
    const profile = await client.getProfile();

    if (profile.error) {
      return NextResponse.json({
        success: false,
        message: `Threads API Error: ${profile.error.message || 'Invalid Token or ID'}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Connected successfully as @${profile.username || 'user'} (ID: ${profile.id})`,
      profile,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `Connection failed: ${err.message}`,
    });
  }
}
