import mongoose, { Schema, Document } from 'mongoose';
import { IJob } from '@/types';

export interface JobDocument extends Omit<IJob, '_id'>, Document {}

const JobSchema = new Schema<JobDocument>(
  {
    type: {
      type: String,
      enum: ['DISCOVER_TOPICS', 'CHECK_REPLIES', 'COMPOSE_POST', 'GENERATE_REPLY', 'PUBLISH_ITEM'],
      required: true,
      index: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    scheduledFor: { type: Date, default: Date.now, index: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    lockedAt: { type: Date, default: null },
    errorLog: { type: String, default: null },
  },
  {
    timestamps: true,
    collection: 'jobs',
  }
);

export const Job = mongoose.models.Job || mongoose.model<JobDocument>('Job', JobSchema);

export default Job;
