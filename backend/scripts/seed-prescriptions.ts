/**
 * ================================================================
 * 📦 SCRIPT: seed-prescriptions.ts
 * Mục đích: Seed các đơn thuốc điện tử mẫu vào database MongoDB Atlas
 *   để phục vụ tính năng quét QR đơn thuốc.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-prescriptions.ts
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

async function run() {
  console.log('🔌 Đang kết nối tới MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Kết nối thành công!');

  const db = mongoose.connection.db!;
  const medicinesCol = db.collection('medicines');
  const prescriptionsCol = db.collection('prescriptions');
  const batchesCol = db.collection('medicinebatches');

  // 1. Xóa đơn thuốc cũ
  console.log('🗑️  Xóa các đơn thuốc điện tử cũ...');
  await prescriptionsCol.deleteMany({});

  // 2. Tìm một số thuốc thực tế trong DB để gán vào đơn thuốc
  console.log('🔍 Tìm thuốc thực tế trong database...');
  
  // Tìm thuốc tương tự Clopidogrel (ví dụ: Plavix) hoặc lấy đại diện
  let clopidogrel = await medicinesCol.findOne({ 
    $or: [
      { name: /plavix/i },
      { name: /clopidogrel/i },
      { active_ingredient: /clopidogrel/i }
    ]
  });

  // Tìm thuốc tương tự Omeprazole (ví dụ: Losec) hoặc lấy đại diện
  let omeprazole = await medicinesCol.findOne({ 
    $or: [
      { name: /losec/i },
      { name: /omeprazole/i },
      { active_ingredient: /omeprazole/i }
    ]
  });

  // Tìm thuốc giảm đau Paracetamol / Panadol
  let paracetamol = await medicinesCol.findOne({ 
    $or: [
      { name: /panadol/i },
      { name: /paracetamol/i },
      { active_ingredient: /paracetamol/i }
    ]
  });

  // Nếu thiếu, tự động lấy 3 thuốc ngẫu nhiên bất kỳ
  const allMeds = await medicinesCol.find({}).limit(5).toArray();
  if (!clopidogrel && allMeds.length > 0) clopidogrel = allMeds[0];
  if (!omeprazole && allMeds.length > 1) omeprazole = allMeds[1];
  if (!paracetamol && allMeds.length > 2) paracetamol = allMeds[2];

  if (!clopidogrel || !omeprazole || !paracetamol) {
    console.error('❌ Database trống, hãy chạy seed thuốc trước!');
    await mongoose.disconnect();
    return;
  }

  console.log(`🎯 Chọn thuốc cho đơn mẫu:`);
  console.log(` - Thuốc 1: ${clopidogrel.name} (${clopidogrel._id})`);
  console.log(` - Thuốc 2: ${omeprazole.name} (${omeprazole._id})`);
  console.log(` - Thuốc 3: ${paracetamol.name} (${paracetamol._id})`);

  // Tạo các lô hàng cho các thuốc này nếu chưa có để đảm bảo bán được hàng
  const selectedMedIds = [clopidogrel._id.toString(), omeprazole._id.toString(), paracetamol._id.toString()];
  
  // Đảm bảo các thuốc có lô hàng đủ số lượng và có hạn sử dụng gần/xa để test FIFO + Cảnh báo HSD
  const today = new Date();
  
  // 1. Lô hàng của Clopidogrel: Lô hết hạn xa (1.5 năm sau)
  const dateFar = new Date();
  dateFar.setMonth(today.getMonth() + 18);
  
  // 2. Lô hàng của Omeprazole: Có 2 lô (Lô hết hạn cực gần: 2 tháng sau để test Cảnh báo, Lô hết hạn xa)
  const dateNear = new Date();
  dateNear.setMonth(today.getMonth() + 2); // 2 tháng nữa hết hạn -> Cảnh báo gần HSD (< 6 tháng)

  const dateNormal = new Date();
  dateNormal.setMonth(today.getMonth() + 8); // 8 tháng nữa hết hạn

  console.log('📦 Thiết lập các lô hàng thử nghiệm FIFO & Cảnh báo HSD...');

  // Xóa các lô hàng cũ của 3 thuốc này để tránh lặp
  await batchesCol.deleteMany({ medicineId: { $in: selectedMedIds } });

  // Lô cho Clopidogrel
  await batchesCol.insertOne({
    medicineId: clopidogrel._id.toString(),
    batchNo: 'BAT-PLX-99',
    expDate: dateFar,
    stock: 100,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 2 Lô cho Omeprazole để test FIFO (Lô BAT-LSC-NEAR sẽ xuất trước vì hạn sớm hơn)
  await batchesCol.insertOne({
    medicineId: omeprazole._id.toString(),
    batchNo: 'BAT-LSC-NEAR',
    expDate: dateNear, // Hạn gần -> Xuất trước + Cảnh báo HSD
    stock: 15,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await batchesCol.insertOne({
    medicineId: omeprazole._id.toString(),
    batchNo: 'BAT-LSC-FAR',
    expDate: dateFar, // Hạn xa -> Xuất sau
    stock: 50,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Lô cho Paracetamol
  await batchesCol.insertOne({
    medicineId: paracetamol._id.toString(),
    batchNo: 'BAT-PND-01',
    expDate: dateNormal,
    stock: 200,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 3. SEED ĐƠN THUỐC ĐIỆN TỬ
  const mockPrescriptions = [
    {
      prescriptionCode: 'RX-99281-HAN',
      patientName: 'Nguyễn Văn Nam',
      patientAge: 42,
      patientGender: 'Nam',
      patientPhone: '0905123456',
      doctorName: 'BS. Lê Quang Vinh',
      doctorSpecialty: 'Tim mạch',
      hospitalName: 'Bệnh viện Đà Nẵng',
      hospitalCode: 'DN-4022',
      items: [
        {
          medicineId: clopidogrel._id.toString(),
          quantity: 28,
          dosage: 'Uống 1 viên/ngày, sau ăn sáng.'
        },
        {
          medicineId: omeprazole._id.toString(),
          quantity: 14,
          dosage: 'Uống 1 viên/ngày, trước ăn sáng 30 phút.'
        },
        {
          medicineId: paracetamol._id.toString(),
          quantity: 10,
          dosage: 'Uống 1 viên khi đau đầu, không quá 3 viên/ngày.'
        }
      ],
      status: 'PENDING'
    },
    {
      prescriptionCode: 'RX-112233-DNA',
      patientName: 'Trần Văn B',
      patientAge: 28,
      patientGender: 'Nam',
      patientPhone: '0912999888',
      doctorName: 'BS. Nguyễn Thị Lan',
      doctorSpecialty: 'Nội tổng hợp',
      hospitalName: 'Bệnh viện Trung ương Huế',
      hospitalCode: 'HUE-1002',
      items: [
        {
          medicineId: clopidogrel._id.toString(),
          quantity: 10,
          dosage: 'Uống 1 viên/ngày.'
        }
      ],
      status: 'PENDING'
    },
    {
      prescriptionCode: 'RX-445566-HCM',
      patientName: 'Lê Thị C',
      patientAge: 65,
      patientGender: 'Nữ',
      patientPhone: '0933555777',
      doctorName: 'BS. Phạm Minh Hoàng',
      doctorSpecialty: 'Lão khoa',
      hospitalName: 'Bệnh viện Chợ Rẫy',
      hospitalCode: 'CR-3001',
      items: [
        {
          medicineId: paracetamol._id.toString(),
          quantity: 30,
          dosage: 'Uống 1 viên sáng, 1 viên tối.'
        }
      ],
      status: 'FILLED' // Đơn này đã được bán từ trước để test thông báo đơn đã hoàn tất
    }
  ];

  console.log('📝 Ghi các đơn thuốc vào collection prescriptions...');
  await prescriptionsCol.insertMany(mockPrescriptions);

  console.log('✅ Đã seed thành công các đơn thuốc điện tử và thiết lập lô hàng thử nghiệm!');
  await mongoose.disconnect();
  console.log('🔌 Đã ngắt kết nối MongoDB.');
}

run().catch(err => {
  console.error('❌ Lỗi chạy seed đơn thuốc:', err);
  process.exit(1);
});
