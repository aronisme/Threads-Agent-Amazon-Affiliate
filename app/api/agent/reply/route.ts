import { NextRequest, NextResponse } from 'next/server';
import Job from '@/db/models/Job';
import Post from '@/db/models/Post';
import connectToDatabase from '@/db/client';
import workerRunner from '@/lib/scheduler/worker';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { incomingText, authorUsername, replyToId } = body;

    if (!incomingText) {
      return NextResponse.json({ success: false, error: 'incomingText is required' }, { status: 400 });
    }

    const cleanAuthor = (authorUsername || '').toLowerCase().replace(/^@/, '').trim();
    const ownUsername = (process.env.THREADS_USERNAME || 'averyfoundit').toLowerCase();
    if (cleanAuthor && (cleanAuthor === ownUsername || cleanAuthor === 'averyfoundit')) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat membalas komentar dari akun sendiri (@' + cleanAuthor + ').' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    if (replyToId) {
      const isOwnPost = await Post.findOne({ threadsId: replyToId });
      if (isOwnPost) {
        return NextResponse.json(
          { success: false, error: `Target ID ${replyToId} adalah postingan/komentar milik agen sendiri (${isOwnPost.type}).` },
          { status: 400 }
        );
      }
    }

    const job = new Job({
      type: 'GENERATE_REPLY',
      payload: {
        text: incomingText,
        authorUsername: authorUsername || 'anonymous_user',
        replyToId: replyToId || `mock_reply_target_${Date.now()}`,
      },
      status: 'PROCESSING',
      scheduledFor: new Date(),
    });

    const execution = await workerRunner.executeJob(job);
    return NextResponse.json({ success: true, execution });
  } catch (err: any) {
    console.error('❌ Error in /api/agent/reply:', err);
    return NextResponse.json({ success: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}
