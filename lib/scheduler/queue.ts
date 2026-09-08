import connectToDatabase from '@/db/client';
import Job, { JobDocument } from '@/db/models/Job';
import { JobType } from '@/types';

// In-memory queue fallback for standalone local execution
const inMemoryJobs: any[] = [];

export class JobQueue {
  /**
   * Enqueue a new asynchronous job
   */
  public async enqueue(type: JobType, payload: Record<string, any> = {}, delayMinutes: number = 0): Promise<any> {
    const conn = await connectToDatabase();
    const scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);

    if (!conn) {
      const mockJob = {
        _id: `job_mock_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        payload,
        status: 'PENDING',
        scheduledFor,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      };
      inMemoryJobs.push(mockJob);
      return mockJob;
    }

    const job = await Job.create({
      type,
      payload,
      status: 'PENDING',
      scheduledFor,
      attempts: 0,
      maxAttempts: 3,
    });

    return job;
  }

  /**
   * Claim next pending job that is due
   */
  public async claimNext(): Promise<any> {
    const conn = await connectToDatabase();
    const now = new Date();

    if (!conn) {
      const idx = inMemoryJobs.findIndex((j) => j.status === 'PENDING' && j.scheduledFor <= now);
      if (idx !== -1) {
        const job = inMemoryJobs[idx];
        job.status = 'PROCESSING';
        job.lockedAt = now;
        job.attempts += 1;
        return job;
      }
      return null;
    }

    // Find and atomically lock the next job
    const job = await Job.findOneAndUpdate(
      {
        status: 'PENDING',
        scheduledFor: { $lte: now },
        $or: [{ lockedAt: null }, { lockedAt: { $lt: new Date(now.getTime() - 5 * 60 * 1000) } }],
      },
      {
        $set: {
          status: 'PROCESSING',
          lockedAt: now,
        },
        $inc: { attempts: 1 },
      },
      { sort: { scheduledFor: 1 }, new: true }
    );

    return job;
  }

  /**
   * Mark job as completed
   */
  public async complete(jobId: string): Promise<void> {
    const conn = await connectToDatabase();
    if (!conn) {
      const job = inMemoryJobs.find((j) => j._id === jobId);
      if (job) job.status = 'COMPLETED';
      return;
    }
    await Job.findByIdAndUpdate(jobId, {
      status: 'COMPLETED',
      lockedAt: null,
    });
  }

  /**
   * Mark job as failed or re-schedule if attempts remain
   */
  public async fail(jobId: string, errorMsg: string): Promise<void> {
    const conn = await connectToDatabase();
    if (!conn) {
      const job = inMemoryJobs.find((j) => j._id === jobId);
      if (job) {
        job.status = 'FAILED';
        job.errorLog = errorMsg;
      }
      return;
    }

    const job = await Job.findById(jobId);
    if (!job) return;

    if (job.attempts < job.maxAttempts) {
      job.status = 'PENDING';
      job.scheduledFor = new Date(Date.now() + 5 * 60 * 1000); // Retry in 5 minutes
      job.lockedAt = null;
      job.errorLog = errorMsg;
    } else {
      job.status = 'FAILED';
      job.lockedAt = null;
      job.errorLog = errorMsg;
    }

    await job.save();
  }

  /**
   * Clean up old completed jobs (keep queue lightweight)
   */
  public async pruneOldJobs(days: number = 3): Promise<void> {
    const conn = await connectToDatabase();
    if (!conn) return;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await Job.deleteMany({ status: 'COMPLETED', createdAt: { $lt: cutoff } });
  }
}

export const jobQueue = new JobQueue();
export default jobQueue;
