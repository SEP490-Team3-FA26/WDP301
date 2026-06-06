const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wdp301');
  const db = mongoose.connection.db;
  const medicines = db.collection('medicines');
  
  const cursor = medicines.find({});
  let prescriptionCount = 0;
  let commonCount = 0;

  for await (const doc of cursor) {
    const isPrescription = doc.thong_tin_chi_tiet && doc.thong_tin_chi_tiet['Thuốc cần kê toa'] === 'Có';
    
    // Default to COMMON_SUPPLEMENT if not explicitly marked as prescription
    const classification = isPrescription ? 'PRESCRIPTION_ANTIBIOTIC' : 'COMMON_SUPPLEMENT';
    
    await medicines.updateOne(
      { _id: doc._id },
      { $set: { drug_classification: classification } }
    );
    
    if (isPrescription) prescriptionCount++;
    else commonCount++;
  }

  console.log("=== Kết quả Chuẩn hóa Migration ===");
  console.log(`Đã cập nhật ${prescriptionCount} thuốc thành PRESCRIPTION_ANTIBIOTIC`);
  console.log(`Đã cập nhật ${commonCount} thuốc thành COMMON_SUPPLEMENT`);
  console.log("Tổng cộng:", prescriptionCount + commonCount, "sản phẩm đã được chuẩn hóa.");

  mongoose.disconnect();
}
run().catch(console.error);
