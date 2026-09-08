import { NextRequest, NextResponse } from 'next/server';
import jobQueue from '@/lib/scheduler/queue';
import workerRunner from '@/lib/scheduler/worker';
import stateManager from '@/lib/memory/stateManager';

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

    // 2. Claim next pending job due in queue (e.g. scheduled delayed self-reply)
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

    // 3. If queue is empty, evaluate whether a new action is allowed
    const state = await stateManager.getState();
    const now = new Date();

    const isPostAllowed =
      (!state.cooldowns.nextPostAllowedAt || new Date(state.cooldowns.nextPostAllowedAt) <= now) &&
      state.dailyActions.postsCount < 6;

    // Check if we should poll replies: only if we have active posts and randomly on ~15% of pings
    const shouldCheckReplies =
      state.dailyActions.postsCount > 0 && Math.random() < 0.15;

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
      }

      return NextResponse.json({
        success: true,
        action: 'CHECKED_REPLIES',
        execution: executionResult,
        durationMs: Date.now() - startTime,
      });
    }

    // 4. FAST-EXIT: Nothing due, cooldown active. Return immediately (<50ms) to conserve Vercel compute
    const nextAllowedMinutes = state.cooldowns.nextPostAllowedAt
      ? Math.max(0, Math.ceil((new Date(state.cooldowns.nextPostAllowedAt).getTime() - now.getTime()) / 60000))
      : 0;

    await stateManager.recordLastAction('DO_NOTHING', undefined, 'NONE', `Fast-exit: Cooldown active (${nextAllowedMinutes}m remaining)`);

    return NextResponse.json({
      success: true,
      action: 'DO_NOTHING',
      reason: `Post cooldown active (${nextAllowedMinutes}m remaining). No pending jobs.`,
      nextPostAllowedInMinutes: nextAllowedMinutes,
      dailyActions: state.dailyActions,
      durationMs: Date.now() - startTime,
    });
  } catch (err: any) {
    console.error('❌ Cron Wake Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
