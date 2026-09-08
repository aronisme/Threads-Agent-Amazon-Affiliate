import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/db/client';
import Post from '@/db/models/Post';
import ThreadsClient from '@/lib/threads/client';
import stateManager from '@/lib/memory/stateManager';

export const dynamic = 'force-dynamic';

// In-memory fallback post storage for standalone/local testing
let inMemoryPosts: any[] = [
  {
    _id: 'post_mock_1',
    type: 'ORIGINAL_THOUGHT',
    text: "the transition from 'i don't need a monitor arm' to 'my neck has never felt this relieved' happens instantly on day one.",
    status: 'PUBLISHED',
    threadsId: '17928391283',
    simulationData: {
      fitScore: 94,
      reasoning: 'Observation on ergonomics | Mood: CURIOUS | Persona Fit: 95%',
      targetTopic: 'desk setup',
    },
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    _id: 'post_mock_2',
    type: 'QUESTION',
    text: "what is one desk accessory under $30 that genuinely solved a daily annoyance for you? looking for things that actually hold up.",
    status: 'PUBLISHED',
    threadsId: '17928391284',
    simulationData: {
      fitScore: 91,
      reasoning: 'Conversation starter on practical desk tools',
      targetTopic: 'everyday tech',
    },
    createdAt: new Date(Date.now() - 7200000),
  },
];

export async function GET(req: NextRequest) {
  const conn = await connectToDatabase();
  if (!conn) {
    const status = req.nextUrl.searchParams.get('status');
    let filtered = inMemoryPosts;
    if (status && status !== 'ALL') {
      filtered = inMemoryPosts.filter((p) => p.status === status);
    }
    return NextResponse.json({ success: true, posts: filtered });
  }

  try {
    const status = req.nextUrl.searchParams.get('status');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);

    const query: any = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }

    const posts = await Post.find(query)
      .populate('productId', 'name affiliateUrl category')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, posts });
  } catch (err: any) {
    return NextResponse.json({ success: true, posts: inMemoryPosts });
  }
}

export async function POST(req: NextRequest) {
  await connectToDatabase();
  try {
    const body = await req.json();
    const { action, postId, updatedText } = body;

    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      const state = await stateManager.getState();
      const threadsClient = new ThreadsClient(undefined, undefined, state.dryRunMode);

      const pubRes = await threadsClient.publishPost({
        text: updatedText || post.text,
        replyToId: post.parentId,
      });

      if (pubRes.success) {
        post.status = 'PUBLISHED';
        post.threadsId = pubRes.threadsId;
        post.publishedAt = new Date();
        if (updatedText) post.text = updatedText;
        await post.save();
        return NextResponse.json({ success: true, post, pubRes });
      } else {
        return NextResponse.json({ success: false, error: pubRes.error }, { status: 500 });
      }
    }

    if (action === 'REJECT') {
      post.status = 'REJECTED';
      await post.save();
      return NextResponse.json({ success: true, post });
    }

    if (action === 'UPDATE') {
      if (updatedText) post.text = updatedText;
      await post.save();
      return NextResponse.json({ success: true, post });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
