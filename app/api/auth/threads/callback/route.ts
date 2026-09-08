import { NextRequest, NextResponse } from 'next/server';
import stateManager from '@/lib/memory/stateManager';
import ThreadsClient from '@/lib/threads/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/api/auth/threads/callback`;
  const code = req.nextUrl.searchParams.get('code');
  const error = req.nextUrl.searchParams.get('error');
  const errorReason = req.nextUrl.searchParams.get('error_reason');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  if (error || !code) {
    console.error('❌ Threads OAuth Error:', error, errorReason, errorDescription);
    return NextResponse.redirect(
      `${origin}/settings?auth_error=${encodeURIComponent(errorDescription || error || 'Missing authorization code')}`
    );
  }

  const appId = process.env.THREADS_APP_ID || process.env.FB_APP_ID || '2641379366258147';
  const appSecret = process.env.THREADS_APP_SECRET || process.env.FB_APP_SECRET || '7c8b440eb18dd96a776e81f2dce453b8';

  try {
    // 1. Exchange code for short-lived token
    const tokenForm = new URLSearchParams();
    tokenForm.append('client_id', appId);
    tokenForm.append('client_secret', appSecret);
    tokenForm.append('grant_type', 'authorization_code');
    tokenForm.append('redirect_uri', redirectUri);
    tokenForm.append('code', code);

    const tokenRes = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenForm.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(tokenData.error?.message || `Failed to exchange short-lived token: HTTP ${tokenRes.status}`);
    }

    const shortToken = tokenData.access_token;
    const userId = tokenData.user_id?.toString();

    // 2. Exchange short-lived token for 60-day Long-Lived Token
    const longLivedUrl = `https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`;
    const longRes = await fetch(longLivedUrl);
    const longData = await longRes.json();

    const finalAccessToken = longData.access_token || shortToken;

    // 3. Fetch username/profile
    const client = new ThreadsClient(userId, finalAccessToken, false);
    const profile = await client.getProfile().catch(() => ({ username: 'averyfoundit' }));
    const username = profile.username || 'averyfoundit';

    // 4. Save to AgentState & update process.env & .env.local
    process.env.THREADS_USER_ID = userId;
    process.env.THREADS_ACCESS_TOKEN = finalAccessToken;
    process.env.DRY_RUN = 'false';

    const { updateLocalEnv } = await import('@/lib/utils/envHelper');
    updateLocalEnv({
      THREADS_USER_ID: userId,
      THREADS_ACCESS_TOKEN: finalAccessToken,
      DRY_RUN: 'false',
    });

    const currentState = await stateManager.getState();
    await stateManager.updateState({
      dryRunMode: false,
      threadsUserId: userId,
      hasToken: true,
      persona: {
        ...currentState.persona,
        identityName: 'Avery',
        avatarUrl: profile.threads_profile_picture_url || currentState.persona?.avatarUrl || '/avatar.jpg',
      },
    });

    console.log(`✅ Threads account @${username} (ID: ${userId}) connected successfully!`);

    return NextResponse.redirect(
      `${origin}/settings?connected=true&username=${encodeURIComponent(username)}&userId=${encodeURIComponent(userId)}`
    );
  } catch (err: any) {
    console.error('❌ Threads OAuth Callback Error:', err);
    return NextResponse.redirect(
      `${origin}/settings?auth_error=${encodeURIComponent(err.message || 'Token exchange failed')}`
    );
  }
}
