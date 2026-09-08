import { NextRequest, NextResponse } from 'next/server';
import Job from '@/db/models/Job';
import workerRunner from '@/lib/scheduler/worker';
import { PostType } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const postType: PostType = body.type;
    const topic = body.topic;
    const productId = body.productId;

    // Create a transient job document for immediate execution
    const job = new Job({
      type: 'COMPOSE_POST',
      payload: { type: postType, topic, productId },
      status: 'PROCESSING',
      scheduledFor: new Date(),
    });

    const execution = await workerRunner.executeJob(job);
    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
