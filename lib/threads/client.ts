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

  constructor(userId?: string, accessToken?: string, isDryRun: boolean = false) {
    this.userId = userId || process.env.THREADS_USER_ID || '';
    this.accessToken = accessToken || process.env.THREADS_ACCESS_TOKEN || '';
    this.isDryRun = isDryRun || process.env.DRY_RUN === 'true';
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
    const body: Record<string, string> = {
      access_token: this.accessToken,
      text: options.text,
      media_type: options.imageUrl ? 'IMAGE' : options.videoUrl ? 'VIDEO' : 'TEXT',
    };

    if (options.replyToId) body.reply_to_id = options.replyToId;
    if (options.quotePostId) body.quote_post_id = options.quotePostId;
    if (options.imageUrl) body.image_url = options.imageUrl;
    if (options.videoUrl) body.video_url = options.videoUrl;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: this.accessToken,
        creation_id: creationId,
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `Failed to publish Threads container: HTTP ${res.status}`);
    }

    return { id: data.id };
  }

  /**
   * Complete flow: create container + publish (with optional short wait for media processing)
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

      // Media requires a 2-3s processing pause before publishing
      if (options.imageUrl || options.videoUrl) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      // Step 2: Publish Container
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
   * Fetch conversation replies on a published post
   */
  public async getConversation(mediaId: string): Promise<any[]> {
    if (this.isDryRun || !this.isConfigured()) {
      return [];
    }

    try {
      const url = `${THREADS_API_BASE}/${mediaId}/conversation?fields=id,text,timestamp,username,permalink&access_token=${this.accessToken}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.data || [];
    } catch (err) {
      console.error(`❌ Failed to fetch conversation for thread ${mediaId}:`, err);
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
}

export default ThreadsClient;
