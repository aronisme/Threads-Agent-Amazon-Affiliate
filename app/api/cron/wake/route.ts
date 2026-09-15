import { NextRequest, NextResponse } from 'next/server';
import jobQueue from '@/lib/scheduler/queue';
import workerRunner from '@/lib/scheduler/worker';
import stateManager from '@/lib/memory/stateManager';
import { getUSHour } from '@/lib/engines/socialEngine';
import { refreshThreadsToken } from '@/lib/threads/tokens';
import Post from '@/db/models/Post';
import ThreadsClient from '@/lib/threads/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    // 2.5 K2+K3 FIX: Auto-refresh Meta Threads token before it expires.
    // Token lasts 60 days; refresh when 15 days or less remain, or every 30 days if no expiry date recorded.
    try {
      const token = state.credentials?.accessToken || process.env.THREADS_ACCESS_TOKEN;
      const tokenExpiry = state.credentials?.tokenExpiresAt ? new Date(state.credentials.tokenExpiresAt) : null;
      const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

      const shouldRefresh = token && !token.startsWith('mock_') && (
        // Case 1: Expiry date is known and within 15 days
        (tokenExpiry && tokenExpiry.getTime() - Date.now() < FIFTEEN_DAYS_MS) ||
        // Case 2: No expiry date recorded — refresh every 30 days as safety net
        (!tokenExpiry && state.credentials?.userId)
      );

      if (shouldRefresh) {
        console.info('🔄 [TokenRefresh] Attempting Threads long-lived token refresh...');
        const refreshResult = await refreshThreadsToken(token);
        if (refreshResult.success && refreshResult.accessToken) {
          const newExpiresAt = new Date(Date.now() + (refreshResult.expiresIn || 5184000) * 1000);
          await stateManager.updateState({
            credentials: {
              ...state.credentials,
              accessToken: refreshResult.accessToken,
              tokenExpiresAt: newExpiresAt,
            },
          });
          console.info(`✅ [TokenRefresh] Token refreshed successfully. New expiry: ${newExpiresAt.toISOString()}`);
        } else if (refreshResult.error) {
          console.warn(`⚠️ [TokenRefresh] Refresh failed: ${refreshResult.error}`);
        }
      }
    } catch (tokenErr: any) {
      // Non-blocking: token refresh failure should not stop the cron cycle
      console.warn('⚠️ [TokenRefresh] Non-blocking error:', tokenErr.message);
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

    // 4. Auto-publish scheduled Lab posts whose time has arrived
    try {
      const now = new Date();
      const dueScheduled = await Post.find({
        status: 'SCHEDULED',
        source: 'LAB',
        scheduledFor: { $lte: now },
      }).sort({ scheduledFor: 1 }).limit(3);

      if (dueScheduled.length > 0) {
        const threadsClient = new ThreadsClient(undefined, undefined, state.dryRunMode);
        const publishedIds: string[] = [];

        for (const post of dueScheduled) {
          try {
            let pubResult: any;
            if (post.mediaType === 'CAROUSEL' && post.imageUrls && post.imageUrls.length >= 2) {
              pubResult = await threadsClient.publishCarousel({
                text: post.text,
                imageUrls: post.imageUrls,
              });
            } else {
              pubResult = await threadsClient.publishPost({
                text: post.text,
                imageUrl: post.imageUrl || undefined,
                videoUrl: post.videoUrl || undefined,
              });
            }

            if (pubResult.success) {
              post.status = 'PUBLISHED';
              post.threadsId = pubResult.threadsId;
              post.creationId = pubResult.creationId;
              post.publishedAt = new Date();
              await post.save();
              publishedIds.push(post._id.toString());
              console.info(`📅 [ScheduledPublish] Published scheduled Lab post: ${post._id}`);
            }
          } catch (pubErr: any) {
            console.warn(`⚠️ [ScheduledPublish] Failed to publish ${post._id}:`, pubErr.message);
          }
        }

        if (publishedIds.length > 0) {
          return NextResponse.json({
            success: true,
            action: 'PUBLISHED_SCHEDULED',
            publishedCount: publishedIds.length,
            publishedIds,
            durationMs: Date.now() - startTime,
          });
        }
      }
    } catch (schedErr: any) {
      console.warn('⚠️ [ScheduledPublish] Non-blocking error:', schedErr.message);
    }

    // 5. If queue is empty, evaluate whether a new action is allowed
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

    // M2 FIX: Check replies during cooldown gaps AND when post quota is exhausted.
    // Previously this only ran when isPostAllowed was false AND autonomy >= 2,
    // missing all comments during the 25-45 min gaps between posts.
    // Now it runs whenever the agent is awake and autonomous but can't post yet.
    if (shouldCheckReplies && isUSAwake) {
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
