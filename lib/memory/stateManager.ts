import connectToDatabase from '@/db/client';
import AgentState, { AgentStateDocument } from '@/db/models/AgentState';
import { IAgentState, AgentMood } from '@/types';

// In-memory fallback state when MongoDB URI is not set
let inMemoryState: any = {
  currentMood: 'CURIOUS',
  persona: {
    identityName: 'Avery',
    avatarUrl: 'https://res.cloudinary.com/dwgfox722/image/upload/v1788899953/zrji2sezxz1gy5hdpmjn.jpg',
    tagline: 'finding the little things that make everyday life, desk setups & coffee runs better ☕✨',
    humorLevel: 7,
    sarcasmLevel: 3,
    warmth: 9,
    slangFrequency: 5,
    emojiFrequency: 2,
    salesiness: 1,
    opinionatedness: 7,
    postLength: 'varied',
    nicheTopics: [
      'desk setup & workspace aesthetics',
      'cozy work from home routines & habits',
      'clever everyday tech & minimalist gadgets',
      'coffee routines & cafe productivity',
      'smart home office organization & lighting',
      'curated Amazon finds that actually look good',
    ],
    topicsToAvoid: [
      'politics & controversial debates',
      'crypto & web3 spam',
      'hard-sell affiliate marketing & aggressive promos',
      'cheap dropshipping junk',
      'toxic hustle culture & grindset boasting',
    ],
  },
  recentTopics: ['desk cable management', 'cozy coffee bar setup', 'matte monitor light bars'],
  recentHooks: [],
  recentPhrases: [],
  recentProducts: [],
  peopleToFollowUp: [],
  cooldowns: {
    productMentionUntil: null,
    selfReplyUntil: null,
    nextPostAllowedAt: null,
  },
  dailyActions: {
    date: new Date().toISOString().split('T')[0],
    postsCount: 0,
    repliesCount: 0,
    productMentionsCount: 0,
  },
  autonomyLevel: 1,
  dryRunMode: true,
  commercialPressureScore: 0.0,
  commercialBudget: {
    dailyLimit: 4.0,
    currentSpent: 0.0,
    lastResetDate: new Date().toISOString().split('T')[0],
  },
  lastAction: {
    action: 'DO_NOTHING',
    type: null,
    affiliateMode: 'NONE',
    timestamp: new Date(),
    summary: 'System initialized',
  },
  updatedAt: new Date(),
};

export class StateManager {
  /**
   * Get or initialize the singleton agent state
   */
  public async getState(): Promise<any> {
    const conn = await connectToDatabase();
    if (!conn) {
      return inMemoryState;
    }

    let state = await AgentState.findOne();

    if (!state) {
      state = await AgentState.create(inMemoryState);
    }

    // Daily counter & commercial budget auto-reset
    const todayStr = new Date().toISOString().split('T')[0];
    let needsSave = false;

    if (state.dailyActions.date !== todayStr) {
      state.dailyActions = {
        date: todayStr,
        postsCount: 0,
        repliesCount: 0,
        productMentionsCount: 0,
      };
      needsSave = true;
    }

    if (!state.commercialBudget) {
      state.commercialBudget = {
        dailyLimit: 4.0,
        currentSpent: 0.0,
        lastResetDate: todayStr,
      };
      needsSave = true;
    } else if (state.commercialBudget.lastResetDate !== todayStr) {
      state.commercialBudget.currentSpent = 0.0;
      state.commercialBudget.lastResetDate = todayStr;
      state.commercialPressureScore = Math.max(0, (state.commercialPressureScore || 0) * 0.5); // Decay pressure by 50%
      needsSave = true;
    }

    if (needsSave && typeof state.save === 'function') {
      await state.save();
    }

    return state;
  }

  /**
   * Update full or partial agent state
   */
  public async updateState(updates: Partial<IAgentState>): Promise<any> {
    const conn = await connectToDatabase();
    if (!conn) {
      Object.assign(inMemoryState, updates);
      inMemoryState.updatedAt = new Date();
      return inMemoryState;
    }

    let state = await AgentState.findOne();
    if (!state) {
      state = await this.getState();
    }

    Object.assign(state, updates);
    state.updatedAt = new Date();
    await state.save();
    return state;
  }

  /**
   * Record a completed action (post, reply, or product mention)
   */
  public async recordAction(type: 'post' | 'reply' | 'product_mention', topic?: string, productName?: string): Promise<void> {
    const state = await this.getState();

    if (type === 'post') {
      state.dailyActions.postsCount += 1;
      const nextAllowed = new Date(Date.now() + 45 * 60 * 1000);
      state.cooldowns.nextPostAllowedAt = nextAllowed;
    } else if (type === 'reply') {
      state.dailyActions.repliesCount += 1;
    } else if (type === 'product_mention') {
      state.dailyActions.productMentionsCount += 1;
      const coolUntil = new Date(Date.now() + 3 * 60 * 60 * 1000);
      state.cooldowns.productMentionUntil = coolUntil;
    }

    if (topic && !state.recentTopics.includes(topic)) {
      state.recentTopics.unshift(topic);
      if (state.recentTopics.length > 15) state.recentTopics.pop();
    }

    if (productName && !state.recentProducts.includes(productName)) {
      state.recentProducts.unshift(productName);
      if (state.recentProducts.length > 10) state.recentProducts.pop();
    }

    if (typeof state.save === 'function') {
      await state.save();
    }
  }

  /**
   * Rotate or evolve mood naturally based on time or interaction
   */
  public async evolveMood(): Promise<AgentMood> {
    const moods: AgentMood[] = ['CURIOUS', 'CONTEMPLATIVE', 'SARCASTIC', 'CHILL', 'HELPFUL'];
    const randomMood = moods[Math.floor(Math.random() * moods.length)];
    const state = await this.getState();
    state.currentMood = randomMood;
    if (typeof state.save === 'function') {
      await state.save();
    }
    return randomMood;
  }

  /**
   * Record commercial activity impact on budget and pressure
   */
  public async recordCommercialActivity(mode: 'MENTION_ONLY' | 'SOFT_RECOMMENDATION' | 'DIRECT_LINK'): Promise<void> {
    const state = await this.getState();
    const weights: Record<string, number> = {
      DIRECT_LINK: 1.0,
      SOFT_RECOMMENDATION: 0.4,
      MENTION_ONLY: 0.15,
    };

    const weight = weights[mode] || 0.1;

    if (!state.commercialBudget) {
      state.commercialBudget = {
        dailyLimit: 4.0,
        currentSpent: 0.0,
        lastResetDate: new Date().toISOString().split('T')[0],
      };
    }

    state.commercialBudget.currentSpent = +(state.commercialBudget.currentSpent + weight).toFixed(2);

    // Update commercial pressure score (normalized 0.0 to 1.0)
    const ratio = state.commercialBudget.currentSpent / state.commercialBudget.dailyLimit;
    state.commercialPressureScore = +Math.min(1.0, Math.max(0.0, ratio)).toFixed(2);

    // Trigger product mention cooldown if direct link or soft recommendation (2h cooldown)
    if (mode === 'DIRECT_LINK' || mode === 'SOFT_RECOMMENDATION') {
      state.cooldowns.productMentionUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h cooldown
    }

    if (typeof state.save === 'function') {
      await state.save();
    }
  }

  /**
   * Record the last action taken by the agent (for dashboard telemetry)
   */
  public async recordLastAction(action: 'POST' | 'REPLY' | 'DO_NOTHING', type?: string, affiliateMode?: 'NONE' | 'MENTION_ONLY' | 'SOFT_RECOMMENDATION' | 'DIRECT_LINK', summary?: string): Promise<void> {
    const state = await this.getState();
    state.lastAction = {
      action,
      type: type || null,
      affiliateMode: affiliateMode || 'NONE',
      timestamp: new Date(),
      summary: summary || null,
    };

    if (typeof state.save === 'function') {
      await state.save();
    }
  }
}

export const stateManager = new StateManager();
export default stateManager;
