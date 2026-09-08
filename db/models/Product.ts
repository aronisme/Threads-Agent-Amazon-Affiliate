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
