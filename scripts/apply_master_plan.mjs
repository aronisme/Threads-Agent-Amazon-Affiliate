import fs from 'fs';
import { MongoClient } from 'mongodb';

const envFile = fs.readFileSync('.env.local', 'utf8');
const uriMatch = envFile.match(/MONGODB_URI=(.+)/);
const uri = uriMatch ? uriMatch[1].trim() : null;

async function execute() {
  console.log('Connecting to MongoDB Atlas...');
  const client = new MongoClient(uri, { family: 4, serverSelectionTimeoutMS: 45000 });
  await client.connect();
  const db = client.db('threads_agent');

  const updateResult = await db.collection('agent_state').updateOne(
    {},
    {
      $set: {
        autonomyLevel: 2,
        dryRunMode: false,
        'persona.identityName': 'Avery',
        'persona.tagline': 'finding the little things that make everyday life, routines & coffee runs better ☕✨ As an Amazon Associate I earn from qualifying purchases.',
        'persona.nicheTopics': [
          'everyday life hacks & smart daily routines',
          'comfortable work from home habits & cozy living',
          'clever tech gadgets & travel essentials',
          'coffee routines & morning habits',
          'everyday wellness & simple self care',
          'practical Amazon finds that actually help',
        ],
        'persona.topicsToAvoid': [
          'politics & controversial debates',
          'crypto & web3 spam',
          'hard-sell affiliate marketing & aggressive promos',
          'cheap dropshipping junk',
          'toxic hustle culture & grindset boasting',
        ],
        'cooldowns.nextPostAllowedAt': null,
        'cooldowns.productMentionUntil': null,
        'cooldowns.selfReplyUntil': null,
        'commercialBudget.dailyLimit': 4,
        'commercialBudget.currentSpent': 0,
        updatedAt: new Date(),
      },
    }
  );

  console.log('MongoDB Agent State Updated:', updateResult.modifiedCount > 0 ? 'SUCCESS' : 'NO CHANGE / ALREADY SET');

  const state = await db.collection('agent_state').findOne({});
  console.log('Current Autonomy Level:', state?.autonomyLevel);
  console.log('Dry Run Mode:', state?.dryRunMode);
  console.log('Persona Tagline:', state?.persona?.tagline);
  console.log('Topics:', state?.persona?.nicheTopics);
  console.log('Cooldowns:', state?.cooldowns);

  await client.close();
  console.log('Execution completed successfully!');
}

execute().catch(console.error);
