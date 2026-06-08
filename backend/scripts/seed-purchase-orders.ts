/**
 * ================================================================
 * 📦 SCRIPT: seed-purchase-orders.ts
 * Mục đích: Cào nhà cung cấp và thuốc thực tế từ MongoDB rồi tạo
 *           dữ liệu mẫu đơn nhập hàng (Purchase Orders) vào collection
 *           `purchaseorders`.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-purchase-orders.ts
 *   # Xóa dữ liệu cũ và tạo lại:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-purchase-orders.ts --force
 * ================================================================
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;
if (!MONGODB_URI) {
  console.error('❌ Không tìm thấy MONGODB_URI trong file .env');
  process.exit(1);
}

// ─── Schemas (inline, không phụ thuộc NestJS) ─────────────────
const PurchaseOrderItemSchema = new mongoose.Schema({
  medicineId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
});

const PurchaseOrderSchema = new mongoose.Schema(
  {
    supplierId: { type: String, required: true },
    items: { type: [PurchaseOrderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      default: 'PENDING',
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
    },
    createdBy: { type: String },
  },
  { timestamps: true, collection: 'purchaseorders' },
);

// ─── Helpers ───────────────────────────────────────────────────
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPrice() {
  // Giá đơn vị mẫu: 5.000 → 500.000 (bội số 1.000)
  return randomInt(5, 500) * 1000;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickRandomN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

/** Tạo ngày quá khứ cách hiện tại từ 1 đến daysAgo ngày */
function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(1, daysAgo));
  return d;
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔗 Đang kết nối MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Kết nối thành công!\n');

  const db = mongoose.connection.db!;
  const PurchaseOrder = mongoose.model('PurchaseOrder', PurchaseOrderSchema);

  // Kiểm tra --force
  const args = process.argv.slice(2);
  const existingCount = await PurchaseOrder.countDocuments();
  if (existingCount > 0) {
    console.log(`ℹ️  Collection 'purchaseorders' đã có ${existingCount} bản ghi.`);
    if (!args.includes('--force')) {
      console.log('💡 Chạy với flag "--force" để xóa và tạo lại toàn bộ.\n');
      await mongoose.disconnect();
      return;
    }
    console.log('⚠️  --force detected! Đang xóa toàn bộ purchase orders cũ...');
    await PurchaseOrder.deleteMany({});
    console.log('🗑️  Đã xóa xong.\n');
  }

  // 1. Lấy danh sách suppliers ACTIVE từ DB
  const suppliersRaw = await db
    .collection('suppliers')
    .find({ status: 'ACTIVE' })
    .project({ _id: 1, name: 1 })
    .toArray();

  if (suppliersRaw.length === 0) {
    console.error('❌ Không có nhà cung cấp ACTIVE nào. Hãy chạy seed-suppliers.ts trước.');
    await mongoose.disconnect();
    return;
  }
  console.log(`👥 Tìm thấy ${suppliersRaw.length} nhà cung cấp ACTIVE.`);

  // 2. Lấy danh sách medicines từ DB (chỉ lấy _id và name)
  const medicinesRaw = await db
    .collection('medicines')
    .find({})
    .project({ _id: 1, name: 1 })
    .limit(200)
    .toArray();

  if (medicinesRaw.length === 0) {
    console.error('❌ Không có thuốc nào trong DB. Hãy import dữ liệu medicines trước.');
    await mongoose.disconnect();
    return;
  }
  console.log(`💊 Tìm thấy ${medicinesRaw.length} loại thuốc (lấy tối đa 200).`);

  // 3. Tạo các đơn nhập hàng mẫu
  const TOTAL_ORDERS = 30;
  const statuses: Array<'PENDING' | 'COMPLETED' | 'CANCELLED'> = [
    'PENDING', 'PENDING', 'PENDING',  // 40% PENDING
    'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', // 40% COMPLETED
    'CANCELLED',           // 10% CANCELLED
    'PENDING', 'COMPLETED',            // thêm để đủ
  ];

  const ordersToInsert = [];

  console.log(`\n📝 Đang tạo ${TOTAL_ORDERS} đơn nhập hàng mẫu...`);

  for (let i = 0; i < TOTAL_ORDERS; i++) {
    const supplier = pickRandom(suppliersRaw);
    // Mỗi đơn có 2-6 loại thuốc
    const selectedMedicines = pickRandomN(medicinesRaw, randomInt(2, 6));

    const items = selectedMedicines.map((med) => {
      const qty = randomInt(10, 200);
      const price = randomPrice();
      return {
        medicineId: med._id.toString(),
        quantity: qty,
        unitPrice: price,
      };
    });

    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const status = statuses[i % statuses.length];

    // Thêm createdAt quá khứ (1-90 ngày trước) để phân bố theo thời gian
    const createdAt = pastDate(90);

    ordersToInsert.push({
      supplierId: supplier._id.toString(),
      items,
      totalAmount,
      status,
      createdBy: 'seed-script',
      createdAt,
      updatedAt: createdAt,
    });
  }

  // 4. Insert toàn bộ
  const result = await PurchaseOrder.insertMany(ordersToInsert);
  console.log(`\n✅ Đã tạo thành công ${result.length} đơn nhập hàng!\n`);

  // 5. Thống kê
  const counts = { PENDING: 0, COMPLETED: 0, CANCELLED: 0 };
  ordersToInsert.forEach((o) => counts[o.status]++);
  const totalValue = ordersToInsert.reduce((s, o) => s + o.totalAmount, 0);

  console.log('📊 Thống kê:');
  console.log(`   ⏳ PENDING    : ${counts.PENDING} đơn`);
  console.log(`   ✅ COMPLETED  : ${counts.COMPLETED} đơn`);
  console.log(`   ❌ CANCELLED  : ${counts.CANCELLED} đơn`);
  console.log(`   💰 Tổng giá trị: ${totalValue.toLocaleString('vi-VN')} đ`);

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB.');
}

main().catch((err) => {
  console.error('💥 Lỗi khi chạy script:', err.message);
  process.exit(1);
});
