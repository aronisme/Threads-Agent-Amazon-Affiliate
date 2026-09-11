import mongoose, { Schema, Document } from 'mongoose';
import { IPost } from '@/types';

export interface PostDocument extends Omit<IPost, '_id'>, Document {}

const PostSchema = new Schema<PostDocument>(
  {
    threadsId: { type: String, default: null, index: true },
    creationId: { type: String, default: null },
    type: {
      type: String,
      enum: ['ORIGINAL_THOUGHT', 'QUESTION', 'STORY', 'CONTEXTUAL_PRODUCT', 'VIRAL_MEDIA', 'SELF_REPLY', 'COMMUNITY_REPLY'],
      required: true,
      index: true,
    },
    text: { type: String, required: true },
    imageUrl: { type: String, default: null, trim: true },
    imageUrls: { type: [String], default: [] },
    videoUrl: { type: String, default: null, trim: true },
    mediaType: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL'],
      default: 'TEXT',
    },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    mediaStockId: { type: Schema.Types.ObjectId, ref: 'MediaStock', default: null },
    parentId: { type: String, default: null, index: true },
    replyClass: {
      type: String,
      enum: ['AGREE', 'DISAGREE', 'ADD_VALUE', 'PLAYFUL'],
      default: null,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'QUEUED', 'PUBLISHED', 'REJECTED'],
      default: 'DRAFT',
      index: true,
    },
    simulationData: {
      fitScore: { type: Number, default: 0 },
      reasoning: { type: String, default: '' },
      targetTopic: { type: String, default: '' },
    },
    publishedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'posts',
  }
);

export const Post = mongoose.models.Post || mongoose.model<PostDocument>('Post', PostSchema);

export default Post;
