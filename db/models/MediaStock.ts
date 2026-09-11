import mongoose, { Schema, Document } from 'mongoose';
import { IMediaStock } from '@/types';

export interface MediaStockDocument extends Omit<IMediaStock, '_id'>, Document {}

const MediaStockSchema = new Schema<MediaStockDocument>(
  {
    title: { type: String, required: true, trim: true },
    videoUrl: { type: String, required: true, trim: true },
    thumbnailUrl: { type: String, default: null, trim: true },
    category: {
      type: String,
      enum: ['FUNNY', 'RELATABLE', 'AESTHETIC', 'SATISFYING', 'TECH_MEME', 'GENERAL'],
      default: 'GENERAL',
      index: true,
    },
    visualContext: {
      aestheticStyle: { type: String, default: '' },
      dominantColors: { type: [String], default: [] },
      materials: { type: [String], default: [] },
      scaleAndForm: { type: String, default: '' },
      keyVisualHooks: { type: [String], default: [] },
      summaryDescription: { type: String, default: '' },
      provider: { type: String, default: '' },
      modelUsed: { type: String, default: '' },
      analyzedAt: { type: Date, default: null },
    },
    timesUsed: { type: Number, default: 0 },
    lastUsedAt: { type: Date, default: null },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String, default: '', trim: true },
  },
  {
    timestamps: true,
    collection: 'media_stock',
  }
);

export default mongoose.models.MediaStock ||
  mongoose.model<MediaStockDocument>('MediaStock', MediaStockSchema);
