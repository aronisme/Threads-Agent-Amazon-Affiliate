import mongoose, { Schema, Document } from 'mongoose';
import { IMemory } from '@/types';

export interface MemoryDocument extends Omit<IMemory, '_id'>, Document {}

const MemorySchema = new Schema<MemoryDocument>(
  {
    scope: {
      type: String,
      enum: ['TOPIC', 'JOKE', 'OPINION', 'PRODUCT_MENTION', 'HOOK'],
      required: true,
      index: true,
    },
    key: { type: String, required: true, index: true },
    value: { type: String, required: true },
    importance: { type: Number, default: 5, min: 1, max: 10 },
    expiresAt: { type: Date, default: null, index: { expires: 0 } },
  },
  {
    timestamps: true,
    collection: 'memories',
  }
);

export const Memory = mongoose.models.Memory || mongoose.model<MemoryDocument>('Memory', MemorySchema);

export default Memory;
