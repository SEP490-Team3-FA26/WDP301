import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await connect(MONGODB_URI);
  console.log('Connected!');

  const branches = await connection.db.collection('branches').find().toArray();
  console.log('--- BRANCHES ---');
  console.dir(branches, { depth: null });

  const users = await connection.db.collection('users').find().toArray();
  console.log('--- USERS ---');
  console.dir(users.map(u => ({ email: u.email, role: u.role, branchId: u.branchId, branchName: u.branchName })), { depth: null });

  const activeBatchesCountByBranch = await connection.db.collection('medicinebatches').aggregate([
    { $group: { _id: '$branchId', count: { $sum: 1 }, totalStock: { $sum: '$stock' } } }
  ]).toArray();
  console.log('--- BATCH SUMMARY BY BRANCH ---');
  console.dir(activeBatchesCountByBranch, { depth: null });

  await connection.close();
}
run();
