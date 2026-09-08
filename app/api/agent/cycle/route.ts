import { NextRequest, NextResponse } from 'next/server';
import jobQueue from '@/lib/scheduler/queue';
import workerRunner from '@/lib/scheduler/worker';
import stateManager from '@/lib/memory/stateManager';

export async function POST(req: NextRequest) {
  try {
    const state = await stateManager.getState();

    // 1. Claim next pending job if any
    let job = await jobQueue.claimNext();

    // 2. If no job is pending, dynamically spawn one based on state & schedule
    if (!job) {
      // Rotate mood naturally
      await stateManager.evolveMood();

      // Check if we should poll replies or compose a new post
      const shouldPollReplies = Math.random() < 0.35 && state.dailyActions.postsCount > 0;
      const jobType = shouldPollReplies ? 'CHECK_REPLIES' : 'COMPOSE_POST';

      job = await jobQueue.enqueue(jobType, {});
      job = await jobQueue.claimNext();
    }

    if (!job) {
      return NextResponse.json({ success: true, message: 'No job ready for execution.' });
    }

    // 3. Execute the job
    const execution = await workerRunner.executeJob(job);

    if (execution.success) {
      await jobQueue.complete(job._id.toString());
    } else {
      await jobQueue.fail(job._id.toString(), execution.error || 'Execution failed');
    }

    return NextResponse.json({
      success: true,
      jobType: job.type,
      execution,
      agentMood: state.currentMood,
      dryRun: state.dryRunMode,
    });
  } catch (err: any) {
    console.error('❌ Agent Cycle Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
