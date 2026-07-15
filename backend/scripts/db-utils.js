const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

/**
 * Tiện ích kết nối Database an toàn (dùng cho các script test/debug).
 * Tự động đọc chuỗi kết nối từ file .env gốc của project, KHÔNG HARDCODE.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('LỖI: Không tìm thấy biến môi trường MONGODB_URI trong file .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✅ Đã kết nối Database an toàn bằng MONGODB_URI từ .env');
  } catch (error) {
    console.error('❌ Kết nối Database thất bại:', error);
    process.exit(1);
  }
}

/**
 * Đóng kết nối Database sau khi chạy xong script
 */
async function disconnectDB() {
  await mongoose.disconnect();
  console.log('🔌 Đã đóng kết nối Database');
}

module.exports = {
  connectDB,
  disconnectDB,
  mongoose
};
