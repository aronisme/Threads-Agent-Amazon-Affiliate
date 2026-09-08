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

        instruction = `You are discussing a clever tool or design related to "${topic}":
Item: ${productKnowledge.name}
Details: ${productKnowledge.notes || 'a practical everyday accessory'}
${visualBlock}

TASK: Share a natural everyday observation about the specific annoyance this type of tool addresses.
RULES:
1. Do NOT sound like an advertisement, marketer, or paid sponsor.
2. Do NOT fake personal backstories (e.g. do not say "I've owned this for 5 years" unless verified in notes). Frame it around the smart utility or design: "never realized how much cable clutter annoyed me until...", "there's something so satisfying about a charger that...".
3. Focus on the feeling, problem-solving, or minimalist aesthetic.
4. Do NOT include the URL link in this main post text. Keep the post 100% focused on genuine social discussion.`;
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
