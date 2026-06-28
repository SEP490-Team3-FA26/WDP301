/**
 * ================================================================
 * 📦 SCRIPT: clean-medicines.ts
 * Mục đích: 
 *   1. Tách thông tin kho: Di chuyển `stock` và `expiry_date` từ bảng `medicines` sang `medicinebatches`.
 *   2. Làm sạch trường: Đưa các trường từ `thong_tin_chi_tiet` ra ngoài làm trường phẳng cấp 1.
 *   3. Thiết lập giá bán `price` và phân loại `drug_classification` trực tiếp.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/clean-medicines.ts
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

// Hàm phân tích đơn vị tính từ Quy cách
function parseUnit(quyCach: string, defaultUnit: string = 'Hộp'): string {
  if (!quyCach) return defaultUnit;
  const lower = quyCach.toLowerCase();
  if (lower.includes('hộp')) return 'Hộp';
  if (lower.includes('vỉ')) return 'Vỉ';
  if (lower.includes('viên')) return 'Viên';
  if (lower.includes('chai') || lower.includes('lọ')) return 'Chai';
  if (lower.includes('gói')) return 'Gói';
  if (lower.includes('ống')) return 'Ống';
  if (lower.includes('tuýp')) return 'Tuýp';
  return defaultUnit;
}

async function run() {
  console.log('🔌 Đang kết nối tới MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Kết nối thành công!');

  const db = mongoose.connection.db!;
  const medicinesCol = db.collection('medicines');
  const batchesCol = db.collection('medicinebatches');

  // Lấy danh sách toàn bộ thuốc
  const medicines = await medicinesCol.find({}).toArray();
  console.log(`💊 Tìm thấy ${medicines.length} thuốc cần xử lý.`);

  let batchInsertCount = 0;
  let medicineUpdateCount = 0;

  const medicineBulkOps: any[] = [];
  const batchBulkOps: any[] = [];

  for (const med of medicines) {
    const medIdStr = med._id.toString();

    // 1. DI TRÚ KHO (STOCK & EXPIRY_DATE)
    const originalStock = typeof med.stock === 'number' ? med.stock : 0;
    const originalExpiry = med.expiry_date || '';

    if (originalStock > 0) {
      // Kiểm tra xem đã có lô hàng INIT-BATCH của thuốc này chưa
      const existingBatch = await batchesCol.findOne({
        medicineId: medIdStr,
        batchNo: 'INIT-BATCH'
      });

      if (!existingBatch) {
        // Tạo lô hàng khởi tạo mới
        const expDate = originalExpiry ? new Date(originalExpiry) : new Date('2026-12-31');
        const isExpired = expDate < new Date();

        batchBulkOps.push({
          insertOne: {
            document: {
              medicineId: medIdStr,
              batchNo: 'INIT-BATCH',
              expDate: expDate,
              stock: originalStock,
              status: isExpired ? 'EXPIRED' : 'ACTIVE',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        });
        batchInsertCount++;
      }
    }

    // 2. LÀM SẠCH DỮ LIỆU & PHẲNG HÓA TRƯỜNG
    const thongTin = med.thong_tin_chi_tiet || {};
    
    const registration_number = thongTin['Số đăng ký'] || '';
    const active_ingredient = thongTin['Thành phần'] || '';
    const manufacturer = thongTin['Nhà sản xuất'] || '';
    const dosage_form = thongTin['Dạng bào chế'] || '';
    
    // Đơn vị tính
    const unit = med.unit || parseUnit(thongTin['Quy cách'] || '', 'Hộp');

    // Giá bán cố định
    let price = med.price;
    if (typeof price !== 'number') {
      const priceRaw = thongTin['Giá bán'] || thongTin['price'];
      if (priceRaw) {
        const parsed = parseInt(String(priceRaw).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed > 0) {
          price = parsed;
        }
      }
      if (!price) {
        // Sinh giá ngẫu nhiên chia hết cho 1000 từ 15,000 - 450,000
        price = Math.floor(Math.random() * (450 - 15 + 1) + 15) * 1000;
      }
    }

    // Phân loại thuốc (drug_classification)
    let drug_classification = med.drug_classification;
    if (!drug_classification) {
      const canKeToa = thongTin['Thuốc cần kê toa'];
      const category = med.category || '';
      const name = med.name || '';

      if (canKeToa === 'Có' || category.toLowerCase().includes('kháng sinh') || name.toLowerCase().includes('kháng sinh')) {
        drug_classification = 'PRESCRIPTION_ANTIBIOTIC';
      } else if (category.toLowerCase().includes('an thần') || category.toLowerCase().includes('thần kinh')) {
        drug_classification = 'PSYCHOTROPIC_SLEEP';
      } else {
        drug_classification = 'COMMON_SUPPLEMENT';
      }
    }

    // Cập nhật phẳng hóa trường và $unset stock, expiry_date
    medicineBulkOps.push({
      updateOne: {
        filter: { _id: med._id },
        update: {
          $set: {
            registration_number,
            active_ingredient,
            manufacturer,
            dosage_form,
            unit,
            price,
            drug_classification,
            status: 'In Stock'
          },
          $unset: {
            stock: '',
            expiry_date: ''
          }
        }
      }
    });
    medicineUpdateCount++;
  }

  // Thực thi di trú lô hàng
  if (batchBulkOps.length > 0) {
    console.log(`📦 Đang thêm ${batchBulkOps.length} lô hàng khởi tạo INIT-BATCH vào database...`);
    const batchSize = 200;
    for (let i = 0; i < batchBulkOps.length; i += batchSize) {
      await batchesCol.bulkWrite(batchBulkOps.slice(i, i + batchSize));
    }
    console.log('✅ Thêm lô hàng thành công.');
  }

  // Thực thi cập nhật thuốc
  if (medicineBulkOps.length > 0) {
    console.log(`📝 Đang phẳng hóa trường và xóa stock/expiry_date của ${medicineBulkOps.length} thuốc...`);
    const batchSize = 200;
    for (let i = 0; i < medicineBulkOps.length; i += batchSize) {
      await medicinesCol.bulkWrite(medicineBulkOps.slice(i, i + batchSize));
    }
    console.log('✅ Cập nhật dữ liệu thuốc thành công.');
  }

  console.log('\n📊 KẾT QUẢ DI TRÚ:');
  console.log(` - Tạo mới lô INIT-BATCH: ${batchInsertCount}`);
  console.log(` - Cập nhật & phẳng hóa Medicines: ${medicineUpdateCount}`);

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB. Di trú hoàn tất!');
}

run().catch(err => {
  console.error('❌ Lỗi chạy script:', err);
  process.exit(1);
});
