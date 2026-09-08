import { PostType, IProduct } from '@/types';

export function buildContentPrompt(
  type: PostType,
  topic: string,
  productKnowledge?: IProduct | null,
  recentPostsSummary?: string
): string {
  let instruction = '';

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
        instruction = `You are discussing a clever tool or design related to "${topic}":
Item: ${productKnowledge.name}
Details: ${productKnowledge.notes || 'a practical everyday accessory'}

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
