import mongoose, { Schema, Document } from 'mongoose';
import { IProduct } from '@/types';

export interface ProductDocument extends Omit<IProduct, '_id'>, Document {}

const ProductSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: '', trim: true },
    asin: { type: String, default: '', trim: true },
    affiliateUrl: { type: String, required: true, trim: true },
    category: { type: String, default: 'general', trim: true },
    notes: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: null, trim: true },
    videoUrl: { type: String, default: null, trim: true },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    lastMediaUsedUrl: { type: String, default: null },
    lastMediaTypeUsed: {
      type: String,
      enum: ['NONE', 'IMAGE', 'VIDEO'],
      default: 'NONE',
    },
    mediaType: {
      type: String,
      enum: ['NONE', 'IMAGE', 'VIDEO'],
      default: 'NONE',
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
    useCases: { type: [String], default: [] },
    allowedClaims: { type: [String], default: [] },
    targetPersonas: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    timesMentioned: { type: Number, default: 0 },
    timesLinked: { type: Number, default: 0 },
    lastMentionedAt: { type: Date, default: null },
    lastLinkedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'products', // Maps cleanly to products
  }
);

// Prevent mongoose overwrite error in Next.js hot-reloading
export const Product =
  mongoose.models.Product || mongoose.model<ProductDocument>('Product', ProductSchema);

export default Product;
