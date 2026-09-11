import mongoose, { Schema, Document } from 'mongoose';
import { ITrendTopic } from '@/types';

export interface TrendTopicDocument extends Omit<ITrendTopic, '_id'>, Document {}

const TrendTopicSchema = new Schema<TrendTopicDocument>(
  {
    title: { type: String, required: true, trim: true },
    summary: { type: String, default: '', trim: true },
    source: {
      type: String,
      enum: ['GOOGLE_TRENDS', 'REDDIT', 'GOOGLE_NEWS'],
      required: true,
      index: true,
    },
    sourceUrl: { type: String, default: '', trim: true },
    category: {
      type: String,
      enum: ['TECH', 'DESK_SETUP', 'GADGET', 'WORK_LIFE', 'VIRAL'],
      default: 'TECH',
      index: true,
    },
    region: { type: String, default: 'US', index: true },
    score: { type: Number, default: 100 },
    timesReferenced: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    fetchedAt: { type: Date, default: Date.now, index: true },
    active: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    collection: 'trend_topics',
  }
);

TrendTopicSchema.index({ title: 1, source: 1 }, { unique: true });

export default mongoose.models.TrendTopic ||
  mongoose.model<TrendTopicDocument>('TrendTopic', TrendTopicSchema);
