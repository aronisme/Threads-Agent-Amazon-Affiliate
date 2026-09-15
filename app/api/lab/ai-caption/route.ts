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
      userGuidance = '', // User custom guidance/suggestions for the AI
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

    // 4. Build prompts with multi-style variations & user guidance
    if (!chosenTopic) {
      const nicheTopics = state.persona?.nicheTopics || ['desk setup', 'tech gadgets'];
      chosenTopic = nicheTopics[Math.floor(Math.random() * nicheTopics.length)];
    }

    const recentPosts = await memoryEngine.getRecentPosts(5);
    const recentSummary = recentPosts.join(' | ');

    const sysPrompt = buildSystemPrompt(state.persona, state.currentMood);
    const baseContentPrompt = buildContentPrompt(
      postType as PostType,
      chosenTopic,
      targetProduct,
      recentSummary,
      {
        mediaType,
        visualContext: visualContext || targetProduct?.visualContext,
      }
    );

    const userGuidanceBlock = userGuidance && typeof userGuidance === 'string' && userGuidance.trim()
      ? `\n🎯 CREATOR'S SPECIFIC GUIDANCE & CREATIVE DIRECTION:\n"${userGuidance.trim()}"\nCRITICAL: You MUST strictly incorporate this guidance, angle, or preference into all generated caption variations below while adapting each to its respective style.\n`
      : '';

    const multiStylePrompt = `${baseContentPrompt}
${userGuidanceBlock}
POST LAB MULTI-STYLE REQUIREMENT:
Generate exactly 4 distinct caption options with different creative angles so the creator can choose the best fit:

1. Style "CASUAL": Casual, relatable, spontaneous everyday thought or observation. Relaxed & authentic.
2. Style "HOOK": Punchy scroll-stopping curiosity hook in the first line. High intrigue, unexpected realization, or provocative question.
3. Style "STORY": Micro-story (2-3 sentences) or relatable confession/scenario. Setup -> relatable moment -> takeaway.
4. Style "WITTY": Witty, slightly sarcastic, humorous take or clever meme-adjacent thought without cringe.

STRICT CONSTRAINTS FOR EACH CAPTION:
- Character count: between 160 and 420 characters. Never exceed 480 characters.
- NO hashtags, NO links (unless self-reply), NO markdown asterisks (** or *).
- Natural Threads conversational flow.

Respond ONLY with a valid JSON object matching this exact structure:
{
  "variations": [
    {
      "styleKey": "CASUAL",
      "styleLabel": "Casual & Chill",
      "styleLabelId": "Santai & Relate",
      "angle": "Everyday relaxed observation",
      "caption": "caption text here"
    },
    {
      "styleKey": "HOOK",
      "styleLabel": "Punchy Hook",
      "styleLabelId": "Hook Bikin Penasaran",
      "angle": "Curiosity-driven opening hook",
      "caption": "caption text here"
    },
    {
      "styleKey": "STORY",
      "styleLabel": "Micro-Story",
      "styleLabelId": "Cerita Pengalaman",
      "angle": "Relatable micro-story scenario",
      "caption": "caption text here"
    },
    {
      "styleKey": "WITTY",
      "styleLabel": "Witty & Sarcastic",
      "styleLabelId": "Lucu & Witty",
      "angle": "Playful sarcastic perspective",
      "caption": "caption text here"
    }
  ]
}`;

    // 5. Generate captions with AI
    const aiRes = await aiEngine.generate({
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: multiStylePrompt },
      ],
      temperature: 0.85,
      maxTokens: 850,
    });

    // 6. Parse JSON variations with resilient fallbacks
    let variations: Array<{
      styleKey: string;
      styleLabel: string;
      styleLabelId: string;
      angle: string;
      caption: string;
    }> = [];

    try {
      let cleanedText = aiRes.text.trim();
      const match = cleanedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match) {
        cleanedText = match[1].trim();
      } else {
        const firstBrace = cleanedText.indexOf('{');
        const lastBrace = cleanedText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
        }
      }
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed.variations) && parsed.variations.length > 0) {
        variations = parsed.variations.map((v: any) => ({
          styleKey: String(v.styleKey || 'CASUAL').toUpperCase(),
          styleLabel: v.styleLabel || 'Casual',
          styleLabelId: v.styleLabelId || 'Santai',
          angle: v.angle || '',
          caption: (v.caption || '').replace(/[\*\_]/g, '').trim(),
        }));
      }
    } catch (parseErr) {
      console.warn('⚠️ Could not parse JSON variations from AI, using fallback:', parseErr);
    }

    // Fallback if JSON parsing didn't return variations
    if (!variations || variations.length === 0) {
      const cleanSingle = aiRes.text
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/[\*\_]/g, '')
        .trim();
      variations = [
        {
          styleKey: 'CASUAL',
          styleLabel: 'Casual & Chill',
          styleLabelId: 'Santai & Relate',
          angle: 'AI Generated Draft',
          caption: cleanSingle,
        },
      ];
    }

    const primaryCaption = variations[0]?.caption || '';

    return NextResponse.json({
      success: true,
      caption: primaryCaption,
      variations,
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
      userGuidanceApplied: !!userGuidance?.trim(),
    });
  } catch (err: any) {
    console.error('❌ Lab AI caption error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'AI generation failed.' },
      { status: 500 }
    );
  }
}
