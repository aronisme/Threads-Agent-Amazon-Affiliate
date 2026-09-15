import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Post from '@/db/models/Post';
import Product from '@/db/models/Product';
import MediaStock from '@/db/models/MediaStock';
import ThreadsClient from '@/lib/threads/client';
import stateManager from '@/lib/memory/stateManager';

export const dynamic = 'force-dynamic';

/**
 * POST /api/lab/compose
 * Create a post from the Post Lab UI.
 * Actions: PUBLISH_NOW | SAVE_STOCK | SCHEDULE
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const {
      text,
      mediaType = 'TEXT',
      imageUrl,
      imageUrls,
      videoUrl,
      productId,
      mediaStockId,
      postType = 'ORIGINAL_THOUGHT',
      action = 'SAVE_STOCK',
      scheduledFor,
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Caption text is required.' },
        { status: 400 }
      );
    }

    const trimmedText = text.trim();

    // Validate product/media references if provided
    let linkedProduct = null;
    let linkedMedia = null;

    if (productId) {
      linkedProduct = await Product.findById(productId).lean();
      if (!linkedProduct) {
        return NextResponse.json(
          { success: false, error: 'Product not found in vault.' },
          { status: 404 }
        );
      }
    }

    if (mediaStockId) {
      linkedMedia = await MediaStock.findById(mediaStockId).lean();
      if (!linkedMedia) {
        return NextResponse.json(
          { success: false, error: 'Media stock item not found.' },
          { status: 404 }
        );
      }
    }

    // Determine status and publication based on action
    let status: 'PUBLISHED' | 'QUEUED' | 'SCHEDULED' = 'QUEUED';
    let publishResult: any = null;
    let parsedScheduledFor: Date | null = null;

    if (action === 'PUBLISH_NOW') {
      // Publish immediately to Threads
      const state = await stateManager.getState();
      const threadsClient = new ThreadsClient(undefined, undefined, state.dryRunMode);

      if (mediaType === 'CAROUSEL' && imageUrls && imageUrls.length >= 2) {
        publishResult = await threadsClient.publishCarousel({
          text: trimmedText,
          imageUrls,
        });
      } else {
        publishResult = await threadsClient.publishPost({
          text: trimmedText,
          imageUrl: imageUrl || undefined,
          videoUrl: videoUrl || undefined,
        });
      }

      if (!publishResult.success) {
        return NextResponse.json(
          { success: false, error: publishResult.error || 'Failed to publish to Threads.' },
          { status: 500 }
        );
      }

      status = 'PUBLISHED';
    } else if (action === 'SCHEDULE') {
      if (!scheduledFor) {
        return NextResponse.json(
          { success: false, error: 'scheduledFor datetime is required for scheduling.' },
          { status: 400 }
        );
      }
      parsedScheduledFor = new Date(scheduledFor);
      if (isNaN(parsedScheduledFor.getTime()) || parsedScheduledFor <= new Date()) {
        return NextResponse.json(
          { success: false, error: 'scheduledFor must be a valid future datetime.' },
          { status: 400 }
        );
      }
      status = 'SCHEDULED';
    } else {
      // SAVE_STOCK — save as QUEUED
      status = 'QUEUED';
    }

    // Save to database
    const post = await Post.create({
      threadsId: publishResult?.threadsId || null,
      creationId: publishResult?.creationId || null,
      type: postType,
      text: trimmedText,
      mediaType,
      imageUrl: imageUrl || null,
      imageUrls: imageUrls || [],
      videoUrl: videoUrl || null,
      productId: productId || null,
      mediaStockId: mediaStockId || null,
      status,
      source: 'LAB',
      scheduledFor: parsedScheduledFor,
      simulationData: {
        fitScore: 100,
        reasoning: `Lab-crafted post | Action: ${action}`,
        targetTopic: postType,
      },
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    });

    // Update product stats if linked
    if (linkedProduct && productId) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { timesMentioned: 1 },
        $set: { lastMentionedAt: new Date() },
      });
    }

    // Update media stock usage if linked
    if (linkedMedia && mediaStockId) {
      await MediaStock.findByIdAndUpdate(mediaStockId, {
        $inc: { timesUsed: 1 },
        $set: { lastUsedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: true,
      post,
      action,
      publishResult: publishResult ? { threadsId: publishResult.threadsId, isMock: publishResult.isMock } : null,
    });
  } catch (err: any) {
    console.error('❌ Lab compose error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
