import { NextRequest, NextResponse } from 'next/server';
import aiEngine from '@/lib/ai/groqRotator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const provider = body.provider || 'auto';
    const testPrompt = body.prompt || 'Write a 1-sentence friendly greeting for an everyday Threads post.';

    const result = await aiEngine.generate({
      messages: [
        { role: 'system', content: 'You are Avery, a casual lifestyle creator on Threads.' },
        { role: 'user', content: testPrompt },
      ],
      temperature: 0.7,
      maxTokens: 80,
      provider: provider !== 'auto' ? provider : undefined,
    });

    return NextResponse.json({
      success: true,
      providerUsed: result.provider,
      modelUsed: result.modelUsed,
      text: result.text,
      durationMs: result.durationMs || Date.now() - startTime,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      durationMs: Date.now() - startTime,
    }, { status: 500 });
  }
}
