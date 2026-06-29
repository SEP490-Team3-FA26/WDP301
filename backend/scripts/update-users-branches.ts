import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const userUpdates = [
  {
    id: '6a31a925bc3a87506af62f79',
    email: 'user@ABC pharmacy.com',
    role: 'branch',
    branchId: 'BR-001',
    branchName: 'Nhà thuốc ABC Pharmacy - CN1'
  },
  {
    id: '6a31aa6abc3a87506af62f8f',
    email: 'de180577tranhongphuoc@gmail.com',
    role: 'branch',
    branchId: 'BR-002',
    branchName: 'Nhà thuốc ABC Pharmacy - CN2'
  },
  {
    id: '6a33e68aa10423c1d9b778a1',
    email: 'phuocthde180577@fpt.edu.vn',
    role: 'branch',
    branchId: 'BR-003',
    branchName: 'Nhà thuốc ABC Pharmacy - CN3'
  },
  {
    id: '6a37c5a6f181cd4dbd7759cb',
    email: 'phuche2004p@gmail.com',
    role: 'branch',
    branchId: 'BR-004',
    branchName: 'Nhà thuốc ABC Pharmacy - CN4'
  }
];

async function run() {
  await connect(MONGODB_URI);
  console.log('Connected to Database!');

  const usersCol = connection.db.collection('users');

  for (const update of userUpdates) {
    const result = await usersCol.updateOne(
      { _id: new Types.ObjectId(update.id) },
      { $set: { role: update.role, branchId: update.branchId, branchName: update.branchName } }
    );
    console.log(`Updated user ${update.email} (ID: ${update.id}): role -> ${update.role}, branchId -> ${update.branchId}. Matched count: ${result.matchedCount}, Modified count: ${result.modifiedCount}`);
  }

  // Ensure all branches have some sample batches
  const batchesCol = connection.db.collection('medicinebatches');

  const branchesToSeed = ['BR-001', 'BR-002', 'BR-003', 'BR-004'];

  for (const branchId of branchesToSeed) {
    const count = await batchesCol.countDocuments({ branchId });
    if (count === 0) {
      console.log(`Seeding batches for ${branchId}...`);
      const centralBatches = await batchesCol.find({
        branchId: 'CENTRAL_WH',
        status: 'ACTIVE',
        stock: { $gt: 50 }
      }).limit(15).toArray();

      if (centralBatches.length > 0) {
        const newBatches = centralBatches.map(b => {
          const { _id, ...rest } = b;
          return {
            ...rest,
            branchId,
            stock: Math.floor(Math.random() * 40) + 10,
            batchNo: `${branchId.replace('-', '')}-${b.batchNo}`
          };
        });
        await batchesCol.insertMany(newBatches);
        console.log(`✅ Seeded ${newBatches.length} active batches for ${branchId}`);
      } else {
        console.log(`⚠️ No active batches in CENTRAL_WH to clone for ${branchId}`);
      }
    } else {
      console.log(`Branch ${branchId} already has ${count} batches.`);
    }
  }

  await connection.close();
  console.log('Disconnected!');
}

run().catch(console.error);
