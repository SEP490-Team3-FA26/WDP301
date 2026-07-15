import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkBranchInventory(branchId: string) {
  if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in env');
    process.exit(1);
  }

  await connect(MONGODB_URI);
  console.log(`\n📦 Đang kiểm tra tồn kho cho chi nhánh: ${branchId}...\n`);

  const medicineBatchesCol = connection.db.collection('medicinebatches');
  
  // Pipeline: 
  // 1. Lọc theo branchId và stock > 0
  // 2. Gom nhóm theo medicineId để tính tổng tồn kho của thuốc đó tại chi nhánh
  // 3. Lookup sang bảng medicines để lấy tên thuốc
  const pipeline = [
    { 
      $match: { 
        branchId: branchId,
        stock: { $gt: 0 }
      } 
    },
    {
      $group: {
        _id: { $toObjectId: "$medicineId" },
        totalStock: { $sum: "$stock" },
        batches: { $push: { batchNo: "$batchNo", expDate: "$expDate", stock: "$stock" } }
      }
    },
    {
      $lookup: {
        from: 'medicines',
        localField: '_id',
        foreignField: '_id',
        as: 'medicineDetails'
      }
    },
    { $unwind: "$medicineDetails" },
    {
      $project: {
        _id: 0,
        medicineId: '$_id',
        medicineName: '$medicineDetails.name',
        price: '$medicineDetails.price',
        totalStock: 1,
        batches: 1
      }
    },
    { $sort: { totalStock: -1 } }
  ];

  const inventory = await medicineBatchesCol.aggregate(pipeline).toArray();

  if (inventory.length === 0) {
    console.log(`❌ Không có mặt hàng nào còn tồn kho tại chi nhánh ${branchId}.`);
  } else {
    console.log(`✅ Tìm thấy ${inventory.length} loại mặt hàng còn tồn kho tại ${branchId}:`);
    console.dir(inventory.slice(0, 5), { depth: null }); // In ra 5 mặt hàng đầu tiên
    if (inventory.length > 5) {
      console.log(`... và ${inventory.length - 5} mặt hàng khác.`);
    }
  }

  await connection.close();
}

const targetBranch = process.argv[2] || 'BR-001';
checkBranchInventory(targetBranch).catch(console.error);
