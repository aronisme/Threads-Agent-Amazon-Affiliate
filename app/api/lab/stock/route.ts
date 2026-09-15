import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Post from '@/db/models/Post';
import ThreadsClient from '@/lib/threads/client';
import stateManager from '@/lib/memory/stateManager';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lab/stock
 * List all stock posts (QUEUED or SCHEDULED, source: LAB) for the Post Lab queue panel
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'ALL'; // ALL | QUEUED | SCHEDULED

    const query: Record<string, any> = { source: 'LAB' };
    if (filter === 'QUEUED') {
      query.status = 'QUEUED';
    } else if (filter === 'SCHEDULED') {
      query.status = 'SCHEDULED';
    } else {
      query.status = { $in: ['QUEUED', 'SCHEDULED'] };
    }

    const posts = await Post.find(query)
      .populate('productId', 'name affiliateUrl category imageUrl images')
      .populate('mediaStockId', 'title videoUrl thumbnailUrl category')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({ success: true, posts, count: posts.length });
  } catch (err: any) {
    console.error('❌ Lab stock list error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lab/stock
 * Manage stock posts: PUBLISH, DELETE, EDIT
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { postId, action, updatedText } = body;

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId is required.' },
        { status: 400 }
      );
    }

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found.' },
        { status: 404 }
      );
    }

    if (action === 'PUBLISH') {
      // Publish the stock post to Threads now
      const state = await stateManager.getState();
      const threadsClient = new ThreadsClient(undefined, undefined, state.dryRunMode);

      let publishResult: any;
      if (post.mediaType === 'CAROUSEL' && post.imageUrls && post.imageUrls.length >= 2) {
        publishResult = await threadsClient.publishCarousel({
          text: updatedText || post.text,
          imageUrls: post.imageUrls,
        });
      } else {
        publishResult = await threadsClient.publishPost({
          text: updatedText || post.text,
          imageUrl: post.imageUrl || undefined,
          videoUrl: post.videoUrl || undefined,
        });
      }

      if (publishResult.success) {
        post.status = 'PUBLISHED';
        post.threadsId = publishResult.threadsId;
        post.creationId = publishResult.creationId;
        post.publishedAt = new Date();
        if (updatedText) post.text = updatedText;
        await post.save();

        return NextResponse.json({
          success: true,
          post,
          publishResult: { threadsId: publishResult.threadsId, isMock: publishResult.isMock },
        });
      } else {
        return NextResponse.json(
          { success: false, error: publishResult.error || 'Publish failed.' },
          { status: 500 }
        );
      }
    }

    if (action === 'DELETE') {
      await Post.findByIdAndDelete(postId);
      return NextResponse.json({ success: true, message: 'Post deleted from stock.' });
    }

    if (action === 'EDIT') {
      if (updatedText && typeof updatedText === 'string') {
        post.text = updatedText.trim();
        await post.save();
      }
      return NextResponse.json({ success: true, post });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown action. Use PUBLISH, DELETE, or EDIT.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('❌ Lab stock action error:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
