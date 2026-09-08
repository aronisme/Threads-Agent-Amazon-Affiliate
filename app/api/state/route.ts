import { NextRequest, NextResponse } from 'next/server';
import stateManager from '@/lib/memory/stateManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await stateManager.getState();
    const raw = typeof state?.toObject === 'function' ? state.toObject() : { ...state };
    return NextResponse.json({
      success: true,
      state: {
        ...raw,
        threadsUserId: process.env.THREADS_USER_ID || '',
        hasToken: !!process.env.THREADS_ACCESS_TOKEN,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();

    const envUpdates: Record<string, string> = {};
    if (body.threadsUserId) {
      envUpdates.THREADS_USER_ID = body.threadsUserId;
    }
    if (body.threadsAccessToken) {
      envUpdates.THREADS_ACCESS_TOKEN = body.threadsAccessToken;
    }
    if (body.dryRunMode !== undefined) {
      envUpdates.DRY_RUN = String(body.dryRunMode);
    }

    if (Object.keys(envUpdates).length > 0) {
      const { updateLocalEnv } = await import('@/lib/utils/envHelper');
      updateLocalEnv(envUpdates);
    }

    const updated = await stateManager.updateState(body);
    return NextResponse.json({ success: true, state: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
