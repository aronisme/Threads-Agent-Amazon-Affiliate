import mongoose, { Schema, Document } from 'mongoose';
import { IPost } from '@/types';

export interface PostDocument extends Omit<IPost, '_id'>, Document {}

const PostSchema = new Schema<PostDocument>(
  {
    threadsId: { type: String, default: null, index: true },
    creationId: { type: String, default: null },
    type: {
      type: String,
      enum: ['ORIGINAL_THOUGHT', 'QUESTION', 'STORY', 'CONTEXTUAL_PRODUCT', 'SELF_REPLY', 'COMMUNITY_REPLY'],
      required: true,
      index: true,
    },
    text: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
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
