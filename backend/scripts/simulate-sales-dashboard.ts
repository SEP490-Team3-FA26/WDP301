import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const BRANCHES = ['BR-001', 'BR-002', 'BR-003', 'BR-004'];

// Helper to get random date in July 2026
function getRandomDateInJuly2026() {
  const start = new Date('2026-07-01T00:00:00.000Z').getTime();
  const end = new Date('2026-07-31T23:59:59.000Z').getTime();
  return new Date(start + Math.random() * (end - start));
}

// Helper to get random integer
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await connect(MONGODB_URI);
  console.log('Connected successfully!');

  const medicinesCol = connection.db.collection('medicines');
  const medicineBatchesCol = connection.db.collection('medicinebatches');
  const salesOrdersCol = connection.db.collection('salesorders');
  const inventoryTransactionsCol = connection.db.collection('inventorytransactions');

  // Find medicines with stock > 0
  const availableMedicines = await medicinesCol.find({ stock: { $gt: 0 } }).toArray();
  
  if (availableMedicines.length === 0) {
    console.error('No medicines with stock available. Please add stock first.');
    await connection.close();
    return;
  }

  const numOrders = getRandomInt(15, 20);
  console.log(`Generating ${numOrders} sales orders for July 2026...`);

  let totalSalesOrdersInserted = 0;

  for (let i = 0; i < numOrders; i++) {
    const orderDate = getRandomDateInJuly2026();
    const branchId = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];
    const orderId = new Types.ObjectId();
    
    // Pick 1 to 3 random medicines
    const numItems = getRandomInt(1, 3);
    const orderItems = [];
    let orderTotalAmount = 0;
    const transactionsToInsert = [];

    for (let j = 0; j < numItems; j++) {
      const randomMedIndex = Math.floor(Math.random() * availableMedicines.length);
      const medicine = availableMedicines[randomMedIndex];
      
      let requestedQuantity = getRandomInt(1, 5);
      
      // Ensure we don't request more than available
      const dbMed = await medicinesCol.findOne({ _id: medicine._id });
      if (!dbMed || dbMed.stock <= 0) continue;
      
      if (requestedQuantity > dbMed.stock) {
        requestedQuantity = dbMed.stock;
      }

      // Find batches for this medicine, FIFO
      const batches = await medicineBatchesCol.find({ 
        medicineId: medicine._id.toString(),
        stock: { $gt: 0 }
      }).sort({ expDate: 1 }).toArray();

      let quantityToFulfill = requestedQuantity;
      const orderBatchItems = [];

      for (const batch of batches) {
        if (quantityToFulfill <= 0) break;

        const takeQuantity = Math.min(batch.stock, quantityToFulfill);
        
        // Deduct from batch
        await medicineBatchesCol.updateOne(
          { _id: batch._id },
          { $inc: { stock: -takeQuantity } }
        );

        orderBatchItems.push({
          batchNo: batch.batchNo,
          quantity: takeQuantity
        });

        // Prepare transaction
        transactionsToInsert.push({
          type: 'SALE_EXPORT',
          medicineId: medicine._id.toString(),
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: -takeQuantity,
          stockBefore: batch.stock,
          stockAfter: batch.stock - takeQuantity,
          referenceId: orderId.toString(),
          referenceType: 'SALES_ORDER',
          performedBy: 'Script Simulation',
          createdAt: orderDate,
          updatedAt: orderDate
        });

        quantityToFulfill -= takeQuantity;
      }

      const fulfilledQuantity = requestedQuantity - quantityToFulfill;

      if (fulfilledQuantity > 0) {
        // Deduct from medicine overall stock
        await medicinesCol.updateOne(
          { _id: medicine._id },
          { $inc: { stock: -fulfilledQuantity } }
        );

        const itemTotal = fulfilledQuantity * (medicine.price || 0);
        orderTotalAmount += itemTotal;

        orderItems.push({
          medicineId: medicine._id.toString(),
          name: medicine.name,
          quantity: fulfilledQuantity,
          price: medicine.price || 0,
          unit: medicine.unit || 'Hộp',
          batches: orderBatchItems
        });
      }
    }

    if (orderItems.length > 0) {
      const salesOrder = {
        _id: orderId,
        branchId: branchId,
        items: orderItems,
        totalAmount: orderTotalAmount,
        paymentMethod: 'CASH',
        type: 'RETAIL',
        patientName: 'Khách lẻ (Mô phỏng)',
        patientPhone: '0909000000',
        soldBy: 'System',
        createdAt: orderDate,
        updatedAt: orderDate
      };

      // Insert Order
      await salesOrdersCol.insertOne(salesOrder);
      
      // Insert Transactions
      if (transactionsToInsert.length > 0) {
        await inventoryTransactionsCol.insertMany(transactionsToInsert);
      }

      totalSalesOrdersInserted++;
    }
  }

  console.log(`Successfully inserted ${totalSalesOrdersInserted} simulated sales orders.`);
  
  // Aggregate to show summary
  const summary = await salesOrdersCol.aggregate([
    { 
      $match: {
        createdAt: {
          $gte: new Date('2026-07-01'),
          $lte: new Date('2026-07-31T23:59:59.999Z')
        }
      }
    },
    { 
      $group: { 
        _id: '$branchId', 
        count: { $sum: 1 }, 
        totalSales: { $sum: '$totalAmount' } 
      } 
    }
  ]).toArray();

  console.log('\n--- JULY 2026 SALES SUMMARY BY BRANCH ---');
  console.dir(summary, { depth: null });

  await connection.close();
  console.log('Database connection closed.');
}

run().catch(console.error);
