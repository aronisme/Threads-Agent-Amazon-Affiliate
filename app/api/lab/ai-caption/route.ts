import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Product from '@/db/models/Product';
import MediaStock from '@/db/models/MediaStock';
import aiEngine from '@/lib/ai/groqRotator';
import visionRotator from '@/lib/ai/visionRotator';
import stateManager from '@/lib/memory/stateManager';
import { buildSystemPrompt } from '@/lib/prompts/personaPrompt';
import { buildContentPrompt } from '@/lib/prompts/contentPrompts';
import memoryEngine from '@/lib/memory/memoryEngine';
import { PostType, IVisualContext } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/lab/ai-caption
 * Multi-modal AI caption generator for Post Lab.
 * Supports: text-only generation, vision image analysis + caption, vision video analysis + caption.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      productId,
      mediaStockId,
      topic = '',
      postType = 'ORIGINAL_THOUGHT' as PostType,
      imageUrl,   // Direct image URL for vision analysis
      videoUrl,   // Direct video URL for vision analysis
    } = body;

    const state = await stateManager.getState();
    let targetProduct: any = null;
    let targetMedia: any = null;
    let visualContext: IVisualContext | undefined = undefined;
    let mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' = 'TEXT';
    let chosenTopic = topic;
    let visionResult: any = null;

    // 1. Load product if specified
    if (productId) {
      targetProduct = await Product.findById(productId).lean();
      if (!targetProduct) {
        return NextResponse.json(
          { success: false, error: 'Product not found in vault.' },
          { status: 404 }
        );
      }
      if (!chosenTopic) {
        chosenTopic = targetProduct.category || targetProduct.name || 'desk setup';
      }
    }

    // 2. Load media stock if specified
    if (mediaStockId) {
      targetMedia = await MediaStock.findById(mediaStockId).lean();
    }

    // 3. Vision Analysis — prioritize explicit URLs, then product/media URLs
    const visionImageUrl = imageUrl || targetProduct?.imageUrl || (targetProduct?.images?.[0]);
    const visionVideoUrl = videoUrl || targetMedia?.videoUrl || targetProduct?.videoUrl;

    if (visionVideoUrl) {
      // Video vision analysis
      try {
        console.info(`🎥 Lab AI: Analyzing video with Vision API...`);
        visionResult = await visionRotator.analyzeStockVideo({
          videoUrl: visionVideoUrl,
          title: targetMedia?.title || targetProduct?.name || topic || 'Video Content',
          category: targetMedia?.category || targetProduct?.category || 'GENERAL',
          notes: targetMedia?.notes || targetProduct?.notes || '',
        });
        visualContext = visionResult;
        mediaType = 'VIDEO';
      } catch (vErr: any) {
        console.warn('⚠️ Lab video vision analysis failed, continuing with text:', vErr.message);
      }
    } else if (visionImageUrl) {
      // Image vision analysis
      try {
        console.info(`📸 Lab AI: Analyzing image with Vision API...`);
        visionResult = await visionRotator.analyzeProductImage({
          imageUrl: visionImageUrl,
          productName: targetProduct?.name || topic || 'Product',
          category: targetProduct?.category || 'tech gear',
          notes: targetProduct?.notes || '',
        });
        visualContext = visionResult;
        mediaType = 'IMAGE';
      } catch (vErr: any) {
        console.warn('⚠️ Lab image vision analysis failed, continuing with text:', vErr.message);
      }
    }

    // 4. Build prompts
    if (!chosenTopic) {
      const nicheTopics = state.persona?.nicheTopics || ['desk setup', 'tech gadgets'];
      chosenTopic = nicheTopics[Math.floor(Math.random() * nicheTopics.length)];
    }

    const recentPosts = await memoryEngine.getRecentPosts(5);
    const recentSummary = recentPosts.join(' | ');

    const sysPrompt = buildSystemPrompt(state.persona, state.currentMood);
    const userPrompt = buildContentPrompt(
      postType as PostType,
      chosenTopic,
      targetProduct,
      recentSummary,
      {
        mediaType,
        visualContext: visualContext || targetProduct?.visualContext,
      }
    );

    // 5. Generate caption with AI
    const aiRes = await aiEngine.generate({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.85,
      maxTokens: 350,
    });

    return NextResponse.json({
      success: true,
      caption: aiRes.text,
      provider: aiRes.provider,
      modelUsed: aiRes.modelUsed,
      durationMs: aiRes.durationMs,
      visionUsed: !!visionResult,
      visionContext: visionResult ? {
        aestheticStyle: visionResult.aestheticStyle,
        keyVisualHooks: visionResult.keyVisualHooks,
        summaryDescription: visionResult.summaryDescription,
        autoTitle: visionResult.autoTitle,
        autoCategory: visionResult.autoCategory,
      } : null,
      mediaType,
      topic: chosenTopic,
    });
  } catch (err: any) {
    console.error('❌ Lab AI caption error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'AI generation failed.' },
      { status: 500 }
    );
  }
}
