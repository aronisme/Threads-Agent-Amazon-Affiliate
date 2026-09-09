import { NextRequest, NextResponse } from 'next/server';
import stateManager from '@/lib/memory/stateManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await stateManager.getState();
    const raw = typeof state?.toObject === 'function' ? state.toObject() : { ...state };

    const effectiveUserId = state.credentials?.userId || process.env.THREADS_USER_ID || '';
    const effectiveToken = state.credentials?.accessToken || process.env.THREADS_ACCESS_TOKEN || '';

    // Safely mask access token for frontend display
    const maskedToken = effectiveToken
      ? `${effectiveToken.substring(0, 6)}...${effectiveToken.substring(effectiveToken.length - 4)}`
      : '';

    return NextResponse.json({
      success: true,
      state: {
        ...raw,
        threadsUserId: effectiveUserId,
        hasToken: Boolean(effectiveToken),
        maskedToken,
        aiConfig: {
          ...raw.aiConfig,
          hasMistral: Boolean(raw.aiConfig?.mistralKeys?.length || process.env.MISTRAL_API_KEY),
          hasGroq: Boolean(raw.aiConfig?.groqKeys?.length || process.env.GROQ_API_KEYS),
          hasXkiro: Boolean(raw.aiConfig?.xkiroKeys?.length || process.env.XKIRO_API_KEY),
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    // Special action: Reset daily limit and cooldowns
    if (body.action === 'RESET_POSTS') {
      const resetState = await stateManager.resetDailyPosts();
      return NextResponse.json({
        success: true,
        message: 'Daily posts counter reset to 0',
        state: resetState,
      });
    }

    // Try updating local .env safely (dev mode only, non-blocking on Vercel)
    try {
      const envUpdates: Record<string, string> = {};
      if (body.threadsUserId) envUpdates.THREADS_USER_ID = body.threadsUserId;
      if (body.threadsAccessToken) envUpdates.THREADS_ACCESS_TOKEN = body.threadsAccessToken;
      if (body.dryRunMode !== undefined) envUpdates.DRY_RUN = String(body.dryRunMode);

      if (Object.keys(envUpdates).length > 0 && process.env.NODE_ENV !== 'production') {
        const { updateLocalEnv } = await import('@/lib/utils/envHelper');
        updateLocalEnv(envUpdates);
      }
    } catch {
      // Ignore local file write failures on serverless read-only disk
    }

    const updated = await stateManager.updateState(body);
    return NextResponse.json({ success: true, state: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
