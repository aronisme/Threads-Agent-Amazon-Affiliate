import { NextRequest, NextResponse } from 'next/server';
import jobQueue from '@/lib/scheduler/queue';
import workerRunner from '@/lib/scheduler/worker';
import stateManager from '@/lib/memory/stateManager';
import { getUSHour } from '@/lib/engines/socialEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Optional CRON_SECRET authorization check
    const authHeader = req.headers.get('authorization');
    const secretParam = req.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secretParam !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized wake signal' }, { status: 401 });
    }

    // 2. Master Kill-Switch: If agent is paused, exit immediately without executing any work
    const state = await stateManager.getState();
    if (state.isPaused) {
      return NextResponse.json({
        success: true,
        action: 'PAUSED',
        reason: 'Agent is currently paused via Master Toggle Switch.',
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Claim next pending job due in queue (e.g. scheduled delayed self-reply)
    let claimed = await jobQueue.claimNext();
    let executionResult = null;

    if (claimed) {
      // Execute the pending job
      executionResult = await workerRunner.executeJob(claimed);
      if (executionResult.success) {
        await jobQueue.complete(claimed._id.toString());
      } else {
        await jobQueue.fail(claimed._id.toString(), executionResult.error || 'Failed');
      }

      await jobQueue.pruneOldJobs(2);

      return NextResponse.json({
        success: true,
        action: 'EXECUTED_PENDING_JOB',
        jobType: claimed.type,
        execution: executionResult,
        durationMs: Date.now() - startTime,
      });
    }

    // 4. If queue is empty, evaluate whether a new action is allowed
    const now = new Date();

    const usHour = getUSHour('America/New_York');
    const isUSAwake = usHour >= 7 && usHour < 23;

    const MAX_DAILY_POSTS = 14;
    const isPostAllowed =
      isUSAwake &&
      (!state.cooldowns.nextPostAllowedAt || new Date(state.cooldowns.nextPostAllowedAt) <= now) &&
      state.dailyActions.postsCount < MAX_DAILY_POSTS;

    // Check replies: In autonomous mode (Level 2 & 3), actively monitor inbound replies
    const shouldCheckReplies = state.autonomyLevel >= 2;

    if (isPostAllowed) {
      // Evolve mood naturally before composing
      await stateManager.evolveMood();

      const job = await jobQueue.enqueue('COMPOSE_POST', {});
      claimed = await jobQueue.claimNext();

      if (claimed) {
        executionResult = await workerRunner.executeJob(claimed);
        if (executionResult.success) {
          await jobQueue.complete(claimed._id.toString());
        } else {
          await jobQueue.fail(claimed._id.toString(), executionResult.error || 'Failed');
        }
      }

      return NextResponse.json({
        success: true,
        action: 'COMPOSED_POST',
        execution: executionResult,
        dailyActions: state.dailyActions,
        durationMs: Date.now() - startTime,
      });
    }

    if (shouldCheckReplies) {
      const job = await jobQueue.enqueue('CHECK_REPLIES', {});
      claimed = await jobQueue.claimNext();

      if (claimed) {
        executionResult = await workerRunner.executeJob(claimed);
        if (executionResult.success) {
          await jobQueue.complete(claimed._id.toString());
        } else {
          await jobQueue.fail(claimed._id.toString(), executionResult.error || 'Failed');
        }

        // If new replies were discovered, immediately claim and process the reply in the same cycle
        const discovered = executionResult.result?.repliesDiscovered || 0;
        if (discovered > 0) {
          const replyJob = await jobQueue.claimNext();
          if (replyJob) {
            const replyExec = await workerRunner.executeJob(replyJob);
            if (replyExec.success) {
              await jobQueue.complete(replyJob._id.toString());
            } else {
              await jobQueue.fail(replyJob._id.toString(), replyExec.error || 'Failed');
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        action: 'CHECKED_REPLIES',
        execution: executionResult,
        durationMs: Date.now() - startTime,
      });
    }

    // 4. FAST-EXIT: Nothing due, cooldown active or US night rest. Return immediately (<50ms) to conserve Vercel compute
    const nextAllowedMinutes = state.cooldowns.nextPostAllowedAt
      ? Math.max(0, Math.ceil((new Date(state.cooldowns.nextPostAllowedAt).getTime() - now.getTime()) / 60000))
      : 0;

    const fastExitReason = !isUSAwake
      ? `US audience sleeping (Current US Eastern: ${usHour}:00). Rest mode active (07:00 - 23:00 ET).`
      : `Post cooldown active (${nextAllowedMinutes}m remaining). No pending jobs.`;

    await stateManager.recordLastAction('DO_NOTHING', undefined, 'NONE', `Fast-exit: ${fastExitReason}`);

    return NextResponse.json({
      success: true,
      action: 'DO_NOTHING',
      reason: fastExitReason,
      usEasternHour: usHour,
      isUSAwake,
      nextPostAllowedInMinutes: nextAllowedMinutes,
      dailyActions: state.dailyActions,
      durationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('❌ Cron Wake Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
