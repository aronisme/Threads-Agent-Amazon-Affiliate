/**
 * Multi-Provider AI Vision Engine with 3-Tier Cascading Failover:
 * Tier 1: Groq Vision (llama-3.2-11b-vision-preview) with round-robin multi-key rotator
 * Tier 2: xKiro AI Vision (qwen/qwen2.5-vl-72b-instruct / qwen-vl-max via OpenAI-compatible API)
 * Tier 3: Mistral AI Pixtral (pixtral-12b-2409 via official Mistral API)
 * Tier 4: Heuristic metadata fallback (ensures zero crashes if all external vision APIs are down)
 */

import { IVisualContext } from '../../types';

export interface VisionAnalysisOptions {
  imageUrl: string;
  productName: string;
  category?: string;
  notes?: string;
}

class VisionRotatorEngine {
  private groqKeys: string[] = [];
  private currentGroqIndex = 0;

  constructor() {
    this.reloadGroqKeys();
  }

  public reloadGroqKeys(): void {
    const rawKeys = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '';
    this.groqKeys = rawKeys
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 5);
  }

  private getNextGroqKey(): string | null {
    if (this.groqKeys.length === 0) return null;
    const key = this.groqKeys[this.currentGroqIndex];
    this.currentGroqIndex = (this.currentGroqIndex + 1) % this.groqKeys.length;
    return key;
  }

  /**
   * Main cascading entry point for AI Vision analysis
   */
  public async analyzeProductImage(options: VisionAnalysisOptions): Promise<IVisualContext> {
    const { imageUrl, productName, category = 'gear', notes = '' } = options;

    if (!imageUrl || !imageUrl.startsWith('http')) {
      return this.generateHeuristicFallback(productName, category, notes, 'Invalid or missing image URL');
    }

    const visionPrompt = `Analyze this product image for "${productName}" (${category}).
You are an expert visual curator for modern lifestyle & tech creators on Threads.
Examine the image carefully and extract authentic, tangible visual details:
1. Aesthetic style (e.g. minimalist matte dark mode, warm ergonomic wooden setup, clean travel EDC).
2. Dominant colors (e.g. space gray, matte black, off-white, bronze accent).
3. Visible materials & textures (e.g. anodized aluminum, woven braided nylon, textured silicone, tempered glass).
4. Relative scale and form factor (e.g. palm-sized, ultra-thin footprint, hefty desktop presence).
5. 2-3 genuine visual hooks that someone actually using/photographing it would notice (e.g. chamfered edges, recessed port, subtle matte texture that resists fingerprints).
6. Short summary description (1 casual sentence).

Respond ONLY with valid JSON in this exact structure without markdown or backticks:
{
  "aestheticStyle": "string",
  "dominantColors": ["string"],
  "materials": ["string"],
  "scaleAndForm": "string",
  "keyVisualHooks": ["string", "string"],
  "summaryDescription": "string"
}`;

    // Resolve image to base64 Data URL to bypass third-party/Amazon bot-blocking
    const imagePayloadUrl = await this.resolveImagePayload(imageUrl);

    // =========================================================================
    // TIER 1: GROQ VISION (qwen/qwen3.8-27b / qwen/qwen3.6-27b LPU)
    // =========================================================================
    this.reloadGroqKeys();
    if (this.groqKeys.length > 0) {
      const attempts = Math.min(this.groqKeys.length, 3);
      for (let i = 0; i < attempts; i++) {
        const apiKey = this.getNextGroqKey();
        if (!apiKey) break;

        try {
          const model = process.env.GROQ_VISION_MODEL || process.env.GROQ_MODEL_PRIMARY || 'qwen/qwen3.8-27b';
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: visionPrompt },
                    { type: 'image_url', image_url: { url: imagePayloadUrl } },
                  ],
                },
              ],
              temperature: 0.3,
              max_tokens: 500,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content?.trim() || '';
            const parsed = this.parseVisionJSON(content);
            if (parsed) {
              return {
                ...parsed,
                provider: 'groq',
                modelUsed: model,
                analyzedAt: new Date(),
              };
            }
          }

          if (res.status === 429) {
            console.warn(`⚠️ Groq Vision key rate-limited (${apiKey.substring(0, 8)}...). Rotating to next key.`);
            continue;
          }

          const errText = await res.text();
          console.warn(`⚠️ Groq Vision error (HTTP ${res.status}): ${errText.substring(0, 150)}`);
        } catch (err) {
          console.warn('⚠️ Groq Vision exception:', err);
        }
      }
    }

    // =========================================================================
    // TIER 2: XKiro AI VISION (Qwen Vision/VL OpenAI-Compatible endpoint)
    // =========================================================================
    const xkiroKey = process.env.XKIRO_API_KEY;
    if (xkiroKey) {
      try {
        const xkiroBaseUrl = process.env.XKIRO_BASE_URL || 'https://api.xkiro.com/v1';
        const model = process.env.XKIRO_VISION_MODEL || process.env.XKIRO_MODEL || 'qwen/qwen3.8-max';

        const res = await fetch(`${xkiroBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${xkiroKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { type: 'image_url', image_url: { url: imagePayloadUrl } },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          const parsed = this.parseVisionJSON(content);
          if (parsed) {
            return {
              ...parsed,
              provider: 'xkiro',
              modelUsed: model,
              analyzedAt: new Date(),
            };
          }
        } else {
          const errText = await res.text();
          console.warn(`⚠️ xKiro Vision failed (HTTP ${res.status}): ${errText.substring(0, 150)}`);
        }
      } catch (err) {
        console.warn('⚠️ xKiro Vision exception:', err);
      }
    }

    // =========================================================================
    // TIER 3: MISTRAL AI PIXTRAL (pixtral-12b-2409)
    // =========================================================================
    const mistralKey = process.env.MISTRAL_API_KEY;
    if (mistralKey) {
      try {
        const model = process.env.MISTRAL_VISION_MODEL || 'pixtral-12b-2409';
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${mistralKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: visionPrompt },
                  { type: 'image_url', image_url: { url: imagePayloadUrl } },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim() || '';
          const parsed = this.parseVisionJSON(content);
          if (parsed) {
            return {
              ...parsed,
              provider: 'mistral',
              modelUsed: model,
              analyzedAt: new Date(),
            };
          }
        } else {
          const errText = await res.text();
          console.warn(`⚠️ Mistral Pixtral failed (HTTP ${res.status}): ${errText.substring(0, 150)}`);
        }
      } catch (err) {
        console.warn('⚠️ Mistral Vision exception:', err);
      }
    }

    // =========================================================================
    // TIER 4: HEURISTIC / CONTEXTUAL FALLBACK
    // =========================================================================
    return this.generateHeuristicFallback(
      productName,
      category,
      notes,
      'All 3 external vision APIs were unavailable or rate-limited'
    );
  }

  /**
   * Pre-fetches an image URL with browser headers and converts it to a base64 Data URL.
   * This guarantees that external CDNs (like Amazon) won't block vision API servers from fetching the image.
   */
  private async resolveImagePayload(imageUrl: string): Promise<string> {
    if (!imageUrl || imageUrl.startsWith('data:image/')) {
      return imageUrl;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Keep base64 size reasonable (<= 3MB)
        if (buffer.length <= 3 * 1024 * 1024) {
          const contentType = res.headers.get('content-type') || 'image/jpeg';
          return `data:${contentType};base64,${buffer.toString('base64')}`;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Could not convert ${imageUrl.substring(0, 50)} to base64, using raw URL:`, err);
    }

    return imageUrl;
  }

  /**
   * Safe parser for LLM JSON output that might contain markdown backticks
   */
  private parseVisionJSON(raw: string): any | null {
    try {
      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          aestheticStyle: parsed.aestheticStyle || 'clean modern minimalist',
          dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors : ['matte black', 'neutral'],
          materials: Array.isArray(parsed.materials) ? parsed.materials : ['aluminum', 'matte composite'],
          scaleAndForm: parsed.scaleAndForm || 'compact everyday form factor',
          keyVisualHooks: Array.isArray(parsed.keyVisualHooks) && parsed.keyVisualHooks.length > 0
            ? parsed.keyVisualHooks
            : ['clean lines without garish logos', 'tactile build quality'],
          summaryDescription: parsed.summaryDescription || `${parsed.aestheticStyle || 'modern design'} with clean finish.`,
        };
      }
    } catch (e) {
      console.warn('⚠️ Failed to parse Vision JSON output:', raw.substring(0, 100));
    }
    return null;
  }

  /**
   * Offline intelligent heuristic fallback to ensure pipeline integrity
   */
  private generateHeuristicFallback(
    productName: string,
    category: string,
    notes: string,
    reason: string
  ): IVisualContext {
    const isTech = /charger|cable|monitor|desk|mac|phone|mouse|keyboard/i.test(`${productName} ${category} ${notes}`);
    const isErgonomic = /chair|cushion|foot rest|stand|arm/i.test(`${productName} ${category} ${notes}`);

    let aestheticStyle = 'clean contemporary desk aesthetic';
    let dominantColors = ['matte black', 'neutral gray'];
    let materials = ['matte composite', 'aluminum'];
    let scaleAndForm = 'compact desk footprint';
    let keyVisualHooks = ['subtle minimalist profile', 'satisfying matte finish that avoids fingerprint smudges'];

    if (isErgonomic) {
      aestheticStyle = 'ergonomic wellness setup';
      dominantColors = ['charcoal', 'slate gray', 'soft black'];
      materials = ['dense memory foam', 'breathable mesh', 'steel frame'];
      scaleAndForm = 'supportive contoured profile';
      keyVisualHooks = ['curved contouring designed for long sitting sessions', 'sturdy anti-slip base'];
    } else if (isTech) {
      aestheticStyle = 'minimalist EDC & desk tech';
      dominantColors = ['space gray', 'matte black'];
      materials = ['anodized aluminum', 'braided nylon'];
      scaleAndForm = 'palm-sized, ultra-portable';
      keyVisualHooks = ['flush ports with zero wobble', 'matte satin finish that looks clean on camera'];
    }

    return {
      aestheticStyle,
      dominantColors,
      materials,
      scaleAndForm,
      keyVisualHooks,
      summaryDescription: `${productName} in ${aestheticStyle}, featuring ${dominantColors.join(' and ')} tones.`,
      provider: 'heuristic',
      modelUsed: `heuristic-v1 (${reason})`,
      analyzedAt: new Date(),
    };
  }
}

export const visionRotator = new VisionRotatorEngine();
export default visionRotator;
