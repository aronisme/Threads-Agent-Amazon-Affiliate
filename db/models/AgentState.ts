import mongoose, { Schema, Document } from 'mongoose';
import { IAgentState } from '@/types';

export interface AgentStateDocument extends Omit<IAgentState, '_id'>, Document {}

const PersonaSchema = new Schema(
  {
    identityName: { type: String, default: 'Alex' },
    tagline: { type: String, default: 'Curious tech enthusiast & minimalist desk builder' },
    humorLevel: { type: Number, default: 7, min: 1, max: 10 },
    sarcasmLevel: { type: Number, default: 4, min: 1, max: 10 },
    warmth: { type: Number, default: 7, min: 1, max: 10 },
    slangFrequency: { type: Number, default: 5, min: 1, max: 10 },
    emojiFrequency: { type: Number, default: 2, min: 0, max: 5 },
    salesiness: { type: Number, default: 2, min: 0, max: 5 },
    opinionatedness: { type: Number, default: 7, min: 1, max: 10 },
    postLength: { type: String, enum: ['short', 'medium', 'varied'], default: 'varied' },
    nicheTopics: {
      type: [String],
      default: ['desk setup', 'work from home', 'everyday tech', 'productivity hacks', 'minimalism'],
    },
    topicsToAvoid: {
      type: [String],
      default: ['politics', 'crypto spam', 'hard-sell affiliate jargon', 'get-rich-quick'],
    },
  },
  { _id: false }
);

const AgentStateSchema = new Schema<AgentStateDocument>(
  {
    currentMood: {
      type: String,
      enum: ['CURIOUS', 'CONTEMPLATIVE', 'SARCASTIC', 'CHILL', 'HELPFUL'],
      default: 'CURIOUS',
    },
    persona: { type: PersonaSchema, default: () => ({}) },
    recentTopics: [{ type: String }],
    recentHooks: [{ type: String }],
    recentPhrases: [{ type: String }],
    recentProducts: [{ type: String }],
    peopleToFollowUp: [{ type: String }],
    cooldowns: {
      productMentionUntil: { type: Date, default: null },
      selfReplyUntil: { type: Date, default: null },
      nextPostAllowedAt: { type: Date, default: null },
    },
    dailyActions: {
      date: { type: String, default: () => new Date().toISOString().split('T')[0] },
      postsCount: { type: Number, default: 0 },
      repliesCount: { type: Number, default: 0 },
      productMentionsCount: { type: Number, default: 0 },
    },
    autonomyLevel: { type: Number, default: 1, min: 0, max: 3 },
    dryRunMode: { type: Boolean, default: true },
    commercialPressureScore: { type: Number, default: 0.0, min: 0.0, max: 1.0 },
    commercialBudget: {
      dailyLimit: { type: Number, default: 2.5 },
      currentSpent: { type: Number, default: 0.0 },
      lastResetDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
    },
    lastAction: {
      action: { type: String, enum: ['POST', 'REPLY', 'DO_NOTHING'], default: 'DO_NOTHING' },
      type: { type: String, default: null },
      affiliateMode: { type: String, enum: ['NONE', 'MENTION_ONLY', 'SOFT_RECOMMENDATION', 'DIRECT_LINK'], default: 'NONE' },
      timestamp: { type: Date, default: () => new Date() },
      summary: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    collection: 'agent_state',
  }
);

export const AgentState =
  mongoose.models.AgentState || mongoose.model<AgentStateDocument>('AgentState', AgentStateSchema);

export default AgentState;
