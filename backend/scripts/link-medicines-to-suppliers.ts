/**
 * ================================================================
 * 📦 SCRIPT: link-medicines-to-suppliers.ts
 * Mục đích: Gán trường `supplierId` cho từng sản phẩm thuốc dựa trên category.
 *
 * Cách chạy:
 *   npx ts-node -r tsconfig-paths/register scripts/link-medicines-to-suppliers.ts
 *   npx ts-node -r tsconfig-paths/register scripts/link-medicines-to-suppliers.ts --force
 * ================================================================
 */

import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;
if (!MONGODB_URI) { console.error('❌ Không tìm thấy MONGODB_URI'); process.exit(1); }

const CATEGORY_TO_SUPPLIER_MAP: Record<string, string> = {
  // ── DHG Pharma ─────────────────────────────────────────────
  'Siro trị ho cảm':              'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Siro kháng sinh':              'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Siro bổ':                      'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Siro tiêu hoá':                'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Siro trị sổ mũi':              'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Thuốc trị ho cảm':             'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Viên ngậm trị ho, viêm họng':  'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Thuốc trị hen suyễn':          'Công ty Dược phẩm Hậu Giang (DHG Pharma)',
  'Thuốc xịt hen suyễn':          'Công ty Dược phẩm Hậu Giang (DHG Pharma)',

  // ── Pharbaco ──────────────────────────────────────────────
  'Dung dịch tiêm':               'Công ty Dược phẩm Trung ương 1 (Pharbaco)',
  'Dung dịch truyền':             'Công ty Dược phẩm Trung ương 1 (Pharbaco)',
  'Dung dịch vệ sinh phụ nữ':     'Công ty Dược phẩm Trung ương 1 (Pharbaco)',
  'Dung dịch súc miệng':          'Công ty Dược phẩm Trung ương 1 (Pharbaco)',

  // ── Traphaco ──────────────────────────────────────────────
  'Thuốc bổ':                     'Công ty Cổ phần Traphaco',
  'Bổ xương khớp':                'Công ty Cổ phần Traphaco',
  'Đông dược':                    'Công ty Cổ phần Traphaco',
  'Thuốc tăng cường sức đề kháng':'Công ty Cổ phần Traphaco',
  'Thuốc gan mật':                'Công ty Cổ phần Traphaco',
  'Thuốc trị bệnh gan':           'Công ty Cổ phần Traphaco',
  'Thuốc trị gout':               'Công ty Cổ phần Traphaco',
  'Thuốc trị thoái hoá khớp':     'Công ty Cổ phần Traphaco',
  'Thuốc xương khớp':             'Công ty Cổ phần Traphaco',
  'Thuốc giãn cơ':                'Công ty Cổ phần Traphaco',

  // ── OPC ───────────────────────────────────────────────────
  'Thực phẩm chức năng':          'Công ty CP Dược phẩm OPC',
  'Dinh dưỡng':                   'Công ty CP Dược phẩm OPC',
  'Thực phẩm bổ sung':            'Công ty CP Dược phẩm OPC',

  // ── Agimexpharm ───────────────────────────────────────────
  'Kháng sinh':                   'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc kháng sinh':             'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc an thần':                'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc chống trầm cảm':         'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc thần kinh':              'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc kháng nấm':              'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc kháng lao':              'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc kháng virus':            'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc trị sốt rét':            'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc trị giun sán':           'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc kháng viêm':             'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc giảm đau kháng viêm':    'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc dị ứng':                 'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc say tàu xe':             'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc dạ dày':                 'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc trị tiêu chảy':          'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc tiêu hoá':               'Công ty TNHH Dược phẩm Agimexpharm',
  'Thuốc trị táo bón':            'Công ty TNHH Dược phẩm Agimexpharm',

  // ── Pymepharco ────────────────────────────────────────────
  'Vitamins & Khoáng chất':       'Công ty CP Pymepharco',
  'Vitamin C':                    'Công ty CP Pymepharco',
  'Thuốc bù điện giải':           'Công ty CP Pymepharco',

  // ── Imexpharm ─────────────────────────────────────────────
  'Thuốc tim mạch':               'Công ty CP Dược phẩm Imexpharm',
  'Thuốc huyết áp':               'Công ty CP Dược phẩm Imexpharm',
  'Thuốc tiểu đường':             'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị tiểu đường':         'Công ty CP Dược phẩm Imexpharm',
  'Thuốc tim mạch huyết áp':      'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị mỡ máu':             'Công ty CP Dược phẩm Imexpharm',
  'Thuốc lợi tiểu':               'Công ty CP Dược phẩm Imexpharm',
  'Thuốc tăng cường tuần hoàn não':'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị trĩ, suy giãn tĩnh mạch': 'Công ty CP Dược phẩm Imexpharm',
  'Thuốc cầm máu':                'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị thiếu máu':          'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị bệnh thận':          'Công ty CP Dược phẩm Imexpharm',
  'Thuốc nội tiết tố':            'Công ty CP Dược phẩm Imexpharm',
  'Thuốc điều hoà kinh nguyệt':   'Công ty CP Dược phẩm Imexpharm',
  'Thuốc tránh thai':             'Công ty CP Dược phẩm Imexpharm',
  'Thuốc đặt âm đạo':             'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị rối loạn cương dương':'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị bệnh tuyến tiền liệt':'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị cường giáp':         'Công ty CP Dược phẩm Imexpharm',
  'Thuốc trị bệnh tuyến giáp':    'Công ty CP Dược phẩm Imexpharm',

  // ── Bidiphar ──────────────────────────────────────────────
  'Thuốc chống ung thư':          'Công ty Dược phẩm Bidiphar',
  'Thuốc điều trị ung thư':       'Công ty Dược phẩm Bidiphar',
  'Thuốc chống đông máu':         'Công ty Dược phẩm Bidiphar',
  'Sinh phẩm':                    'Công ty Dược phẩm Bidiphar',
  'Thuốc tiêm chích':             'Công ty Dược phẩm Bidiphar',
  'Thuốc giải độc, khử độc và hỗ trợ cai nghiện': 'Công ty Dược phẩm Bidiphar',

  // ── Sanofi ────────────────────────────────────────────────
  'Vaccine':                      'Công ty TNHH Sanofi-Aventis Việt Nam',

  // ── Abbott ────────────────────────────────────────────────
  'Dinh dưỡng y tế':              'Công ty TNHH Abbott Laboratories Việt Nam',

  // ── Pfizer ────────────────────────────────────────────────
  'Thuốc giảm đau hạ sốt':        'Công ty TNHH Pfizer Việt Nam',
  'Thuốc giảm đau':               'Công ty TNHH Pfizer Việt Nam',
  'Thuốc trị đau nửa đầu':        'Công ty TNHH Pfizer Việt Nam',

  // ── Roche ─────────────────────────────────────────────────
  'Thuốc nhỏ mắt':                'Công ty TNHH Roche Việt Nam',
  'Thuốc tra mắt':                'Công ty TNHH Roche Việt Nam',
  'Thuốc trị tăng nhãn áp':       'Công ty TNHH Roche Việt Nam',
  'Thuốc nhỏ tai':                'Công ty TNHH Roche Việt Nam',
  'Thuốc xịt mũi':                'Công ty TNHH Roche Việt Nam',
  'Thuốc trị viêm xoang':         'Công ty TNHH Roche Việt Nam',
  'Ống hít mũi':                  'Công ty TNHH Roche Việt Nam',
  'Thuốc tai mũi họng':           'Công ty TNHH Roche Việt Nam',

  // ── Mekophar ──────────────────────────────────────────────
  'Cao xoa':                      'Công ty CP Dược phẩm Mekophar',
  'Dầu gió':                      'Công ty CP Dược phẩm Mekophar',
  'Dầu nóng xoa bóp':             'Công ty CP Dược phẩm Mekophar',
  'Dầu nóng, xoa bóp':            'Công ty CP Dược phẩm Mekophar',
  'Dầu gội trị gàu':              'Công ty CP Dược phẩm Mekophar',
  'Thuốc bôi ngoài da':           'Công ty CP Dược phẩm Mekophar',
  'Thuốc bôi răng miệng':         'Công ty CP Dược phẩm Mekophar',
  'Thuốc bôi sẹo - liền sẹo':     'Công ty CP Dược phẩm Mekophar',
  'Miếng dán giảm đau':           'Công ty CP Dược phẩm Mekophar',
  'Miếng dán say tàu xe':         'Công ty CP Dược phẩm Mekophar',
  'Thuốc tê bôi':                 'Công ty CP Dược phẩm Mekophar',
  'Thuốc sát khuẩn':              'Công ty CP Dược phẩm Mekophar',
  'Thuốc trị mụn':                'Công ty CP Dược phẩm Mekophar',
};

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('🔗 Đang kết nối MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI!);
  console.log('✅ Kết nối thành công!\n');

  const db = mongoose.connection.db!;
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  const suppliers = await db.collection('suppliers').find({}).toArray();
  if (suppliers.length === 0) {
    console.error('❌ Chưa có nhà cung cấp. Hãy chạy seed-suppliers.ts trước.');
    await mongoose.disconnect(); return;
  }
  console.log(`👥 Tìm thấy ${suppliers.length} nhà cung cấp.`);

  const supplierByName = new Map<string, string>();
  const activeSupplierIds: string[] = [];
  for (const s of suppliers) {
    supplierByName.set(s.name, s._id.toString());
    if (s.status === 'ACTIVE') activeSupplierIds.push(s._id.toString());
  }

  const medicinesCol = db.collection('medicines');
  const alreadyLinked = await medicinesCol.countDocuments({ supplierId: { $exists: true, $ne: null } });
  if (alreadyLinked > 0 && !force) {
    console.log(`ℹ️  Đã có ${alreadyLinked} sản phẩm có supplierId.`);
    console.log('💡 Chạy với flag "--force" để cập nhật lại.\n');
    await mongoose.disconnect(); return;
  }

  const medicines = await medicinesCol.find({}).toArray();
  console.log(`💊 Tìm thấy ${medicines.length} sản phẩm thuốc.\n`);

  let matched = 0, fallback = 0;
  const unknownCategories = new Set<string>();
  const bulkOps: any[] = [];

  for (const med of medicines) {
    const category: string = med.category || '';
    let supplierId: string | null = null;

    const supplierName = CATEGORY_TO_SUPPLIER_MAP[category];
    if (supplierName) {
      const found = supplierByName.get(supplierName);
      if (found) { supplierId = found; matched++; }
    }

    if (!supplierId) {
      supplierId = activeSupplierIds[Math.floor(Math.random() * activeSupplierIds.length)];
      unknownCategories.add(category || '(trống)');
      fallback++;
    }

    bulkOps.push({ updateOne: { filter: { _id: med._id }, update: { $set: { supplierId } } } });
  }

  if (bulkOps.length > 0) {
    console.log(`📝 Cập nhật ${bulkOps.length} sản phẩm...`);
    const batchSize = 500;
    for (let i = 0; i < bulkOps.length; i += batchSize) {
      await medicinesCol.bulkWrite(bulkOps.slice(i, i + batchSize));
      console.log(`   → Batch ${Math.floor(i / batchSize) + 1}: ${Math.min(batchSize, bulkOps.length - i)} sản phẩm`);
    }
  }

  console.log('\n✅ Hoàn tất!\n');
  console.log('📊 Thống kê:');
  console.log(`   🎯 Khớp theo map   : ${matched}`);
  console.log(`   🎲 Fallback ngẫu nhiên: ${fallback}`);
  if (unknownCategories.size > 0) {
    console.log(`\n⚠️  ${unknownCategories.size} danh mục chưa có trong map:`);
    for (const cat of unknownCategories) console.log(`      - "${cat}"`);
  }

  await mongoose.disconnect();
  console.log('\n🔌 Đã ngắt kết nối MongoDB.');
}

main().catch((err) => { console.error('💥 Lỗi:', err.message); process.exit(1); });
