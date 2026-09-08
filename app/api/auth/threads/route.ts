import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const appId = process.env.THREADS_APP_ID || process.env.FB_APP_ID || '2641379366258147';
  const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/threads/callback`;

  const scope = 'threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies';
  const authUrl = `https://threads.net/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${scope}&response_type=code`;

  return NextResponse.redirect(authUrl);
}
