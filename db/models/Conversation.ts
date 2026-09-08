import mongoose, { Schema, Document } from 'mongoose';
import { IConversation } from '@/types';

export interface ConversationDocument extends Omit<IConversation, '_id'>, Document {}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    threadId: { type: String, required: true, unique: true, index: true },
    rootAuthorUsername: { type: String, required: true },
    topic: { type: String, default: '' },
    snippet: { type: String, default: '' },
    participants: [{ type: String }],
    contextSummary: { type: String, default: '' },
    ourReplyPostId: { type: String, default: null },
    lastCheckedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['DISCOVERED', 'EVALUATING', 'ENGAGED', 'IGNORED'],
      default: 'DISCOVERED',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'conversations',
  }
);

export const Conversation =
  mongoose.models.Conversation || mongoose.model<ConversationDocument>('Conversation', ConversationSchema);

export default Conversation;
