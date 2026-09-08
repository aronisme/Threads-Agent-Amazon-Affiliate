import { NextRequest, NextResponse } from 'next/server';
import Job from '@/db/models/Job';
import workerRunner from '@/lib/scheduler/worker';
import stateManager from '@/lib/memory/stateManager';

export async function POST(req: NextRequest) {
  try {
    const job = new Job({
      type: 'DISCOVER_TOPICS',
      payload: {},
      status: 'PROCESSING',
      scheduledFor: new Date(),
    });

    const execution = await workerRunner.executeJob(job);
    const state = await stateManager.getState();

    return NextResponse.json({
      success: true,
      execution,
      recentTopics: state.recentTopics,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
