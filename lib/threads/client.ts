/**
 * Threads Graph API v1.0 Client Wrapper
 * Handles post publishing, self-replies, conversation fetching, and mock simulations.
 */

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

export interface ThreadsPostOptions {
  text: string;
  replyToId?: string;
  quotePostId?: string;
  imageUrl?: string;
  videoUrl?: string;
  imageUrls?: string[];
}

export interface ThreadsPublishResult {
  success: boolean;
  creationId?: string;
  threadsId?: string;
  permalink?: string;
  error?: string;
  isMock?: boolean;
}

export class ThreadsClient {
  private userId: string;
  private accessToken: string;
  private isDryRun: boolean;

  constructor(userId?: string, accessToken?: string, isDryRun?: boolean) {
    this.userId = userId || process.env.THREADS_USER_ID || '';
    this.accessToken = accessToken || process.env.THREADS_ACCESS_TOKEN || '';
    this.isDryRun = typeof isDryRun === 'boolean' ? isDryRun : process.env.DRY_RUN === 'true';
  }

  /**
   * Check if credentials are configured
   */
  public isConfigured(): boolean {
    return Boolean(this.userId && this.accessToken);
  }

  /**
   * Create a media container on Threads
   */
  public async createContainer(options: ThreadsPostOptions): Promise<{ id: string }> {
    if (this.isDryRun || !this.isConfigured()) {
      return { id: `mock_creation_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
    }

    const url = `${THREADS_API_BASE}/${this.userId}/threads`;
    const params = new URLSearchParams();
    params.set('access_token', this.accessToken);
    if (options.text) params.set('text', options.text);
    params.set('media_type', options.imageUrl ? 'IMAGE' : options.videoUrl ? 'VIDEO' : 'TEXT');

    if (options.replyToId) params.set('reply_to_id', options.replyToId);
    if (options.quotePostId) params.set('quote_post_id', options.quotePostId);
    if (options.imageUrl) params.set('image_url', options.imageUrl);
    if (options.videoUrl) params.set('video_url', options.videoUrl);

    const res = await fetch(url, {
      method: 'POST',
      body: params,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Failed to create Threads container: HTTP ${res.status}`);
    }

    return { id: data.id };
  }

  /**
   * Publish a previously created container
   */
  public async publishContainer(creationId: string): Promise<{ id: string }> {
    if (this.isDryRun || !this.isConfigured()) {
      return { id: `mock_threads_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` };
    }

    const url = `${THREADS_API_BASE}/${this.userId}/threads_publish`;
    const params = new URLSearchParams({
      access_token: this.accessToken,
      creation_id: creationId,
    });
    const res = await fetch(url, {
      method: 'POST',
      body: params,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Failed to publish Threads container: HTTP ${res.status}`);
    }

    return { id: data.id };
  }

  /**
   * Poll container status for async image/video transcoding before publishing
   */
  public async waitForMediaReady(creationId: string, maxWaitSeconds: number = 20): Promise<boolean> {
    if (this.isDryRun || !this.isConfigured()) {
      return true;
    }

    const url = `${THREADS_API_BASE}/${creationId}?fields=status,error_message&access_token=${this.accessToken}`;
    const startTime = Date.now();
    const maxDurationMs = maxWaitSeconds * 1000;

    while (Date.now() - startTime < maxDurationMs) {
      try {
        const res = await fetch(url);
        const data = await res.json();
        const status = data.status;

        if (status === 'FINISHED') {
          return true;
        }

        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(
            `Threads media processing failed: ${status} (${data.error_message || 'media processing error'})`
          );
        }

        // IN_PROGRESS: wait 2 seconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err: any) {
        if (err.message?.includes('Threads media processing failed')) throw err;
        console.warn(`⚠️ Error polling container status for ${creationId}:`, err);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.warn(`⚠️ Container ${creationId} wait timed out after ${maxWaitSeconds}s. Attempting publish anyway.`);
    return true;
  }

  /**
   * Complete flow: create container + wait for media ready + publish
   */
  public async publishPost(options: ThreadsPostOptions): Promise<ThreadsPublishResult> {
    try {
      if (this.isDryRun || !this.isConfigured()) {
        const mockCreationId = `mock_c_${Date.now()}`;
        const mockThreadsId = `mock_t_${Date.now()}`;
        return {
          success: true,
          creationId: mockCreationId,
          threadsId: mockThreadsId,
          permalink: `https://threads.net/@mock_user/post/${mockThreadsId}`,
          isMock: true,
        };
      }

      // Step 1: Create Container
      const { id: creationId } = await this.createContainer(options);

      // Step 2: If image or video, wait for Meta to finish transcoding/preparing
      if (options.imageUrl || options.videoUrl) {
        await this.waitForMediaReady(creationId, options.videoUrl ? 40 : 15);
      }

      // Step 3: Publish Container
      const { id: threadsId } = await this.publishContainer(creationId);

      return {
        success: true,
        creationId,
        threadsId,
        permalink: `https://threads.net/t/${threadsId}`,
        isMock: false,
      };
    } catch (err: any) {
      console.error('❌ ThreadsClient Publish Error:', err);
      return {
        success: false,
        error: err.message || 'Unknown Threads API error',
      };
    }
  }

  /**
   * Publish multi-image Carousel container (2-5 images)
   */
  public async publishCarousel(options: {
    text: string;
    imageUrls: string[];
    replyToId?: string;
  }): Promise<ThreadsPublishResult> {
    try {
      if (this.isDryRun || !this.isConfigured()) {
        const mockCreationId = `mock_carousel_c_${Date.now()}`;
        const mockThreadsId = `mock_carousel_t_${Date.now()}`;
        return {
          success: true,
          creationId: mockCreationId,
          threadsId: mockThreadsId,
          permalink: `https://threads.net/@mock_user/post/${mockThreadsId}`,
          isMock: true,
        };
      }

      const validUrls = options.imageUrls.filter((u) => Boolean(u && u.startsWith('http')));
      if (validUrls.length < 2) {
        return this.publishPost({
          text: options.text,
          imageUrl: validUrls[0],
          replyToId: options.replyToId,
        });
      }

      // Step 1: Create individual item containers
      const itemContainerIds: string[] = [];
      for (const imgUrl of validUrls.slice(0, 5)) {
        const url = `${THREADS_API_BASE}/${this.userId}/threads`;
        const params = new URLSearchParams({
          access_token: this.accessToken,
          media_type: 'IMAGE',
          image_url: imgUrl,
          is_carousel_item: 'true',
        });
        const res = await fetch(url, {
          method: 'POST',
          body: params,
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || `Failed to create carousel item: HTTP ${res.status}`);
        }
        itemContainerIds.push(data.id);
      }

      // Step 2: Wait for all carousel items to be ready
      for (const itemId of itemContainerIds) {
        await this.waitForMediaReady(itemId, 12);
      }

      // Step 3: Create parent Carousel container
      const carouselUrl = `${THREADS_API_BASE}/${this.userId}/threads`;
      const carouselParams = new URLSearchParams({
        access_token: this.accessToken,
        media_type: 'CAROUSEL',
        children: itemContainerIds.join(','),
        text: options.text,
      });
      if (options.replyToId) carouselParams.set('reply_to_id', options.replyToId);

      const carouselRes = await fetch(carouselUrl, {
        method: 'POST',
        body: carouselParams,
      });

      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || carouselData.error) {
        throw new Error(carouselData.error?.message || `Failed to create Carousel container: HTTP ${carouselRes.status}`);
      }

      const carouselCreationId = carouselData.id;

      // Step 4: Publish parent carousel container
      const { id: threadsId } = await this.publishContainer(carouselCreationId);

      return {
        success: true,
        creationId: carouselCreationId,
        threadsId,
        permalink: `https://threads.net/t/${threadsId}`,
        isMock: false,
      };
    } catch (err: any) {
      console.error('❌ ThreadsClient Carousel Publish Error:', err);
      return {
        success: false,
        error: err.message || 'Unknown Threads API carousel error',
      };
    }
  }

  /**
   * Fetch direct replies on a published post using the /replies endpoint.
   * NOTE: The /conversation endpoint only works for root posts and returns empty
   * for reply-type posts. The /replies endpoint correctly returns direct children
   * for any post (root or reply), which is essential for detecting nested comments.
   */
  public async getConversation(mediaId: string): Promise<any[]> {
    if (this.isDryRun || !this.isConfigured()) {
      return [];
    }

    try {
      const url = `${THREADS_API_BASE}/${mediaId}/replies?fields=id,text,timestamp,username,permalink&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.error(`❌ Failed to fetch replies for thread ${mediaId}:`, err);
      return [];
    }
  }

  /**
   * Fetch profile info of the authenticated user
   */
  public async getProfile(): Promise<any> {
    if (this.isDryRun || !this.isConfigured()) {
      return {
        id: this.userId || 'mock_user_id',
        username: 'threads_creator_ai',
        name: 'Autonomous Creator',
        threads_biography: 'Exploring tech, ergonomics, and everyday aesthetics.',
      };
    }

    const url = `${THREADS_API_BASE}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${this.accessToken}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
  }

  /**
   * Fetch insights for a specific post (views, likes, replies, reposts, quotes)
   */
  public async getPostInsights(mediaId: string): Promise<Record<string, number> | null> {
    if (this.isDryRun || !this.isConfigured()) {
      return { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0 };
    }

    try {
      const url = `${THREADS_API_BASE}/${mediaId}/insights?metric=views,likes,replies,reposts,quotes&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.data || !Array.isArray(data.data)) return null;

      const result: Record<string, number> = {};
      for (const item of data.data) {
        const val = item.values?.[0]?.value ?? item.total_value?.value ?? 0;
        result[item.name] = val;
      }
      return result;
    } catch (err) {
      console.error(`❌ Failed to fetch insights for media ${mediaId}:`, err);
      return null;
    }
  }

  /**
   * Fetch user-level account insights (views, likes, replies, reposts, quotes, followers_count)
   */
  public async getUserInsights(): Promise<Record<string, number> | null> {
    if (this.isDryRun || !this.isConfigured() || !this.userId) {
      return { views: 0, likes: 0, replies: 0, reposts: 0, quotes: 0, followers_count: 0 };
    }

    try {
      const url = `${THREADS_API_BASE}/${this.userId}/threads_insights?metric=views,likes,replies,reposts,quotes,followers_count&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data.data || !Array.isArray(data.data)) return null;

      const result: Record<string, number> = {};
      for (const item of data.data) {
        const val = item.total_value?.value ?? item.values?.[item.values.length - 1]?.value ?? 0;
        result[item.name] = val;
      }
      return result;
    } catch (err) {
      console.error(`❌ Failed to fetch user insights for ${this.userId}:`, err);
      return null;
    }
  }
}

export default ThreadsClient;
