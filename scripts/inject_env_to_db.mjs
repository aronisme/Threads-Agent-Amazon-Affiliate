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

// Ensure optimal values
envVars.DRY_RUN = 'false';
envVars.MISTRAL_MODEL = 'open-mistral-7b';
envVars.GROQ_MODEL_PRIMARY = 'llama-3.3-70b-versatile';

console.log('Parsed Environment Variables to inject:', Object.keys(envVars));

const mongoUri = envVars.MONGODB_URI;
const dbName = envVars.MONGODB_DB_NAME || 'threads_agent';

async function inject() {
  console.log(`Connecting to MongoDB Atlas (DB: ${dbName})...`);
  await mongoose.connect(mongoUri, {
    dbName,
    family: 4,
    serverSelectionTimeoutMS: 45000,
  });
  console.log('Connected successfully!');

  const db = mongoose.connection.db;

  // 1. Upsert app_env collection
  console.log('\n--- Ingesting app_env Collection ---');
  await db.collection('app_env').updateOne(
    { key: 'main_env' },
    {
      $set: {
        key: 'main_env',
        vars: envVars,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  console.log('✅ app_env collection updated with all Environment Variables!');

  // 2. Update agent_state collection
  console.log('\n--- Ingesting agent_state Document ---');
  const agentStateUpdates = {
    dryRunMode: false,
    threadsUserId: envVars.THREADS_USER_ID,
    threadsAccessToken: envVars.THREADS_ACCESS_TOKEN,
    credentials: {
      userId: envVars.THREADS_USER_ID,
      accessToken: envVars.THREADS_ACCESS_TOKEN,
      appId: envVars.THREADS_APP_ID,
      appSecret: envVars.THREADS_APP_SECRET,
      tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    },
    aiConfig: {
      mistralKeys: (envVars.MISTRAL_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean),
      mistralModel: 'open-mistral-7b',
      groqKeys: (envVars.GROQ_API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean),
      groqModel: 'llama-3.3-70b-versatile',
      xkiroKeys: (envVars.XKIRO_API_KEY || '').split(',').map((k) => k.trim()).filter(Boolean),
      xkiroBaseUrl: envVars.XKIRO_BASE_URL || 'https://api.xkiro.com/v1',
      xkiroModel: envVars.XKIRO_MODEL || 'qwen/qwen3.8-max',
      preferredProvider: 'mistral',
    },
    'dailyActions.postsCount': 0,
    'dailyActions.date': new Date().toISOString().split('T')[0],
    'cooldowns.nextPostAllowedAt': null,
    updatedAt: new Date(),
  };

  const updateResult = await db.collection('agent_state').updateOne(
    {},
    { $set: agentStateUpdates },
    { upsert: true }
  );
  console.log('✅ agent_state document updated:', updateResult);

  // 3. Verify the updated state
  const verifiedDoc = await db.collection('agent_state').findOne();
  console.log('\n--- Verification: Document in agent_state ---');
  console.log('dryRunMode:', verifiedDoc.dryRunMode);
  console.log('credentials.userId:', verifiedDoc.credentials?.userId);
  console.log('credentials.accessToken preview:', verifiedDoc.credentials?.accessToken?.substring(0, 10) + '...');
  console.log('aiConfig.preferredProvider:', verifiedDoc.aiConfig?.preferredProvider);
  console.log('aiConfig.mistralModel:', verifiedDoc.aiConfig?.mistralModel);
  console.log('dailyActions.postsCount:', verifiedDoc.dailyActions?.postsCount);
  console.log('cooldowns.nextPostAllowedAt:', verifiedDoc.cooldowns?.nextPostAllowedAt);

  await mongoose.disconnect();
  console.log('\n🎉 ALL Environment Variables successfully injected directly into MongoDB Atlas!');
}

inject().catch((err) => {
  console.error('❌ Injection error:', err);
  process.exit(1);
});
