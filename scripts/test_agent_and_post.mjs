import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  }
});

const mongoUri = envVars.MONGODB_URI;
const dbName = envVars.MONGODB_DB_NAME || 'threads_agent';

async function runTest() {
  console.log('====================================================');
  console.log('🚀 MEMULAI PENGUJIAN LENGKAP: AGEN & POSTING THREADS');
  console.log('====================================================\n');

  // STEP 1: Connect to Database & Verify Config
  console.log('1️⃣ [Database] Menghubungkan ke MongoDB Atlas...');
  await mongoose.connect(mongoUri, {
    dbName,
    family: 4,
    serverSelectionTimeoutMS: 45000,
  });
  console.log('   ✅ Terhubung ke MongoDB Atlas!');

  const db = mongoose.connection.db;
  const stateDoc = await db.collection('agent_state').findOne();
  const envDoc = await db.collection('app_env').findOne({ key: 'main_env' });

  const userId = stateDoc.credentials?.userId || envDoc?.vars?.THREADS_USER_ID;
  const accessToken = stateDoc.credentials?.accessToken || envDoc?.vars?.THREADS_ACCESS_TOKEN;
  const mistralKey = stateDoc.aiConfig?.mistralKeys?.[0] || envDoc?.vars?.MISTRAL_API_KEY;
  const mistralModel = stateDoc.aiConfig?.mistralModel || 'open-mistral-7b';

  console.log(`   - Threads User ID: ${userId}`);
  console.log(`   - Threads Token Preview: ${accessToken?.substring(0, 10)}... (Panjang: ${accessToken?.length})`);
  console.log(`   - Dry-Run Mode di DB: ${stateDoc.dryRunMode} (Live: ${!stateDoc.dryRunMode})`);
  console.log(`   - Provider AI: Mistral (${mistralModel})`);

  // STEP 2: Test Threads Token Validity & Permissions
  console.log('\n2️⃣ [Threads API] Memeriksa Otorisasi & Akun di Meta Graph API...');
  const profileRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`);
  const profileData = await profileRes.json();

  if (profileData.error) {
    throw new Error(`Meta Threads API Error: ${profileData.error.message}`);
  }
  console.log(`   ✅ Akun Valid: @${profileData.username} (ID: ${profileData.id})`);

  // Check quota usage
  const quotaRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publishing_limit?fields=quota_usage,config&access_token=${accessToken}`);
  const quotaData = await quotaRes.json();
  const usage = quotaData.data?.[0]?.quota_usage ?? 0;
  console.log(`   ✅ Sisa Kuota API Threads: Digunakan ${usage} dari batas`);

  // STEP 3: Generate Live Creative Content with Mistral AI
  console.log('\n3️⃣ [AI Engine] Meminta Mistral AI membuat postingan organik unik...');
  const promptTopic = 'aesthetic desk setup and morning coffee productivity';
  const sysPrompt = `You are Avery (@averyfoundit), a 24-year-old creator who shares cozy lifestyle observations, minimalist desk setups, and coffee routines. 
Tone: casual, witty, relatable, conversational. 
Rules:
- Strictly lowercase or natural capitalization.
- Under 250 characters.
- NO hashtags, NO corporate jargon, NO spammy emojis.
- Sound like a real person sharing a genuine daily observation.`;

  const aiStartTime = Date.now();
  const aiRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mistralKey}`,
    },
    body: JSON.stringify({
      model: mistralModel,
      messages: [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: `Write a quick observation about ${promptTopic}.` },
      ],
      temperature: 0.8,
      max_tokens: 120,
    }),
  });

  const aiData = await aiRes.json();
  if (aiData.error) {
    throw new Error(`Mistral AI Error: ${aiData.error.message || JSON.stringify(aiData.error)}`);
  }

  let generatedText = aiData.choices?.[0]?.message?.content?.trim();
  // Strip outer quotes if any
  if ((generatedText.startsWith('"') && generatedText.endsWith('"')) || (generatedText.startsWith("'") && generatedText.endsWith("'"))) {
    generatedText = generatedText.slice(1, -1).trim();
  }

  const aiDuration = Date.now() - aiStartTime;
  console.log(`   ✅ AI Berhasil Menghasilkan Konten (${aiDuration}ms):`);
  console.log(`   📝 "${generatedText}"`);

  // STEP 4: Publish to Threads Graph API
  console.log('\n4️⃣ [Publishing] Mempublikasikan postingan ke Threads @averyfoundit...');

  // 4a. Create media container
  console.log('   - Langkah 4a: Membuat media container di Threads...');
  const containerRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      text: generatedText,
      media_type: 'TEXT',
    }),
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(`Gagal membuat container: ${containerData.error?.message || JSON.stringify(containerData)}`);
  }
  const creationId = containerData.id;
  console.log(`   ✅ Media container dibuat! Creation ID: ${creationId}`);

  // 4b. Publish container
  console.log('   - Langkah 4b: Menerbitkan container ke publik...');
  const publishRes = await fetch(`https://graph.threads.net/v1.0/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: accessToken,
      creation_id: creationId,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    throw new Error(`Gagal menerbitkan postingan: ${publishData.error?.message || JSON.stringify(publishData)}`);
  }
  const threadsPostId = publishData.id;
  const postUrl = `https://www.threads.net/@${profileData.username}/post/${threadsPostId}`;
  console.log(`   🎉 POSTINGAN BERHASIL TERBIT SECARA LIVE!`);
  console.log(`   🔗 Post ID Threads : ${threadsPostId}`);
  console.log(`   🌐 Link Threads     : ${postUrl}`);

  // STEP 5: Record Post in MongoDB
  console.log('\n5️⃣ [Database Record] Menyimpan riwayat posting ke database MongoDB...');
  const postRecord = {
    threadsId: threadsPostId,
    creationId,
    type: 'ORIGINAL_THOUGHT',
    text: generatedText,
    mediaType: 'TEXT',
    imageUrl: null,
    videoUrl: null,
    productId: null,
    parentId: null,
    status: 'PUBLISHED',
    simulationData: {
      fitScore: 96,
      reasoning: `Mood: CURIOUS | Provider: mistral | Model: ${mistralModel}`,
      targetTopic: promptTopic,
    },
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const insertResult = await db.collection('posts').insertOne(postRecord);
  console.log(`   ✅ Tersimpan di koleksi 'posts' (ID: ${insertResult.insertedId})`);

  // Update agent state action & counter
  await db.collection('agent_state').updateOne(
    {},
    {
      $inc: { 'dailyActions.postsCount': 1 },
      $set: {
        lastAction: {
          action: 'POST',
          type: 'ORIGINAL_THOUGHT',
          affiliateMode: 'NONE',
          timestamp: new Date(),
          summary: `Live published: ${generatedText.substring(0, 50)}...`,
        },
        'cooldowns.nextPostAllowedAt': new Date(Date.now() + 45 * 60 * 1000), // 45 min cooldown
        updatedAt: new Date(),
      },
    }
  );
  console.log(`   ✅ State counter dan cooldown berhasil diperbarui di MongoDB!`);

  console.log('\n====================================================');
  console.log('🎉 SEMUA PENGUJIAN SUKSES 100%!');
  console.log(`Lihat postingan asli sekarang di: ${postUrl}`);
  console.log('====================================================');

  await mongoose.disconnect();
}

runTest().catch((err) => {
  console.error('\n❌ ERROR SAAT PENGUJIAN:', err.message);
  process.exit(1);
});
