import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await connect(MONGODB_URI);
  console.log('Connected to Database!');

  // 1. Update user branchId
  const usersCol = connection.db.collection('users');
  await usersCol.updateOne(
    { email: 'manager@vinapharmacy.com' },
    { $set: { branchId: 'BR-001', branchName: 'Nhà thuốc VinaPharmacy - CN1' } }
  );
  await usersCol.updateOne(
    { email: 'pharmacist@vinapharmacy.com' },
    { $set: { branchId: 'BR-001', branchName: 'Nhà thuốc VinaPharmacy - CN1' } }
  );
  console.log('✅ Updated manager@vinapharmacy.com and pharmacist@vinapharmacy.com to branch BR-001');

  // 2. Clone some medicine batches to BR-001 to simulate existing stock
  const batchesCol = connection.db.collection('medicinebatches');
  
  // Clean existing BR-001 batches first to avoid duplicates if run multiple times
  await batchesCol.deleteMany({ branchId: 'BR-001' });

  // Find some active batches from CENTRAL_WH
  const centralBatches = await batchesCol.find({
    branchId: 'CENTRAL_WH',
    status: 'ACTIVE',
    stock: { $gt: 50 }
  }).limit(20).toArray();

  if (centralBatches.length > 0) {
    const newBatches = centralBatches.map(b => {
      const { _id, ...rest } = b;
      return {
        ...rest,
        branchId: 'BR-001',
        stock: Math.floor(Math.random() * 40) + 10, // Give them 10-50 stock
        batchNo: 'BR1-' + b.batchNo
      };
    });

    await batchesCol.insertMany(newBatches);
    console.log(`✅ Cloned ${newBatches.length} sample active batches from CENTRAL_WH to BR-001`);
  } else {
    console.log('⚠️ No active batches found in CENTRAL_WH to clone.');
  }

  // 3. Clone some medicine batches to BR-002 for variety
  await batchesCol.deleteMany({ branchId: 'BR-002' });
  const centralBatchesForCN2 = await batchesCol.find({
    branchId: 'CENTRAL_WH',
    status: 'ACTIVE',
    stock: { $gt: 50 }
  }).skip(20).limit(10).toArray();

  if (centralBatchesForCN2.length > 0) {
    const newBatchesCN2 = centralBatchesForCN2.map(b => {
      const { _id, ...rest } = b;
      return {
        ...rest,
        branchId: 'BR-002',
        stock: Math.floor(Math.random() * 30) + 5,
        batchNo: 'BR2-' + b.batchNo
      };
    });

    await batchesCol.insertMany(newBatchesCN2);
    console.log(`✅ Cloned ${newBatchesCN2.length} sample active batches from CENTRAL_WH to BR-002`);
  }

  await connection.close();
  console.log('Disconnected!');
}

run().catch(console.error);
