import connectToDatabase from '@/db/client';
import TrendTopic, { TrendTopicDocument } from '@/db/models/TrendTopic';

export interface RawTrendItem {
  title: string;
  summary: string;
  source: 'GOOGLE_TRENDS' | 'REDDIT' | 'GOOGLE_NEWS';
  sourceUrl: string;
  category: 'TECH' | 'DESK_SETUP' | 'GADGET' | 'WORK_LIFE' | 'VIRAL';
  score: number;
}

/**
 * Universal US Viral Trend Radar
 * Fetches real-time US trending topics from:
 * 1. Google Trends US Daily RSS (geo=US)
 * 2. Google News US Tech & Workspace RSS
 * 3. Reddit US Tech/Desk/Workspaces Public JSON (r/battlestations, r/Workspaces, r/gadgets, r/desksetup)
 *
 * 100% Free, Ban-Proof, Official Public Syndication.
 */
export class TrendRadar {
  private userAgent = 'ThreadsCreatorAgent/2.6 (US Tech & Desk Trend Radar; en-US)';

  /**
   * Helper to clean XML/HTML entities
   */
  private cleanText(str: string): string {
    if (!str) return '';
    return str
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 1. Fetch Google Trends US Daily RSS
   */
  public async fetchGoogleTrendsUS(): Promise<RawTrendItem[]> {
    try {
      const url = 'https://trends.google.com/trending/rss?geo=US';
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.warn(`⚠️ Google Trends US RSS returned HTTP ${res.status}`);
        return [];
      }

      const xml = await res.text();
      const items: RawTrendItem[] = [];

      // Regex parse RSS <item> blocks
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
        const approxTrafficMatch = /<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i.exec(itemContent);
        const newsTitleMatch = /<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/i.exec(itemContent);
        const newsSnippetMatch = /<ht:news_item_snippet>([\s\S]*?)<\/ht:news_item_snippet>/i.exec(itemContent);
        const newsUrlMatch = /<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/i.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);

        const title = this.cleanText(titleMatch ? titleMatch[1] : '');
        if (!title) continue;

        const snippet = this.cleanText(
          (newsTitleMatch ? newsTitleMatch[1] + '. ' : '') +
          (newsSnippetMatch ? newsSnippetMatch[1] : '')
        );

        let trafficScore = 1000;
        if (approxTrafficMatch) {
          const trafficStr = approxTrafficMatch[1].replace(/[^0-9]/g, '');
          if (trafficStr) trafficScore = parseInt(trafficStr, 10);
        }

        items.push({
          title,
          summary: snippet || `Viral topic trending in the US today with ${approxTrafficMatch?.[1] || 'high'} searches.`,
          source: 'GOOGLE_TRENDS',
          sourceUrl: (newsUrlMatch ? newsUrlMatch[1] : linkMatch ? linkMatch[1] : '').trim(),
          category: 'VIRAL',
          score: trafficScore,
        });
      }

      return items;
    } catch (err: any) {
      console.warn('⚠️ Error fetching Google Trends US:', err.message);
      return [];
    }
  }

  /**
   * 2. Fetch Google News US Technology & Gadgets RSS
   */
  public async fetchGoogleNewsUSTech(): Promise<RawTrendItem[]> {
    try {
      const url = 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en';
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) return [];

      const xml = await res.text();
      const items: RawTrendItem[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
        const itemContent = match[1];
        const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(itemContent);
        const linkMatch = /<link>([\s\S]*?)<\/link>/i.exec(itemContent);

        const rawTitle = this.cleanText(titleMatch ? titleMatch[1] : '');
        if (!rawTitle) continue;

        // Google News format usually ends with " - PublisherName"
        const cleanTitle = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim();

        items.push({
          title: cleanTitle,
          summary: `Tech news story gaining momentum across US media.`,
          source: 'GOOGLE_NEWS',
          sourceUrl: linkMatch ? linkMatch[1].trim() : '',
          category: 'TECH',
          score: 800,
        });
      }

      return items;
    } catch (err: any) {
      console.warn('⚠️ Error fetching Google News US Tech:', err.message);
      return [];
    }
  }

  /**
   * 3. Fetch Reddit Public RSS (Niche US subreddits)
   */
  public async fetchRedditUSTrends(): Promise<RawTrendItem[]> {
    const subreddits: Array<{ name: string; category: 'DESK_SETUP' | 'GADGET' | 'WORK_LIFE' | 'TECH' }> = [
      { name: 'battlestations', category: 'DESK_SETUP' },
      { name: 'Workspaces', category: 'WORK_LIFE' },
      { name: 'gadgets', category: 'GADGET' },
      { name: 'desksetup', category: 'DESK_SETUP' },
    ];

    const allItems: RawTrendItem[] = [];

    for (const sub of subreddits) {
      try {
        const url = `https://www.reddit.com/r/${sub.name}/.rss`;
        const res = await fetch(url, {
          headers: { 'User-Agent': this.userAgent },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) continue;

        const xml = await res.text();
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
        let match: RegExpExecArray | null;
        let count = 0;

        while ((match = entryRegex.exec(xml)) !== null && count < 8) {
          const entry = match[1];
          const titleMatch = /<title>([\s\S]*?)<\/title>/i.exec(entry);
          const linkMatch = /<link\s+href="([^"]+)"/i.exec(entry);

          const title = this.cleanText(titleMatch ? titleMatch[1] : '');
          if (!title || title.length < 10) continue;

          // Skip subreddit header title
          if (title.toLowerCase() === sub.name.toLowerCase()) continue;

          allItems.push({
            title,
            summary: `Hot community discussion on r/${sub.name} among US creators and tech enthusiasts.`,
            source: 'REDDIT',
            sourceUrl: linkMatch ? linkMatch[1] : `https://reddit.com/r/${sub.name}`,
            category: sub.category,
            score: 500,
          });
          count++;
        }
      } catch (err: any) {
        console.warn(`⚠️ Error fetching r/${sub.name}:`, err.message);
      }
    }

    return allItems;
  }

  /**
   * Full Sync: Fetches all US sources in parallel and upserts to MongoDB
   */
  public async syncUSTrends(): Promise<{ totalSaved: number; items: any[] }> {
    await connectToDatabase();

    console.info('📡 [TrendRadar] Initiating US Viral Trend Radar sync (Google Trends + Reddit + Google News)...');

    const [googleTrends, googleNews, redditTrends] = await Promise.all([
      this.fetchGoogleTrendsUS(),
      this.fetchGoogleNewsUSTech(),
      this.fetchRedditUSTrends(),
    ]);

    const combined: RawTrendItem[] = [...googleTrends, ...googleNews, ...redditTrends];
    console.info(`📡 [TrendRadar] Fetched ${combined.length} candidate items (${googleTrends.length} Google Trends, ${googleNews.length} Google News, ${redditTrends.length} Reddit).`);

    let savedCount = 0;
    const savedDocs: any[] = [];

    for (const item of combined) {
      try {
        const doc = await TrendTopic.findOneAndUpdate(
          { title: item.title, source: item.source },
          {
            $set: {
              summary: item.summary,
              sourceUrl: item.sourceUrl,
              category: item.category,
              score: item.score,
              region: 'US',
              active: true,
              fetchedAt: new Date(),
            },
            $setOnInsert: {
              timesReferenced: 0,
              lastUsedAt: null,
            },
          },
          { upsert: true, new: true }
        );

        if (doc) {
          savedCount++;
          savedDocs.push(doc);
        }
      } catch (err: any) {
        // Ignore duplicate key collision
      }
    }

    // Keep active database tidy (limit to top 80 freshest)
    try {
      const excess = await TrendTopic.find().sort({ fetchedAt: -1 }).skip(80);
      if (excess.length > 0) {
        const idsToDelete = excess.map((d) => d._id);
        await TrendTopic.deleteMany({ _id: { $in: idsToDelete } });
      }
    } catch {}

    console.info(`✅ [TrendRadar] Successfully synced ${savedCount} US viral trends.`);
    return { totalSaved: savedCount, items: savedDocs.slice(0, 20) };
  }

  /**
   * Select a hot, fresh US trend topic for the Social Engine
   */
  public async getHotUSTopic(excludedTitles: string[] = []): Promise<TrendTopicDocument | null> {
    await connectToDatabase();

    const candidates = await TrendTopic.find({
      active: true,
      region: 'US',
      title: { $nin: excludedTitles },
    })
      .sort({ timesReferenced: 1, score: -1, fetchedAt: -1 })
      .limit(12);

    if (!candidates || candidates.length === 0) {
      // If none found or all excluded, sync now
      const syncRes = await this.syncUSTrends();
      if (syncRes.items.length > 0) {
        return syncRes.items[0];
      }
      return null;
    }

    // Pick from top 3 least referenced
    const pool = candidates.slice(0, 3);
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    return chosen;
  }
}

export const trendRadar = new TrendRadar();
export default trendRadar;
