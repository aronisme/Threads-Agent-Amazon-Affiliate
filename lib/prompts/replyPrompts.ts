import { ReplyClass, IProduct, AffiliateMode } from '@/types';

export function buildReplyPrompt(
  replyClass: ReplyClass,
  originalPostText: string,
  authorUsername: string,
  relevantProduct?: IProduct | null,
  affiliateMode: AffiliateMode = 'NONE'
): string {
  let strategy = '';

  switch (replyClass) {
    case 'AGREE':
      strategy = `Strongly agree with @${authorUsername}'s point, but add your own personal observation or real-world example to validate it.`;
      break;

    case 'DISAGREE':
      strategy = `Offer a playful or gentle counterpoint to @${authorUsername}'s view without sounding argumentative. Start with a nuanced take (e.g. "idk, i used to think so too until...", "maybe for some, but...").`;
      break;

    case 'ADD_VALUE':
      strategy = `Provide a genuine, practical tip or unexpected hack that directly relates to what @${authorUsername} is talking about.`;
      break;

    case 'PLAYFUL':
      strategy = `Respond with a lighthearted joke, meme reference, or witty one-liner that matches the mood of @${authorUsername}'s post.`;
      break;
  }

  let productInstruction = '';
  if (relevantProduct && affiliateMode === 'DIRECT_LINK') {
    productInstruction = `\nCOMMERCIAL CONTEXT (DIRECT RECOMMENDATION REQUESTED):
User is looking for a solution. Recommend: "${relevantProduct.name}" (${relevantProduct.notes || 'reliable tool'}).
Include the Amazon link (${relevantProduct.affiliateUrl}).
Tone: Helpful, objective, casual. (e.g. "i think you're looking for something like this: ${relevantProduct.affiliateUrl}").`;
  } else if (relevantProduct && affiliateMode === 'SOFT_RECOMMENDATION') {
    productInstruction = `\nCOMMERCIAL CONTEXT (SOFT RECOMMENDATION):
User mentions a problem related to "${relevantProduct.category}".
Casually mention that a "${relevantProduct.name}" exists and solves this exact headache.
DO NOT include a link yet. Keep it conversational.`;
  } else if (affiliateMode === 'MENTION_ONLY') {
    productInstruction = `\nCOMMERCIAL CONTEXT (MENTION ONLY):
Casually mention that category of tool (e.g. "a compact GaN charger" or "a teardrop footrest") in passing without specific brand or link.`;
  }

  return `You are replying to this Threads post by @${authorUsername}:
"${originalPostText}"

YOUR GOAL:
Strategy: [${replyClass}]
${strategy}
${productInstruction}

RULES:
1. Keep it short (1-2 sentences, under 200 characters).
2. Talk like a fellow Threads user replying in the comments.
3. DO NOT fake personal backstory ("I bought it 3 years ago"). Use curator language: "this looks like what you need", "there's a solid one called...".
4. Output ONLY the response text.`;
}
