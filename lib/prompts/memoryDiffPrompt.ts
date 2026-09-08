export function buildMemoryDiffPrompt(
  candidateText: string,
  recentPosts: string[],
  recentTopics: string[]
): string {
  return `Compare this new candidate social media post against the agent's recent posts and topics.

CANDIDATE POST:
"${candidateText}"

RECENT POSTS:
${recentPosts.slice(0, 10).map((p, i) => `${i + 1}. "${p}"`).join('\n') || 'None'}

RECENT TOPICS COVERED:
${recentTopics.join(', ') || 'None'}

TASK:
Determine if the candidate post is too repetitive in theme, joke, phrase, or core message.
Respond in JSON format only:
{
  "isRepetitive": boolean,
  "similarityScore": number (0-100, where 100 is identical),
  "reason": string
}`;
}
