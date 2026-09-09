import { ReplyClass, IProduct, AffiliateMode } from '@/types';

export function buildReplyPrompt(
  replyClass: ReplyClass,
  originalPostText: string,
  authorUsername: string,
  relevantProduct?: IProduct | null,
  affiliateMode: AffiliateMode = 'NONE',
  parentPostText?: string
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
      strategy = `Respond with a lighthearted joke, meme reference, or witty one-liner that matches the mood of @${authorUsername}'s comment.`;
      break;
  }

  let productInstruction = '';
  if (relevantProduct && affiliateMode === 'DIRECT_LINK') {
    productInstruction = `\nCOMMERCIAL CONTEXT (DIRECT RECOMMENDATION / LINK REQUESTED):
The user is asking where to find it or asking for a recommendation.
Product: "${relevantProduct.name}" (${relevantProduct.notes || 'reliable tool'}).
Amazon link: ${relevantProduct.affiliateUrl}
Instruction: Answer casually and helpfully. Include the exact Amazon link provided above. (e.g. "got it on amazon here: ${relevantProduct.affiliateUrl}" or "found it on amazon! here's the link: ${relevantProduct.affiliateUrl}").`;
  } else if (relevantProduct && affiliateMode === 'SOFT_RECOMMENDATION') {
    productInstruction = `\nCOMMERCIAL CONTEXT (SOFT RECOMMENDATION):
User mentions a problem related to "${relevantProduct.category}".
Casually mention that a "${relevantProduct.name}" exists and solves this exact headache.
DO NOT include a link yet. Keep it conversational.`;
  } else if (affiliateMode === 'MENTION_ONLY') {
    productInstruction = `\nCOMMERCIAL CONTEXT (MENTION ONLY):
Casually mention that category of tool (e.g. "a compact GaN charger" or "a teardrop footrest") in passing without specific brand or link.`;
  } else {
    productInstruction = `\nORGANIC SOCIAL INTERACTION (NO PRODUCTS OR LINKS):
This is a regular social comment. Do NOT mention any products, brands, or links. Simply banter, laugh, agree, or joke like a regular person on Threads.`;
  }

  const contextHeader = parentPostText
    ? `Your original post was:\n"${parentPostText}"\n\nUser @${authorUsername} commented:\n"${originalPostText}"`
    : `You are replying to this Threads comment by @${authorUsername}:\n"${originalPostText}"`;

  return `${contextHeader}

YOUR GOAL:
Strategy: [${replyClass}]
${strategy}
${productInstruction}

RULES:
1. Keep it short (1-2 sentences, under 200 characters).
2. Talk like a fellow Threads user replying in the comments (relatable, friendly, casual).
3. Output ONLY the response text.`;
}
