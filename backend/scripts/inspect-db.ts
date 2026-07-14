import { connect, connection, Schema, model } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

async function run() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected!');

    const db = connection.db;
    const query = {
      $or: [
        { name: /KefenTech/i },
        { name: /Tiger Balm/i },
        { name: /Poncityl/i }
      ]
    };

    const results = await db.collection('medicines').find(query).toArray();
    console.log(`\nFound ${results.length} matching medicines in the database:`);
    results.forEach(med => {
      console.log({
        _id: med._id.toString(),
        name: med.name,
        category: med.category,
        price: med.price,
        stock: med.stock
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.close();
    console.log('Disconnected!');
  }
}

run();
