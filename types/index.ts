export type AutonomyLevel = 0 | 1 | 2 | 3;

export type AgentMood = 'CURIOUS' | 'CONTEMPLATIVE' | 'SARCASTIC' | 'CHILL' | 'HELPFUL';

export type PostType =
  | 'ORIGINAL_THOUGHT'
  | 'QUESTION'
  | 'STORY'
  | 'CONTEXTUAL_PRODUCT'
  | 'SELF_REPLY'
  | 'COMMUNITY_REPLY';

export type ReplyClass = 'AGREE' | 'DISAGREE' | 'ADD_VALUE' | 'PLAYFUL';

export type PostStatus = 'DRAFT' | 'QUEUED' | 'PUBLISHED' | 'REJECTED';

export type JobType =
  | 'DISCOVER_TOPICS'
  | 'CHECK_REPLIES'
  | 'COMPOSE_POST'
  | 'GENERATE_REPLY'
  | 'PUBLISH_ITEM';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type SocialAction = 'POST' | 'REPLY' | 'DO_NOTHING';

export type AffiliateMode = 'NONE' | 'MENTION_ONLY' | 'SOFT_RECOMMENDATION' | 'DIRECT_LINK';

export interface IVisualContext {
  aestheticStyle: string;
  dominantColors: string[];
  materials: string[];
  scaleAndForm: string;
  keyVisualHooks: string[];
  summaryDescription: string;
  provider?: 'groq' | 'xkiro' | 'mistral' | 'heuristic' | 'mock';
  modelUsed?: string;
  analyzedAt?: Date;
}

export interface IProduct {
  _id?: string;
  name: string;
  brand?: string;
  asin?: string;
  affiliateUrl: string;
  category: string;
  notes: string;
  imageUrl?: string;
  videoUrl?: string;
  images?: string[];
  videos?: string[];
  lastMediaUsedUrl?: string;
  lastMediaTypeUsed?: 'NONE' | 'IMAGE' | 'VIDEO';
  mediaType?: 'NONE' | 'IMAGE' | 'VIDEO';
  visualContext?: IVisualContext;
  useCases?: string[];
  allowedClaims?: string[];
  targetPersonas?: string[];
  active: boolean;
  timesMentioned: number;
  timesLinked?: number;
  lastMentionedAt?: Date | null;
  lastLinkedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPost {
  _id?: string;
  threadsId?: string;
  creationId?: string;
  type: PostType;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO';
  productId?: string;
  parentId?: string;
  replyClass?: ReplyClass;
  status: PostStatus;
  simulationData?: {
    fitScore: number;
    reasoning: string;
    targetTopic?: string;
  };
  createdAt: Date;
  publishedAt?: Date;
}

export interface IConversation {
  _id?: string;
  threadId: string;
  rootAuthorUsername: string;
  topic: string;
  snippet: string;
  participants: string[];
  contextSummary: string;
  ourReplyPostId?: string;
  lastCheckedAt: Date;
  status: 'DISCOVERED' | 'EVALUATING' | 'ENGAGED' | 'IGNORED';
  createdAt: Date;
}

export interface IPerson {
  _id?: string;
  threadsUserId: string;
  username: string;
  displayName?: string;
  interests: string[];
  relationship: 'STRANGER' | 'ACQUAINTANCE' | 'FRIENDLY' | 'REGULAR';
  interactionCount: number;
  lastInteractionAt: Date;
  notes?: string;
}

export interface IMemory {
  _id?: string;
  scope: 'TOPIC' | 'JOKE' | 'OPINION' | 'PRODUCT_MENTION' | 'HOOK';
  key: string;
  value: string;
  importance: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJob {
  _id?: string;
  type: JobType;
  payload: Record<string, any>;
  status: JobStatus;
  scheduledFor: Date;
  attempts: number;
  maxAttempts: number;
  lockedAt?: Date | null;
  errorLog?: string | null;
  createdAt: Date;
}

export interface IPersonaConfig {
  identityName: string;
  tagline: string;
  humorLevel: number;       // 1-10
  sarcasmLevel: number;     // 1-10
  warmth: number;           // 1-10
  slangFrequency: number;   // 1-10
  emojiFrequency: number;   // 0-5
  salesiness: number;       // 0-5
  opinionatedness: number;  // 1-10
  postLength: 'short' | 'medium' | 'varied';
  nicheTopics: string[];
  topicsToAvoid: string[];
}

export interface IAgentState {
  _id?: string;
  currentMood: AgentMood;
  persona: IPersonaConfig;
  recentTopics: string[];
  recentHooks: string[];
  recentPhrases: string[];
  recentProducts: string[];
  peopleToFollowUp: string[];
  cooldowns: {
    productMentionUntil?: Date;
    selfReplyUntil?: Date;
    nextPostAllowedAt?: Date;
  };
  dailyActions: {
    date: string;
    postsCount: number;
    repliesCount: number;
    productMentionsCount: number;
  };
  autonomyLevel: AutonomyLevel;
  dryRunMode: boolean;
  commercialPressureScore?: number; // 0.0 to 1.0
  commercialBudget?: {
    dailyLimit: number;    // e.g. 2.5
    currentSpent: number;  // weighted sum: direct_link=1.0, soft_rec=0.4, mention=0.15
    lastResetDate: string;
  };
  lastAction?: {
    action: SocialAction;
    type?: string;
    affiliateMode?: AffiliateMode;
    timestamp: Date;
    summary?: string;
  };
  updatedAt: Date;
}
