import { NextRequest, NextResponse } from 'next/server';
import Job from '@/db/models/Job';
import workerRunner from '@/lib/scheduler/worker';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incomingText, authorUsername, replyToId } = body;

    if (!incomingText) {
      return NextResponse.json({ success: false, error: 'incomingText is required' }, { status: 400 });
    }

    const job = new Job({
      type: 'GENERATE_REPLY',
      payload: {
        text: incomingText,
        authorUsername: authorUsername || 'anonymous_user',
        replyToId: replyToId || `mock_reply_target_${Date.now()}`,
      },
      status: 'PROCESSING',
      scheduledFor: new Date(),
    });

    const execution = await workerRunner.executeJob(job);
    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    console.error('❌ Error in /api/agent/reply:', err);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
