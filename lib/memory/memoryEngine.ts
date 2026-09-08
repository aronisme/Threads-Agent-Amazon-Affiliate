import connectToDatabase from '@/db/client';
import Post from '@/db/models/Post';
import Memory from '@/db/models/Memory';
import aiEngine from '@/lib/ai/groqRotator';
import { buildMemoryDiffPrompt } from '@/lib/prompts/memoryDiffPrompt';

export interface RepetitionCheckResult {
  isRepetitive: boolean;
  score: number;
  reason: string;
}

export class MemoryEngine {
  /**
   * Fetch recent post texts to inject into context window
   */
  public async getRecentPosts(limit: number = 15): Promise<string[]> {
    const conn = await connectToDatabase();
    if (!conn) return [];
    try {
      const posts = await Post.find({ status: 'PUBLISHED' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('text')
        .lean();

      return posts.map((p: any) => p.text);
    } catch (err) {
      console.warn('⚠️ Error fetching recent posts for memory:', err);
      return [];
    }
  }

  /**
   * Fetch active memory entries by scope
   */
  public async getMemories(scope?: string): Promise<any[]> {
    const conn = await connectToDatabase();
    if (!conn) return [];
    try {
      const query: any = {};
      if (scope) query.scope = scope;
      return await Memory.find(query).sort({ importance: -1, createdAt: -1 }).limit(30).lean();
    } catch (err) {
      console.warn('⚠️ Error fetching memories:', err);
      return [];
    }
  }

  /**
   * Save a key memory item (e.g. recent joke, topic, or person observation)
   */
  public async recordMemory(scope: 'TOPIC' | 'JOKE' | 'OPINION' | 'PRODUCT_MENTION' | 'HOOK', key: string, value: string, importance: number = 5): Promise<void> {
    const conn = await connectToDatabase();
    if (!conn) return;
    try {
      await Memory.findOneAndUpdate(
        { scope, key },
        { value, importance, updatedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.warn('⚠️ Error recording memory:', err);
    }
  }

  /**
   * Evaluate if a new candidate idea is too repetitive using LLM comparison
   */
  public async checkRepetition(candidateText: string, recentTopics: string[] = []): Promise<RepetitionCheckResult> {
    const recentPosts = await this.getRecentPosts(8);
    if (recentPosts.length === 0) {
      return { isRepetitive: false, score: 0, reason: 'No prior posts to compare' };
    }

    try {
      const prompt = buildMemoryDiffPrompt(candidateText, recentPosts, recentTopics);
      const res = await aiEngine.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        maxTokens: 150,
      });

      const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        isRepetitive: Boolean(parsed.isRepetitive),
        score: Number(parsed.similarityScore || 0),
        reason: parsed.reason || 'Evaluated via AI memory check',
      };
    } catch {
      // Fallback simple word overlap heuristic if JSON parsing fails
      const candidateWords = new Set(candidateText.toLowerCase().split(/\s+/));
      for (const p of recentPosts) {
        const words = p.toLowerCase().split(/\s+/);
        const matches = words.filter((w) => candidateWords.has(w) && w.length > 4);
        if (matches.length > 5) {
          return {
            isRepetitive: true,
            score: 75,
            reason: `Heuristic overlap detected on words: ${matches.slice(0, 3).join(', ')}`,
          };
        }
      }
      return { isRepetitive: false, score: 10, reason: 'No significant overlap detected' };
    }
  }
}

export const memoryEngine = new MemoryEngine();
export default memoryEngine;
