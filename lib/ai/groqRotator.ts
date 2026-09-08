/**
 * Multi-Key AI Engine with Groq Round-Robin Rotator & Cascade Failover
 * Fast execution (<1s) optimized for Vercel Serverless Function execution limits.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerationOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export interface AIGenerationResult {
  text: string;
  provider: 'groq' | 'xkiro' | 'mistral' | 'mock';
  modelUsed: string;
  durationMs: number;
}

class AIRotatorEngine {
  private groqKeys: string[] = [];
  private currentKeyIndex = 0;

  constructor() {
    this.reloadKeys();
  }

  public reloadKeys(): void {
    const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
    this.groqKeys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
  }

  private getNextGroqKey(): string | null {
    if (this.groqKeys.length === 0) return null;
    const key = this.groqKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.groqKeys.length;
    return key;
  }

  /**
   * Main completion runner with round-robin and multi-tier failover
   */
  public async generate(options: AIGenerationOptions): Promise<AIGenerationResult> {
    this.reloadKeys();
    const startTime = Date.now();
    const temperature = options.temperature ?? 0.8;
    const maxTokens = options.maxTokens ?? 600;

    // 1. Try Groq Keys
    if (this.groqKeys.length > 0) {
      const attempts = Math.min(this.groqKeys.length, 3);
      for (let i = 0; i < attempts; i++) {
        const apiKey = this.getNextGroqKey();
        if (!apiKey) break;

        try {
          const model = options.model || process.env.GROQ_MODEL_PRIMARY || 'qwen/qwen3.8-27b';
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: options.messages,
              temperature,
              max_tokens: maxTokens,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim() || '';
            return {
              text,
              provider: 'groq',
              modelUsed: model,
              durationMs: Date.now() - startTime,
            };
          }

          if (res.status === 429) {
            console.warn(`⚠️ Groq Key ${apiKey.substring(0, 8)}... rate-limited (429). Rotating to next key.`);
            continue;
          }

          const errorBody = await res.text();
          console.warn(`⚠️ Groq request failed with status ${res.status}: ${errorBody}`);
        } catch (err) {
          console.warn(`⚠️ Groq key attempt error:`, err);
        }
      }
    }

    // 2. Failover: xKiro AI (OpenAI Compatible)
    const xkiroKey = process.env.XKIRO_API_KEY;
    if (xkiroKey) {
      try {
        const xkiroBaseUrl = process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1';
        const model = process.env.XKIRO_MODEL || 'qwen/qwen3.8-max';
        const res = await fetch(`${xkiroBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${xkiroKey}`,
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          return {
            text,
            provider: 'xkiro',
            modelUsed: model,
            durationMs: Date.now() - startTime,
          };
        }
      } catch (err) {
        console.warn('⚠️ xKiro failover error:', err);
      }
    }

    // 3. Failover: Mistral AI
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
      try {
        const model = process.env.MISTRAL_MODEL || 'mistral-small-latest';
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mistralKey}`,
          },
          body: JSON.stringify({
            model,
            messages: options.messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content?.trim() || '';
          return {
            text,
            provider: 'mistral',
            modelUsed: model,
            durationMs: Date.now() - startTime,
          };
        }
      } catch (err) {
        console.warn('⚠️ Mistral failover error:', err);
      }
    }

    // 4. Safe Simulation Mock Response if no keys are available
    console.info('ℹ️ Using mock AI completion for development/testing.');
    return {
      text: this.getMockCompletion(options),
      provider: 'mock',
      modelUsed: 'mock-creator-v1',
      durationMs: Date.now() - startTime,
    };
  }

  private getMockCompletion(options: AIGenerationOptions): string {
    const lastUserMsg = options.messages.filter((m) => m.role === 'user').pop()?.content || '';
    if (lastUserMsg.includes('REPLY')) {
      return 'honestly so true, spent way too long thinking i was the only one who noticed this 😂';
    }
    if (lastUserMsg.includes('QUESTION')) {
      return "what's one desk accessory under $30 that genuinely made your everyday work less chaotic? looking for things that actually hold up.";
    }
    if (lastUserMsg.includes('PRODUCT') || lastUserMsg.includes('STORY')) {
      return "my toxic trait is refusing to untangle cords until my desk looks like a bowl of electric spaghetti. picked up a simple cable dock and the peace of mind is unmatched ngl.";
    }
    return "the transition from 'i don't need a standing desk mat' to 'my lower back demands a standing desk mat' happens so fast once you hit your mid-twenties.";
  }
}

export const aiEngine = new AIRotatorEngine();
export default aiEngine;
