import { SocialAction, IAgentState } from '@/types';
import Post from '@/db/models/Post';
import connectToDatabase from '@/db/client';

export interface SocialDecision {
  action: SocialAction;
  reason: string;
  candidateTopic?: string;
  selectedPostType?: 'ORIGINAL_THOUGHT' | 'QUESTION' | 'STORY' | 'CONTEXTUAL_PRODUCT';
}

/**
 * Helper to get current hour in US Eastern Time (New York / ET)
 * Gold standard timezone for US Amazon buyers and Threads creators
 */
export function getUSHour(timezone: string = 'America/New_York'): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    return parseInt(formatter.format(new Date()), 10);
  } catch {
    // Fallback: UTC-4 (EDT) or UTC-5 (EST)
    return (new Date().getUTCHours() - 4 + 24) % 24;
  }
}

export class SocialEngine {
  /**
   * Decide the next social action based solely on social cadence, cooldowns, and engagement.
   * Product catalog is NOT considered here.
   */
  public async decideAction(state: IAgentState): Promise<SocialDecision> {
    const now = new Date();

    // 1. Target Audience: US Amazon Market Active Hours Window
    // US Eastern Time (07:00 AM - 11:30 PM). When US is sleeping (11 PM - 7 AM), DO NOT post new threads.
    const usHour = getUSHour('America/New_York');
    if (usHour >= 23 || usHour < 7) {
      return {
        action: 'DO_NOTHING',
        reason: `US audience is sleeping (Current US Eastern time: ${usHour}:00). Active window: 07:00 - 23:00 ET.`,
      };
    }

    // 2. Check daily posting limits (Keep account human: max 6 posts per day)
    const MAX_DAILY_POSTS = 6;
    if (state.dailyActions.postsCount >= MAX_DAILY_POSTS) {
      return {
        action: 'DO_NOTHING',
        reason: `Daily post quota reached (${state.dailyActions.postsCount}/${MAX_DAILY_POSTS})`,
      };
    }

    // 2. Check cooldown for new top-level posts (min 45 min - 2.5 hours)
    const nextPostAllowed = state.cooldowns.nextPostAllowedAt
      ? new Date(state.cooldowns.nextPostAllowedAt)
      : null;

    if (nextPostAllowed && nextPostAllowed > now) {
      const remainingMinutes = Math.ceil((nextPostAllowed.getTime() - now.getTime()) / (60 * 1000));
      return {
        action: 'DO_NOTHING',
        reason: `Post cooldown active. Next post allowed in ${remainingMinutes}m`,
      };
    }

    // 3. Select topic from persona's niche
    const availableTopics = state.persona.nicheTopics.length > 0
      ? state.persona.nicheTopics
      : ['desk setup', 'gadgets', 'work from home'];

    // Filter out recently covered topics to ensure variety
    const freshTopics = availableTopics.filter((t) => !state.recentTopics.slice(0, 5).includes(t));
    const pool = freshTopics.length > 0 ? freshTopics : availableTopics;
    const chosenTopic = pool[Math.floor(Math.random() * pool.length)];

    // 4. Select post archetype naturally
    // Product contextual post is only a possibility if product cooldown is clear, otherwise pure thoughts/questions/stories
    const canMentionProduct =
      !state.cooldowns.productMentionUntil || new Date(state.cooldowns.productMentionUntil) <= now;

    // Check commercial pressure (if pressure > 0.6, strictly avoid contextual product)
    const pressure = state.commercialPressureScore || 0;
    const allowProductCandidate = canMentionProduct && pressure < 0.6;

    const roll = Math.random();
    let postType: 'ORIGINAL_THOUGHT' | 'QUESTION' | 'STORY' | 'CONTEXTUAL_PRODUCT';

    if (allowProductCandidate && roll < 0.2) {
      postType = 'CONTEXTUAL_PRODUCT';
    } else if (roll < 0.55) {
      postType = 'ORIGINAL_THOUGHT';
    } else if (roll < 0.8) {
      postType = 'QUESTION';
    } else {
      postType = 'STORY';
    }

    return {
      action: 'POST',
      reason: `Social cadence ready. Selected archetype: ${postType} on topic: "${chosenTopic}"`,
      candidateTopic: chosenTopic,
      selectedPostType: postType,
    };
  }
}

export const socialEngine = new SocialEngine();
export default socialEngine;
