import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const branches = ['BR-001', 'BR-002', 'BR-003', 'BR-004'];

async function run() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await connect(MONGODB_URI);
  console.log('Connected successfully!');

  const salesordersCol = connection.db.collection('salesorders');
  
  // Find all orders that don't have a branchId or where branchId is null/undefined
  const orders = await salesordersCol.find({
    $or: [
      { branchId: { $exists: false } },
      { branchId: null }
    ]
  }).toArray();

  console.log(`Found ${orders.length} sales orders without a branchId.`);

  let updatedCount = 0;
  for (const order of orders) {
    // Pick a random branchId
    const randomBranchId = branches[Math.floor(Math.random() * branches.length)];
    
    await salesordersCol.updateOne(
      { _id: order._id },
      { $set: { branchId: randomBranchId } }
    );
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} sales orders with random branch IDs.`);

  // Verify the update
  const summary = await salesordersCol.aggregate([
    { $group: { _id: '$branchId', count: { $sum: 1 }, totalSales: { $sum: '$totalAmount' } } }
  ]).toArray();

  console.log('\n--- SALES ORDERS SUMMARY BY BRANCH ---');
  console.dir(summary, { depth: null });

  await connection.close();
  console.log('Database connection closed.');
}

run().catch(console.error);
