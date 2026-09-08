import connectToDatabase from '@/db/client';
import { JobDocument } from '@/db/models/Job';
import Post from '@/db/models/Post';
import Product from '@/db/models/Product';
import stateManager from '@/lib/memory/stateManager';
import memoryEngine from '@/lib/memory/memoryEngine';
import aiEngine from '@/lib/ai/groqRotator';
import { buildSystemPrompt } from '@/lib/prompts/personaPrompt';
import { buildContentPrompt } from '@/lib/prompts/contentPrompts';
import { buildReplyPrompt } from '@/lib/prompts/replyPrompts';
import { runQualityGate } from '@/lib/moderation/qualityGate';
import ThreadsClient from '@/lib/threads/client';
import jobQueue from '@/lib/scheduler/queue';
import socialEngine from '@/lib/engines/socialEngine';
import affiliateEngine from '@/lib/engines/affiliateEngine';
import { enforceDisclosure } from '@/lib/compliance/disclosure';
import { PostType, ReplyClass, AffiliateMode, SocialAction } from '@/types';

export class WorkerRunner {
  /**
   * Execute a single claimed job
   */
  public async executeJob(job: JobDocument): Promise<{ success: boolean; result?: any; error?: string }> {
    await connectToDatabase();
    const state = await stateManager.getState();
    const threadsClient = new ThreadsClient(undefined, undefined, state.dryRunMode);

    switch (job.type) {
      case 'COMPOSE_POST':
        return await this.handleComposePost(job, state, threadsClient);

      case 'CHECK_REPLIES':
        return await this.handleCheckReplies(job, state, threadsClient);

      case 'GENERATE_REPLY':
        return await this.handleGenerateReply(job, state, threadsClient);

      case 'DISCOVER_TOPICS':
        return await this.handleDiscoverTopics(job, state);

      default:
        return { success: false, error: `Unknown job type: ${job.type}` };
    }
  }

  /**
   * Handle composing an original thought, question, story, or product-related post
   */
  private async handleComposePost(job: JobDocument, state: any, threadsClient: ThreadsClient) {
    let postType: PostType = job.payload.type;
    let chosenTopic: string = job.payload.topic;
    let targetProduct: any = null;

    // 1. If post type is not strictly specified, run SocialEngine decision
    if (!postType) {
      const socialDecision = await socialEngine.decideAction(state);

      if (socialDecision.action === 'DO_NOTHING') {
        await stateManager.recordLastAction('DO_NOTHING', undefined, 'NONE', socialDecision.reason);
        return {
          success: true,
          result: {
            action: 'DO_NOTHING',
            reason: socialDecision.reason,
          },
        };
      }

      postType = socialDecision.selectedPostType || 'ORIGINAL_THOUGHT';
      chosenTopic = socialDecision.candidateTopic || 'desk setup';
    }

    const conn = await connectToDatabase();

    // 2. Affiliate Engine evaluation if type is contextual product or self-reply
    if (postType === 'CONTEXTUAL_PRODUCT') {
      const bestMatch = await affiliateEngine.findBestProduct(chosenTopic || 'tech gadgets', state);
      if (bestMatch.product && bestMatch.relevanceScore >= 0.35) {
        targetProduct = bestMatch.product;
      } else {
        // Fallback to purely organic thought if no product is genuinely relevant
        postType = 'ORIGINAL_THOUGHT';
      }
    } else if (postType === 'SELF_REPLY') {
      if (job.payload.productId) {
        if (conn) {
          targetProduct = await Product.findById(job.payload.productId);
        } else {
          targetProduct = {
            _id: job.payload.productId,
            name: 'Featured Gear',
            affiliateUrl: 'https://amzn.to/3example1',
            notes: 'minimalist desk tool',
          };
        }
      }
    }

    // 3. Select topic fallback
    if (!chosenTopic) {
      const availableTopics = state.persona.nicheTopics.length > 0 ? state.persona.nicheTopics : ['desk setup', 'gadgets'];
      chosenTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
    }

    // 4. Check recent memory
    const recentPosts = await memoryEngine.getRecentPosts(5);
    const recentSummary = recentPosts.join(' | ');

    // 5. Generate content with AI
    const sysPrompt = buildSystemPrompt(state.persona, state.currentMood);
    const userPrompt = buildContentPrompt(postType, chosenTopic, targetProduct, recentSummary);

    const aiRes = await aiEngine.generate({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 350,
    });

    let rawContent = aiRes.text;

    // Apply FTC / Amazon Associates disclosure if direct link in self-reply
    if (postType === 'SELF_REPLY' && targetProduct?.affiliateUrl) {
      const compliance = enforceDisclosure(rawContent, true);
      rawContent = compliance.text;
    }

    // 6. Quality Gate filter
    const quality = runQualityGate(rawContent);

    // 7. Anti-repetition verification
    const repCheck = await memoryEngine.checkRepetition(quality.sanitizedText, state.recentTopics);
    if (repCheck.isRepetitive && repCheck.score > 70) {
      console.warn(`⚠️ Post rejected by anti-repetition check (score: ${repCheck.score}): ${repCheck.reason}`);
    }

    // 8. Determine publishing status based on Autonomy Level & Dry Run
    let status: 'DRAFT' | 'PUBLISHED' | 'QUEUED' = 'DRAFT';
    let publishedResult: any = null;

    if (state.autonomyLevel >= 1 && quality.passed) {
      // Execute publish (or mock simulation in dryRunMode)
      publishedResult = await threadsClient.publishPost({
        text: quality.sanitizedText,
        replyToId: job.payload.parentThreadId,
      });
      if (publishedResult.success) {
        status = 'PUBLISHED';
      }
    }

    // 9. Save Post to MongoDB (or mock object in standalone mode)
    let postRecord: any = null;
    if (conn) {
      postRecord = await Post.create({
        threadsId: publishedResult?.threadsId || null,
        creationId: publishedResult?.creationId || null,
        type: postType,
        text: quality.sanitizedText,
        productId: targetProduct?._id || null,
        parentId: job.payload.parentThreadId || null,
        status,
        simulationData: {
          fitScore: quality.score,
          reasoning: `Mood: ${state.currentMood} | Topic: ${chosenTopic} | Repetition: ${repCheck.score}% | Provider: ${aiRes.provider}`,
          targetTopic: chosenTopic,
        },
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      });
    } else {
      postRecord = {
        _id: `post_mock_${Date.now()}`,
        threadsId: publishedResult?.threadsId || `mock_t_${Date.now()}`,
        type: postType,
        text: quality.sanitizedText,
        status,
        simulationData: {
          fitScore: quality.score,
          reasoning: `Mood: ${state.currentMood} | Topic: ${chosenTopic} | Provider: ${aiRes.provider}`,
          targetTopic: chosenTopic,
        },
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      };
    }

    // 10. Update state, memories, and product stats
    await stateManager.recordAction('post', chosenTopic, targetProduct?.name);
    await memoryEngine.recordMemory('TOPIC', chosenTopic, quality.sanitizedText.substring(0, 80));

    if (targetProduct) {
      if (typeof targetProduct.save === 'function') {
        targetProduct.timesMentioned += 1;
        targetProduct.lastMentionedAt = new Date();
        if (postType === 'SELF_REPLY') {
          targetProduct.timesLinked = (targetProduct.timesLinked || 0) + 1;
          targetProduct.lastLinkedAt = new Date();
        }
        await targetProduct.save();
      }

      // Record commercial budget impact
      if (postType === 'SELF_REPLY') {
        await stateManager.recordCommercialActivity('DIRECT_LINK');
      } else if (postType === 'CONTEXTUAL_PRODUCT') {
        await stateManager.recordCommercialActivity('SOFT_RECOMMENDATION');
      }

      // STEALTH AFFILIATE FUNNEL:
      // If product post was published and autonomy permits, queue a self-reply with link in 2 minutes
      if (status === 'PUBLISHED' && postType === 'CONTEXTUAL_PRODUCT' && state.autonomyLevel >= 2) {
        await jobQueue.enqueue(
          'COMPOSE_POST',
          {
            type: 'SELF_REPLY',
            productId: targetProduct._id.toString(),
            parentThreadId: publishedResult?.threadsId,
          },
          2 // 2 minutes delay
        );
      }
    }

    // Record last action telemetry for dashboard
    await stateManager.recordLastAction(
      'POST',
      postType,
      postType === 'SELF_REPLY' ? 'DIRECT_LINK' : postType === 'CONTEXTUAL_PRODUCT' ? 'SOFT_RECOMMENDATION' : 'NONE',
      `Published [${postType}] on "${chosenTopic}": ${quality.sanitizedText.substring(0, 50)}...`
    );

    return {
      success: true,
      result: {
        postId: postRecord._id,
        text: quality.sanitizedText,
        status,
        qualityScore: quality.score,
        isMock: Boolean(publishedResult?.isMock),
      },
    };
  }

  /**
   * Handle checking for inbound replies on recent published posts
   */
  private async handleCheckReplies(job: JobDocument, state: any, threadsClient: ThreadsClient) {
    const recentPosts = await Post.find({
      status: 'PUBLISHED',
      threadsId: { $ne: null },
      createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // Last 48h
    })
      .sort({ createdAt: -1 })
      .limit(5);

    let repliesDiscovered = 0;

    for (const post of recentPosts) {
      if (!post.threadsId) continue;
      const conversationReplies = await threadsClient.getConversation(post.threadsId);

      for (const reply of conversationReplies) {
        // Enqueue individual reply handling
        await jobQueue.enqueue('GENERATE_REPLY', {
          parentPostId: post._id.toString(),
          replyToId: reply.id,
          authorUsername: reply.username,
          text: reply.text,
        });
        repliesDiscovered++;
      }
    }

    return { success: true, result: { repliesDiscovered } };
  }

  /**
   * Handle generating contextual response to a conversation
   */
  private async handleGenerateReply(job: JobDocument, state: any, threadsClient: ThreadsClient) {
    const { replyToId, authorUsername, text: incomingText, parentPostId } = job.payload;
    if (!incomingText) return { success: false, error: 'No incoming text provided' };

    // Choose reply class: AGREE, DISAGREE, ADD_VALUE, PLAYFUL
    const classes: ReplyClass[] = ['AGREE', 'DISAGREE', 'ADD_VALUE', 'PLAYFUL'];
    const selectedClass = classes[Math.floor(Math.random() * classes.length)];

    // Evaluate commercial intent and context using AffiliateEngine
    const conn = await connectToDatabase();
    const evalResult = await affiliateEngine.evaluate(incomingText, state);
    const relevantProduct = evalResult.matchedProduct;
    const affiliateMode: AffiliateMode = evalResult.affiliateMode;

    const sysPrompt = buildSystemPrompt(state.persona, state.currentMood);
    const userPrompt = buildReplyPrompt(selectedClass, incomingText, authorUsername || 'someone', relevantProduct, affiliateMode);

    const aiRes = await aiEngine.generate({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      maxTokens: 250,
    });

    let rawContent = aiRes.text;

    // Enforce disclosure if direct affiliate link was generated
    if (affiliateMode === 'DIRECT_LINK' && relevantProduct?.affiliateUrl) {
      const compliance = enforceDisclosure(rawContent, true);
      rawContent = compliance.text;
    }

    const quality = runQualityGate(rawContent);

    let status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
    let publishedResult: any = null;

    // Autonomy Level check for replies
    if (state.autonomyLevel >= 2 && quality.passed) {
      publishedResult = await threadsClient.publishPost({
        text: quality.sanitizedText,
        replyToId,
      });
      if (publishedResult.success) {
        status = 'PUBLISHED';
      }
    }

    let postRecord: any = null;
    if (conn) {
      postRecord = await Post.create({
        threadsId: publishedResult?.threadsId || null,
        type: 'COMMUNITY_REPLY',
        text: quality.sanitizedText,
        parentId: replyToId,
        replyClass: selectedClass,
        productId: relevantProduct?._id || null,
        status,
        simulationData: {
          fitScore: quality.score,
          reasoning: `Replied with [${selectedClass}] (Mode: ${affiliateMode}) to @${authorUsername} on "${incomingText.substring(0, 40)}..."`,
        },
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      });
    } else {
      postRecord = {
        _id: `reply_mock_${Date.now()}`,
        threadsId: publishedResult?.threadsId || `mock_r_${Date.now()}`,
        type: 'COMMUNITY_REPLY',
        text: quality.sanitizedText,
        parentId: replyToId,
        replyClass: selectedClass,
        status,
        simulationData: {
          fitScore: quality.score,
          reasoning: `Replied with [${selectedClass}] (Mode: ${affiliateMode}) to @${authorUsername} on "${incomingText.substring(0, 40)}..."`,
        },
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
      };
    }

    await stateManager.recordAction('reply');

    if (status === 'PUBLISHED' && affiliateMode !== 'NONE') {
      await stateManager.recordCommercialActivity(affiliateMode);
    }

    await stateManager.recordLastAction(
      'REPLY',
      selectedClass,
      affiliateMode,
      `Replied to @${authorUsername} [${affiliateMode}]: ${quality.sanitizedText.substring(0, 50)}...`
    );

    return {
      success: true,
      result: {
        postId: postRecord._id,
        replyClass: selectedClass,
        affiliateMode,
        text: quality.sanitizedText,
        status,
        qualityScore: quality.score,
      },
    };
  }

  /**
   * Handle topic and question discovery based on niche
   */
  private async handleDiscoverTopics(job: JobDocument, state: any) {
    const sysPrompt = `You are an organic Threads trend explorer. Provide 3 fresh, provocative, or relatable conversation hooks for a creator in these niches: ${state.persona.nicheTopics.join(', ')}. Format as JSON array of strings.`;

    const aiRes = await aiEngine.generate({
      messages: [{ role: 'user', content: sysPrompt }],
      temperature: 0.9,
      maxTokens: 300,
    });

    try {
      const cleaned = aiRes.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        for (const topic of parsed) {
          if (typeof topic === 'string' && !state.recentTopics.includes(topic)) {
            state.recentTopics.unshift(topic);
          }
        }
        await state.save();
      }
    } catch {
      // Ignore parse failure on discovery
    }

    return { success: true };
  }
}

export const workerRunner = new WorkerRunner();
export default workerRunner;
