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
    console.log('🔄 Connecting to MongoDB...', MONGODB_URI);
    await connect(MONGODB_URI);
    console.log('✅ Connected!');

    // Get list of collections
    const collections = await connection.db.listCollections().toArray();
    console.log('Collections in database:');
    collections.forEach(col => console.log(` - ${col.name}`));

    // Get counts
    const medicinesCount = await connection.db.collection('medicines').countDocuments();
    const batchesCount = await connection.db.collection('medicinebatches').countDocuments();
    console.log(`\nTotal medicines: ${medicinesCount}`);
    console.log(`Total medicine batches: ${batchesCount}`);

    // Inspect medicines schema by fetching raw documents
    const rawMedicines = await connection.db.collection('medicines').find().limit(2).toArray();
    console.log('\nSample Medicines:');
    console.dir(rawMedicines, { depth: null });

    // Inspect medicinebatches
    const rawBatches = await connection.db.collection('medicinebatches').find().limit(5).toArray();
    console.log('\nSample Medicine Batches:');
    console.dir(rawBatches, { depth: null });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.close();
    console.log('Disconnected!');
  }
}

run();
