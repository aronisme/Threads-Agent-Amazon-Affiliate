import { PostType, IProduct, IVisualContext } from '@/types';

export function buildContentPrompt(
  type: PostType,
  topic: string,
  productKnowledge?: IProduct | null,
  recentPostsSummary?: string,
  options?: {
    mediaType?: 'TEXT' | 'IMAGE' | 'VIDEO';
    visualContext?: IVisualContext;
  }
): string {
  let instruction = '';
  const mediaType = options?.mediaType || 'TEXT';
  const visual = options?.visualContext || productKnowledge?.visualContext;

  switch (type) {
    case 'ORIGINAL_THOUGHT':
      instruction = `Create a spontaneous, relatable original thought about "${topic}".
Make it sound like a realization you just had today while working or chilling.
Keep it under 280 characters. No promotional content.`;
      break;

    case 'QUESTION':
      instruction = `Ask an engaging, open-ended question about "${topic}" that invites people to share their personal setup, habit, or opinion.
It should be easy to answer in 1-2 sentences. Avoid generic boring questions.`;
      break;

    case 'STORY':
      instruction = `Tell a very short 2-3 sentence micro-story or relatable confession related to "${topic}".
Format: A tiny problem you ran into -> how absurd or relatable it was -> the takeaway.`;
      break;

    case 'CONTEXTUAL_PRODUCT':
      if (!productKnowledge) {
        instruction = `Write a casual opinion about "${topic}".`;
      } else {
        const visualBlock =
          (mediaType === 'IMAGE' || mediaType === 'VIDEO') && visual
            ? `
ATTACHED MEDIA CONTEXT (${mediaType === 'VIDEO' ? 'Video Reel' : 'Photo'}):
- Aesthetic: ${visual.aestheticStyle}
- Visible Colors & Materials: ${visual.dominantColors.join(', ')} | ${visual.materials.join(', ')}
- Form & Scale: ${visual.scaleAndForm}
- Visual Hooks: ${visual.keyVisualHooks.join('; ')}

MEDIA POST INSTRUCTION:
Since you are attaching a ${mediaType === 'VIDEO' ? 'short video' : 'photo'} of this item to the post, naturally reference physical details you can see (e.g. how clean the matte finish looks in person, how surprisingly compact it is on a desk, or the clever cable routing).
Do NOT say "in this photo" or "check out this image". Talk like someone sharing a real photo of their actual daily desk setup.`
            : '';

        // Distill background facts strictly for subconscious context (never to be recited)
        const facts: string[] = [];
        if (productKnowledge.brand) {
          facts.push(`Brand/Maker: ${productKnowledge.brand}`);
        }
        if (productKnowledge.price) {
          facts.push(`Price Point: ${productKnowledge.price} (keep in mind for value perspective)`);
        }
        if (productKnowledge.rating && productKnowledge.reviewCount) {
          facts.push(`Community Reception: ${productKnowledge.rating}/5 stars from ${productKnowledge.reviewCount} users`);
        }
        if (productKnowledge.creatorNotes) {
          facts.push(`Creator Personal Note: "${productKnowledge.creatorNotes}"`);
        }
        if (Array.isArray(productKnowledge.bullets) && productKnowledge.bullets.length > 0) {
          const topBullets = productKnowledge.bullets.slice(0, 2).map((b) => b.trim()).join(' | ');
          facts.push(`Background Utility/Specs (DO NOT RECITE): ${topBullets}`);
        }

        const backgroundFactsBlock =
          facts.length > 0
            ? `\nPRODUCT BACKGROUND FACTS (For subconscious grounding only):\n${facts.map((f) => `- ${f}`).join('\n')}\n`
            : '';

        instruction = `You are casually discussing a clever tool or design related to "${topic}":
Item: ${productKnowledge.name}
Core Context: ${productKnowledge.notes || 'a practical everyday accessory'}
${backgroundFactsBlock}${visualBlock}

TASK: Share a natural everyday observation or realization about the specific annoyance or micro-problem this type of tool addresses.
STRICT HUMAN GUARDRAILS (NEVER SOUND LIKE A BOT OR AFFILIATE MARKETER):
1. NO SALES PITCHES OR CATALOG JARGON: Never write headlines like "Upgrade your workspace!", "Must-have gadget!", "Game changer", or "Looking for the best...".
2. DO NOT RECITE SPECS OR BULLETS: Never list dimensions, wattages, or feature bullet points. Humans don't talk like spec sheets. If you touch on price, do it casually (e.g. "for twenty bucks it felt way sturdier than expected" or "not bad for the price").
3. NO FAKE BACKSTORIES: Don't pretend you've used it for 10 years unless verified in creator notes. Focus on the physical design, the clever fix to an annoying problem, or why it feels satisfying on a desk.
4. NO LINKS OR HASHTAGS: Do NOT include URLs, affiliate links, or hashtags in this post. Keep it 100% focused on organic community banter.`;
      }
      break;

    case 'SELF_REPLY':
      if (!productKnowledge) {
        instruction = `Add a brief follow-up thought to your previous post.`;
      } else {
        instruction = `You are dropping a quick follow-up comment under your previous post about ${productKnowledge.name}.
Write a natural 1-sentence reply providing the link (${productKnowledge.affiliateUrl}).
Tone: Super casual, like dropping a note for anyone curious.
Examples of natural human phrasing:
- "for anyone curious, it's this one: ${productKnowledge.affiliateUrl}"
- "found it on amazon here: ${productKnowledge.affiliateUrl}"
- "link for those asking: ${productKnowledge.affiliateUrl}"
Do NOT say "so many people asked in my DMs". Keep it clean, minimal, and authentic.`;
      }
      break;

    default:
      instruction = `Share a casual, authentic perspective on "${topic}".`;
  }

  const antiRepetitionClause = recentPostsSummary
    ? `\nRECENT TOPICS / PHRASES TO AVOID DUPLICATING:\n${recentPostsSummary}\n`
    : '';

  return `${instruction}\n${antiRepetitionClause}\nRemember: Output only the exact text for the Threads post.`;
}
