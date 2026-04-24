import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/iclever';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    const submissions = await db.collection('submissions').find({}).toArray();
    console.log(JSON.stringify(submissions, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
