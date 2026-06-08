/**
 * ================================================================
 * 📦 SCRIPT: seed-suppliers.ts
 * Mục đích: Tạo hồ sơ các công ty Dược phẩm thực tế của Việt Nam
 *           vào collection `suppliers`.
 *           Mỗi nhà cung cấp có thể cung cấp nhiều nhóm thuốc khác nhau.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-suppliers.ts
 *   # Xóa cũ & tạo lại:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-suppliers.ts --force
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

// ─── Schema ──────────────────────────────────────────────────
const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contact_info: { type: String },
    business_registration_number: { type: String },
    gdp_certificate_number: { type: String, required: true },
    gdp_expiry_date: { type: Date, required: true },
    status: {
      type: String,
      default: 'ACTIVE',
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    },
  },
  { timestamps: true, collection: 'suppliers' },
);

// ─── Danh sách công ty Dược phẩm thực tế Việt Nam ────────────
// Mỗi công ty cung cấp nhiều nhóm thuốc khác nhau
const REAL_PHARMA_SUPPLIERS = [
  {
    name: 'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
    phone: '02923891433',
    email: 'business@dhgpharma.vn',
    brn: 'BRN-0900250507',
    gdpNo: 'GDP-0001/2023-BOH',
    gdpExpiry: new Date('2028-05-15'),
    status: 'ACTIVE',
    categories: ['Kháng sinh', 'Thuốc bổ', 'Siro trị ho cảm', 'Vitamins & Khoáng chất'],
  },
  {
    name: 'Công ty Dược phẩm Trung ương 1 (Pharbaco)',
    phone: '02438253272',
    email: 'info@pharbaco.com.vn',
    brn: 'BRN-0100100678',
    gdpNo: 'GDP-0002/2022-BOH',
    gdpExpiry: new Date('2027-08-20'),
    status: 'ACTIVE',
    categories: ['Dung dịch tiêm', 'Kháng sinh', 'Thuốc chống đông máu', 'Dung dịch truyền'],
  },
  {
    name: 'Công ty Cổ phần Traphaco',
    phone: '02436811234',
    email: 'sales@traphaco.com.vn',
    brn: 'BRN-0100108083',
    gdpNo: 'GDP-0003/2021-BOH',
    gdpExpiry: new Date('2025-03-31'), // Đã hết hạn - dùng để test chặn đơn hàng
    status: 'ACTIVE',
    categories: ['Thuốc bổ', 'Đông dược', 'Thuốc bổ gan', 'Siro bổ', 'Bổ xương khớp'],
  },
  {
    name: 'Công ty CP Dược phẩm OPC',
    phone: '02838553948',
    email: 'contact@opc.com.vn',
    brn: 'BRN-0302064780',
    gdpNo: 'GDP-0004/2023-BOH',
    gdpExpiry: new Date('2028-11-30'),
    status: 'ACTIVE',
    categories: ['Đông dược', 'Thực phẩm chức năng', 'Thuốc hỗ trợ tiêu hoá', 'Bổ xương khớp'],
  },
  {
    name: 'Công ty TNHH Dược phẩm Agimexpharm',
    phone: '02963852114',
    email: 'info@agimexpharm.com.vn',
    brn: 'BRN-1600401282',
    gdpNo: 'GDP-0005/2022-BOH',
    gdpExpiry: new Date('2027-02-28'),
    status: 'ACTIVE',
    categories: ['Kháng sinh', 'Thuốc chống viêm', 'Siro trị ho cảm', 'Thuốc an thần'],
  },
  {
    name: 'Công ty CP Pymepharco',
    phone: '02573823546',
    email: 'sales@pymepharco.com',
    brn: 'BRN-5100153049',
    gdpNo: 'GDP-0006/2023-BOH',
    gdpExpiry: new Date('2026-06-30'),
    status: 'ACTIVE',
    categories: ['Kháng sinh', 'Thuốc chống viêm', 'Dung dịch truyền', 'Vitamin C'],
  },
  {
    name: 'Công ty CP Dược phẩm Imexpharm',
    phone: '02773835755',
    email: 'info@imexpharm.com.vn',
    brn: 'BRN-0102453760',
    gdpNo: 'GDP-0007/2023-BOH',
    gdpExpiry: new Date('2028-09-15'),
    status: 'ACTIVE',
    categories: ['Thuốc kháng sinh', 'Thuốc tim mạch', 'Thuốc tiểu đường', 'Thuốc huyết áp'],
  },
  {
    name: 'Công ty Dược phẩm Bidiphar',
    phone: '02563823456',
    email: 'contact@bidiphar.vn',
    brn: 'BRN-4200200456',
    gdpNo: 'GDP-0008/2022-BOH',
    gdpExpiry: new Date('2027-04-10'),
    status: 'ACTIVE',
    categories: ['Dung dịch tiêm', 'Kháng sinh', 'Thuốc chống ung thư', 'Dung dịch truyền'],
  },
  {
    name: 'Công ty CP Dược Hà Tây (Hataphar)',
    phone: '02433531234',
    email: 'sales@hataphar.com',
    brn: 'BRN-0101400789',
    gdpNo: 'GDP-0009/2021-BOH',
    gdpExpiry: new Date('2024-12-31'), // Đã hết hạn - test case chặn đơn hàng
    status: 'ACTIVE',
    categories: ['Thuốc bổ', 'Siro bổ', 'Vitamins & Khoáng chất', 'Thực phẩm chức năng'],
  },
  {
    name: 'Công ty TNHH Sanofi-Aventis Việt Nam',
    phone: '02839306100',
    email: 'contact@sanofi-aventis.com.vn',
    brn: 'BRN-0301451890',
    gdpNo: 'GDP-0010/2024-BOH',
    gdpExpiry: new Date('2029-01-01'),
    status: 'ACTIVE',
    categories: ['Vaccine', 'Thuốc tim mạch', 'Thuốc tiểu đường', 'Kháng sinh'],
  },
  {
    name: 'Công ty TNHH Abbott Laboratories Việt Nam',
    phone: '02838247777',
    email: 'info@abbott.com.vn',
    brn: 'BRN-0301451234',
    gdpNo: 'GDP-0011/2023-BOH',
    gdpExpiry: new Date('2028-07-15'),
    status: 'ACTIVE',
    categories: ['Thực phẩm chức năng', 'Dinh dưỡng', 'Vitamins & Khoáng chất', 'Thuốc tiểu đường'],
  },
  {
    name: 'Công ty TNHH Novartis Việt Nam',
    phone: '02439361234',
    email: 'contact@novartis.vn',
    brn: 'BRN-0101560123',
    gdpNo: 'GDP-0012/2024-BOH',
    gdpExpiry: new Date('2029-03-20'),
    status: 'ACTIVE',
    categories: ['Thuốc chống ung thư', 'Thuốc tim mạch', 'Thuốc huyết áp', 'Thuốc chống viêm'],
  },
  {
    name: 'Công ty TNHH Pfizer Việt Nam',
    phone: '02839421234',
    email: 'info@pfizer.com.vn',
    brn: 'BRN-0301456789',
    gdpNo: 'GDP-0013/2024-BOH',
    gdpExpiry: new Date('2029-05-10'),
    status: 'ACTIVE',
    categories: ['Kháng sinh', 'Vaccine', 'Thuốc chống viêm', 'Thuốc thần kinh'],
  },
  {
    name: 'Công ty TNHH Roche Việt Nam',
    phone: '02439241234',
    email: 'contact@roche.com.vn',
    brn: 'BRN-0101345678',
    gdpNo: 'GDP-0014/2023-BOH',
    gdpExpiry: new Date('2027-12-31'),
    status: 'ACTIVE',
    categories: ['Thuốc chống ung thư', 'Thuốc tiểu đường', 'Thuốc thần kinh', 'Sinh phẩm'],
  },
  {
    name: 'Công ty CP Dược phẩm Mekophar',
    phone: '02838550864',
    email: 'info@mekophar.com.vn',
    brn: 'BRN-0304017867',
    gdpNo: 'GDP-0015/2022-BOH',
    gdpExpiry: new Date('2026-10-25'),
    status: 'ACTIVE',
    categories: ['Kháng sinh', 'Thuốc sát khuẩn', 'Thuốc bổ', 'Cao xoa', 'Dầu gió'],
  },
];

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔗 Đang kết nối MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Kết nối thành công!\n');

  const Supplier = mongoose.model('Supplier', SupplierSchema);
  const args = process.argv.slice(2);

  const existingCount = await Supplier.countDocuments();
  if (existingCount > 0) {
    console.log(`ℹ️  Collection 'suppliers' đã có ${existingCount} bản ghi.`);
    if (!args.includes('--force')) {
      console.log('💡 Chạy với flag "--force" để xóa và tạo lại toàn bộ.\n');
      await mongoose.disconnect();
      return;
    }
    console.log('⚠️  --force detected! Đang xóa toàn bộ suppliers cũ...');
    await Supplier.deleteMany({});
    console.log('🗑️  Đã xóa xong.\n');
  }

  const suppliersToInsert = REAL_PHARMA_SUPPLIERS.map((s, idx) => {
    const isExpired = s.gdpExpiry < new Date();
    return {
      name: s.name,
      contact_info: `Phòng kinh doanh | SĐT: ${s.phone} | Email: ${s.email}`,
      business_registration_number: s.brn,
      gdp_certificate_number: s.gdpNo,
      gdp_expiry_date: s.gdpExpiry,
      status: isExpired ? 'SUSPENDED' : s.status,
    };
  });

  console.log(`💾 Đang chèn ${suppliersToInsert.length} nhà cung cấp Dược phẩm thực tế...`);
  const result = await Supplier.insertMany(suppliersToInsert);
  console.log(`\n✅ Đã tạo thành công ${result.length} nhà cung cấp!\n`);

  const active = suppliersToInsert.filter(s => s.status === 'ACTIVE').length;
  const suspended = suppliersToInsert.filter(s => s.status === 'SUSPENDED').length;
  console.log('📊 Thống kê:');
  console.log(`   ✅ ACTIVE    : ${active}  (GDP còn hiệu lực)`);
  console.log(`   ⛔ SUSPENDED : ${suspended} (GDP đã hết hạn — dùng để test chặn đơn hàng)\n`);
  console.log('📋 Danh sách nhà cung cấp:');
  REAL_PHARMA_SUPPLIERS.forEach((s, i) => {
    const isExpired = s.gdpExpiry < new Date();
    const icon = isExpired ? '⛔' : '✅';
    console.log(`   ${icon} [${i + 1}] ${s.name}`);
  });

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB.');
}

main().catch((err) => {
  console.error('💥 Lỗi khi chạy script:', err.message);
  process.exit(1);
});
