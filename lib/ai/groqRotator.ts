import stateManager from '@/lib/memory/stateManager';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIGenerationOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  provider?: 'auto' | 'mistral' | 'gemini' | 'groq' | 'xkiro';
}

export interface AIGenerationResult {
  text: string;
  provider: 'groq' | 'xkiro' | 'mistral' | 'gemini' | 'mock';
  modelUsed: string;
  durationMs: number;
}

interface KeyHealth {
  consecutiveErrors: number;
  lastFailedAt?: number;
  cooldownUntil?: number;
  isInvalid?: boolean; // 401 Unauthorized
}

class AIRotatorEngine {
  private keyHealthMap = new Map<string, KeyHealth>();
  private groqKeyIndex = 0;
  private mistralKeyIndex = 0;
  private xkiroKeyIndex = 0;
  private geminiKeyIndex = 0;

  /**
   * Mark a key with error status (e.g. 401 invalid, 429 cooldown)
   */
  private markKeyStatus(key: string, status: number) {
    const health = this.keyHealthMap.get(key) || { consecutiveErrors: 0 };
    health.consecutiveErrors += 1;
    health.lastFailedAt = Date.now();

    if (status === 401 || status === 403) {
      health.isInvalid = true;
      health.cooldownUntil = Date.now() + 60 * 60 * 1000; // 1 hour
    } else if (status === 429) {
      health.cooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minutes
    } else {
      health.cooldownUntil = Date.now() + 60 * 1000; // 1 minute
    }

    this.keyHealthMap.set(key, health);
  }

  private isKeyHealthy(key: string): boolean {
    const health = this.keyHealthMap.get(key);
    if (!health) return true;
    if (health.isInvalid) return false;
    if (health.cooldownUntil && health.cooldownUntil > Date.now()) return false;
    return true;
  }

  private getHealthyKeys(keys: string[]): string[] {
    return keys.filter((k) => k && k.length > 5 && this.isKeyHealthy(k));
  }

  /**
   * Pull latest multi-key configuration from database merged with environment
   */
  private async getResolvedConfig() {
    let dbConfig: any = null;
    try {
      const state = await stateManager.getState();
      dbConfig = state?.aiConfig || {};
    } catch {
      dbConfig = {};
    }

    // Mistral Keys
    const envMistral = (process.env.MISTRAL_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean);
    const dbMistral = (dbConfig.mistralKeys || []).map((k: string) => k.trim()).filter(Boolean);
    const mistralKeys = Array.from(new Set([...dbMistral, ...envMistral]));
    const mistralModel = dbConfig.mistralModel || process.env.MISTRAL_MODEL || 'open-mistral-7b';

    // Groq Keys
    const envGroq = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const dbGroq = (dbConfig.groqKeys || []).map((k: string) => k.trim()).filter(Boolean);
    const groqKeys = Array.from(new Set([...dbGroq, ...envGroq]));
    const groqModel = dbConfig.groqModel || process.env.GROQ_MODEL_PRIMARY || 'llama-3.3-70b-versatile';

    // xKiro Keys
    const envXkiro = (process.env.XKIRO_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean);
    const dbXkiro = (dbConfig.xkiroKeys || []).map((k: string) => k.trim()).filter(Boolean);
    const xkiroKeys = Array.from(new Set([...dbXkiro, ...envXkiro]));
    const xkiroBaseUrl = dbConfig.xkiroBaseUrl || process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1';
    const xkiroModel = dbConfig.xkiroModel || process.env.XKIRO_MODEL || 'mistralai/mistral-large-2512';

    // Gemini Keys
    const envGemini = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    const dbGemini = (dbConfig.geminiKeys || []).map((k: string) => k.trim()).filter(Boolean);
    const geminiKeys = Array.from(new Set([...dbGemini, ...envGemini]));
    const geminiModel = dbConfig.geminiModel || process.env.GEMINI_MODEL || 'gemini-3.6-flash';

    const preferredProvider = dbConfig.preferredProvider || 'mistral';

    return {
      mistralKeys,
      mistralModel,
      geminiKeys,
      geminiModel,
      groqKeys,
      groqModel,
      xkiroKeys,
      xkiroBaseUrl,
      xkiroModel,
      preferredProvider,
    };
  }

  /**
   * Main completion runner with round-robin and multi-tier failover
   */
  public async generate(options: AIGenerationOptions): Promise<AIGenerationResult> {
    const startTime = Date.now();
    const temperature = options.temperature ?? 0.8;
    const maxTokens = options.maxTokens ?? 600;

    const config = await this.getResolvedConfig();

    // Determine execution order: Mistral -> Gemini -> xKiro -> Groq
    const providersToTry: Array<'mistral' | 'gemini' | 'groq' | 'xkiro'> = [];

    if (options.provider && options.provider !== 'auto') {
      providersToTry.push(options.provider);
    } else if (config.preferredProvider && config.preferredProvider !== 'auto') {
      providersToTry.push(config.preferredProvider as any);
      if (config.preferredProvider !== 'mistral') providersToTry.push('mistral');
      if (config.preferredProvider !== 'gemini') providersToTry.push('gemini');
      if (config.preferredProvider !== 'xkiro') providersToTry.push('xkiro');
      if (config.preferredProvider !== 'groq') providersToTry.push('groq');
    } else {
      // Default auto order: Prioritize verified healthy providers
      const healthyMistral = this.getHealthyKeys(config.mistralKeys);
      const healthyGemini = this.getHealthyKeys(config.geminiKeys);
      const healthyXkiro = this.getHealthyKeys(config.xkiroKeys);
      const healthyGroq = this.getHealthyKeys(config.groqKeys);

      if (healthyMistral.length > 0) providersToTry.push('mistral');
      if (healthyGemini.length > 0) providersToTry.push('gemini');
      if (healthyXkiro.length > 0) providersToTry.push('xkiro');
      if (healthyGroq.length > 0) providersToTry.push('groq');

      // Guarantee fallback sequence
      if (!providersToTry.includes('mistral')) providersToTry.push('mistral');
      if (!providersToTry.includes('gemini')) providersToTry.push('gemini');
      if (!providersToTry.includes('xkiro')) providersToTry.push('xkiro');
    }

    for (const provider of providersToTry) {
      if (provider === 'mistral') {
        const healthyKeys = this.getHealthyKeys(config.mistralKeys);
        if (healthyKeys.length === 0 && config.mistralKeys.length > 0) {
          // If all marked cooldown, reset and try first
          healthyKeys.push(...config.mistralKeys);
        }

        for (let i = 0; i < healthyKeys.length; i++) {
          const key = healthyKeys[this.mistralKeyIndex % healthyKeys.length];
          this.mistralKeyIndex = (this.mistralKeyIndex + 1) % healthyKeys.length;

          try {
            const model = options.model || config.mistralModel || 'open-mistral-7b';
            const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
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
              if (text) {
                return {
                  text,
                  provider: 'mistral',
                  modelUsed: model,
                  durationMs: Date.now() - startTime,
                };
              }
            }

            this.markKeyStatus(key, res.status);
            console.warn(`⚠️ Mistral key failed (HTTP ${res.status}): ${await res.text()}`);
          } catch (err) {
            this.markKeyStatus(key, 500);
            console.warn('⚠️ Mistral request error:', err);
          }
        }
      }

      if (provider === 'gemini') {
        const healthyKeys = this.getHealthyKeys(config.geminiKeys);
        if (healthyKeys.length > 0) {
          const key = healthyKeys[this.geminiKeyIndex % healthyKeys.length];
          this.geminiKeyIndex = (this.geminiKeyIndex + 1) % healthyKeys.length;

          // Format payload for Gemini API
          const systemMsg = options.messages.find((m) => m.role === 'system')?.content;
          const userMsgs = options.messages.filter((m) => m.role !== 'system');
          const contents = userMsgs.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

          const candidateModels = Array.from(new Set([
            options.model,
            config.geminiModel,
            'gemini-3.6-flash',
            'gemini-3.8-flash',
            'gemini-2.5-flash',
          ].filter(Boolean) as string[]));

          for (const model of candidateModels) {
            try {
              const bodyPayload: any = {
                contents,
                generationConfig: {
                  temperature,
                  maxOutputTokens: maxTokens,
                },
              };
              if (systemMsg) {
                bodyPayload.systemInstruction = {
                  parts: [{ text: systemMsg }],
                };
              }

              const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
              });

              if (res.ok) {
                const data = await res.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
                if (text) {
                  return {
                    text,
                    provider: 'gemini',
                    modelUsed: model,
                    durationMs: Date.now() - startTime,
                  };
                }
              }

              if (res.status === 400 || res.status === 401 || res.status === 403 || res.status === 429) {
                this.markKeyStatus(key, res.status);
              }
              const errText = await res.text();
              console.warn(`⚠️ Gemini model [${model}] failed (HTTP ${res.status}): ${errText.substring(0, 120)}`);
            } catch (err: any) {
              this.markKeyStatus(key, 500);
              console.warn(`⚠️ Gemini request exception for [${model}]:`, err?.message);
            }
          }
        }
      }

      if (provider === 'groq') {
        const healthyKeys = this.getHealthyKeys(config.groqKeys);
        if (healthyKeys.length === 0 && config.groqKeys.length > 0) {
          healthyKeys.push(...config.groqKeys);
        }

        for (let i = 0; i < healthyKeys.length; i++) {
          const key = healthyKeys[this.groqKeyIndex % healthyKeys.length];
          this.groqKeyIndex = (this.groqKeyIndex + 1) % healthyKeys.length;

          try {
            const model = options.model || config.groqModel || 'llama-3.3-70b-versatile';
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`,
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
              if (text) {
                return {
                  text,
                  provider: 'groq',
                  modelUsed: model,
                  durationMs: Date.now() - startTime,
                };
              }
            }

            this.markKeyStatus(key, res.status);
            console.warn(`⚠️ Groq key failed (HTTP ${res.status}): ${await res.text()}`);
          } catch (err) {
            this.markKeyStatus(key, 500);
            console.warn('⚠️ Groq request error:', err);
          }
        }
      }

      if (provider === 'xkiro') {
        const healthyKeys = this.getHealthyKeys(config.xkiroKeys);
        if (healthyKeys.length > 0) {
          const key = healthyKeys[this.xkiroKeyIndex % healthyKeys.length];
          this.xkiroKeyIndex = (this.xkiroKeyIndex + 1) % healthyKeys.length;

          const configuredModels = (config.xkiroModel || 'mistralai/mistral-large-2512')
            .split(',')
            .map((m: string) => m.trim())
            .filter(Boolean);
          if (!configuredModels.includes('mistralai/mistral-large-2512')) {
            configuredModels.unshift('mistralai/mistral-large-2512');
          }
          if (!configuredModels.includes('mistralai/mistral-medium-3.5')) {
            configuredModels.push('mistralai/mistral-medium-3.5');
          }

          for (const model of configuredModels) {
            try {
              const res = await fetch(`${config.xkiroBaseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${key}`,
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
                if (text) {
                  return {
                    text,
                    provider: 'xkiro',
                    modelUsed: model,
                    durationMs: Date.now() - startTime,
                  };
                }
              }

              this.markKeyStatus(key, res.status);
            } catch (err) {
              this.markKeyStatus(key, 500);
              console.warn(`⚠️ xKiro failover error for model [${model}]:`, err);
            }
          }
        }
      }
    }

    // 4. Safe Simulation Mock Response if all configured keys failed
    console.warn('⚠️ All live AI providers failed or were unavailable. Falling back to dynamic mock.');
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

