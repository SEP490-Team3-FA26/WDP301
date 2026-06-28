import { connect, connection, Schema, model } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

// Define Schema for Voucher inside testing script
const VoucherSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, required: true, enum: ['PERCENTAGE', 'FIXED_AMOUNT'] },
  discountValue: { type: Number, required: true },
  minOrderValue: { type: Number, required: true, default: 0 },
  maxDiscountValue: { type: Number },
  startDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: null },
  usedCount: { type: Number, required: true, default: 0 },
  isActive: { type: Boolean, required: true, default: true }
}, { timestamps: true });

const VoucherModel = model('Voucher', VoucherSchema);

// Validation function mirroring OrdersServiceService.validateVoucher
async function validateVoucher(code: string, subtotal: number) {
  if (!code) {
    return { error: true, message: 'Chưa nhập mã giảm giá', statusCode: 400 };
  }
  const voucher = await VoucherModel.findOne({ code: code.toUpperCase().trim() }).exec();
  if (!voucher) {
    return { error: true, message: 'Mã giảm giá không tồn tại', statusCode: 404 };
  }
  if (!voucher.isActive) {
    return { error: true, message: 'Mã giảm giá đã bị vô hiệu hóa', statusCode: 400 };
  }

  const now = new Date();
  if (now < new Date(voucher.startDate)) {
    return { error: true, message: 'Chương trình khuyến mãi chưa bắt đầu', statusCode: 400 };
  }
  if (now > new Date(voucher.expiryDate)) {
    return { error: true, message: 'Mã giảm giá đã hết hạn sử dụng', statusCode: 400 };
  }

  if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
    return { error: true, message: 'Mã giảm giá đã hết lượt sử dụng', statusCode: 400 };
  }

  if (subtotal < voucher.minOrderValue) {
    return {
      error: true,
      message: `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${voucher.minOrderValue.toLocaleString('vi-VN')}₫ trở lên`,
      statusCode: 400
    };
  }

  let discount = 0;
  if (voucher.discountType === 'PERCENTAGE') {
    discount = Math.round(subtotal * (voucher.discountValue / 100));
    if (voucher.maxDiscountValue && discount > voucher.maxDiscountValue) {
      discount = voucher.maxDiscountValue;
    }
  } else if (voucher.discountType === 'FIXED_AMOUNT') {
    discount = voucher.discountValue;
    if (discount > subtotal) {
      discount = subtotal;
    }
  }

  return {
    success: true,
    code: voucher.code,
    discountType: voucher.discountType,
    discountValue: voucher.discountValue,
    discount,
  };
}

function mockCreateVoucher(data: any) {
  const start = new Date(data.startDate);
  const expiry = new Date(data.expiryDate);
  if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
    return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
  }
  if (expiry <= start) {
    return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
  }
  return { success: true };
}

function mockUpdateVoucher(existingVoucher: any, payload: any) {
  if (payload.startDate || payload.expiryDate) {
    const finalStart = payload.startDate ? new Date(payload.startDate) : new Date(existingVoucher.startDate);
    const finalExpiry = payload.expiryDate ? new Date(payload.expiryDate) : new Date(existingVoucher.expiryDate);
    if (isNaN(finalStart.getTime()) || isNaN(finalExpiry.getTime())) {
      return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
    }
    if (finalExpiry <= finalStart) {
      return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
    }
  }
  return { success: true };
}

async function runTests() {
  try {
    console.log('🔄 Connecting to MongoDB for Voucher Testing...');
    await connect(MONGODB_URI);
    console.log('✅ Connected!');

    // Clean existing test vouchers if any
    await VoucherModel.deleteMany({ code: { $in: ['SUMMER20', 'FIXED30', 'EXPIREDV', 'FUTUREV', 'LIMITV', 'INACTIVEV'] } });

    // Seed test vouchers
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    
    await VoucherModel.create([
      {
        code: 'SUMMER20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minOrderValue: 100000,
        maxDiscountValue: 50000,
        startDate: new Date(now.getTime() - oneDay),
        expiryDate: new Date(now.getTime() + oneDay),
        isActive: true
      },
      {
        code: 'FIXED30',
        discountType: 'FIXED_AMOUNT',
        discountValue: 30000,
        minOrderValue: 100000,
        startDate: new Date(now.getTime() - oneDay),
        expiryDate: new Date(now.getTime() + oneDay),
        isActive: true
      },
      {
        code: 'EXPIREDV',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 0,
        startDate: new Date(now.getTime() - 5 * oneDay),
        expiryDate: new Date(now.getTime() - oneDay),
        isActive: true
      },
      {
        code: 'FUTUREV',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 0,
        startDate: new Date(now.getTime() + oneDay),
        expiryDate: new Date(now.getTime() + 5 * oneDay),
        isActive: true
      },
      {
        code: 'LIMITV',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 0,
        startDate: new Date(now.getTime() - oneDay),
        expiryDate: new Date(now.getTime() + oneDay),
        usageLimit: 2,
        usedCount: 2,
        isActive: true
      },
      {
        code: 'INACTIVEV',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minOrderValue: 0,
        startDate: new Date(now.getTime() - oneDay),
        expiryDate: new Date(now.getTime() + oneDay),
        isActive: false
      }
    ]);
    console.log('✅ Seeded Vouchers!');

    const results = [];

    // Test Case 4: Apply Voucher FIXED30 for subtotal 150,000đ. Expected: discount = 30,000đ
    const res4 = await validateVoucher('FIXED30', 150000);
    const pass4 = res4.success && res4.discount === 30000;
    results.push({ case: 'Case 4: FIXED_AMOUNT 30K on 150K subtotal', result: pass4 ? 'PASS' : 'FAIL', details: JSON.stringify(res4) });

    // Test Case 5: Apply SUMMER20 on 300,000đ subtotal. Expected: discount = 50,000đ (capped from 60,000đ)
    const res5 = await validateVoucher('SUMMER20', 300000);
    const pass5 = res5.success && res5.discount === 50000;
    results.push({ case: 'Case 5: PERCENTAGE 20% max 50K on 300K subtotal (Capping)', result: pass5 ? 'PASS' : 'FAIL', details: JSON.stringify(res5) });

    // Test Case 6: Apply SUMMER20 on 80,000đ subtotal. Expected: error (min order value 100,000đ)
    const res6 = await validateVoucher('SUMMER20', 80000);
    const pass6 = res6.error && res6.message.includes('trở lên');
    results.push({ case: 'Case 6: minOrderValue restriction check (80K < 100K)', result: pass6 ? 'PASS' : 'FAIL', details: JSON.stringify(res6) });

    // Test Case 7: Apply LIMITV. Expected: error (usageLimit reached)
    const res7 = await validateVoucher('LIMITV', 150000);
    const pass7 = res7.error && res7.message.includes('lượt sử dụng');
    results.push({ case: 'Case 7: usageLimit restriction check', result: pass7 ? 'PASS' : 'FAIL', details: JSON.stringify(res7) });

    // Test Case 8: Apply EXPIREDV. Expected: error (expired)
    const res8 = await validateVoucher('EXPIREDV', 150000);
    const pass8 = res8.error && res8.message.includes('hết hạn');
    results.push({ case: 'Case 8: expiryDate check', result: pass8 ? 'PASS' : 'FAIL', details: JSON.stringify(res8) });

    // Test Case Extra 1: Future Voucher
    const resEx1 = await validateVoucher('FUTUREV', 150000);
    const passEx1 = resEx1.error && resEx1.message.includes('chưa bắt đầu');
    results.push({ case: 'Extra Case 1: Future startDate check', result: passEx1 ? 'PASS' : 'FAIL', details: JSON.stringify(resEx1) });

    // Test Case Extra 2: Inactive Voucher
    const resEx2 = await validateVoucher('INACTIVEV', 150000);
    const passEx2 = resEx2.error && resEx2.message.includes('vô hiệu hóa');
    results.push({ case: 'Extra Case 2: isActive false check', result: passEx2 ? 'PASS' : 'FAIL', details: JSON.stringify(resEx2) });

    // Test Case Date Conflict 1: Create voucher with expiryDate < startDate. Expected: error
    const resConflict1 = mockCreateVoucher({ startDate: '2026-06-24', expiryDate: '2026-06-20' });
    const passConflict1 = resConflict1.error && resConflict1.message.includes('lớn hơn');
    results.push({ case: 'Date Conflict 1: Create expiryDate < startDate', result: passConflict1 ? 'PASS' : 'FAIL', details: JSON.stringify(resConflict1) });

    // Test Case Date Conflict 2: Create voucher with expiryDate = startDate. Expected: error
    const resConflict2 = mockCreateVoucher({ startDate: '2026-06-24', expiryDate: '2026-06-24' });
    const passConflict2 = resConflict2.error && resConflict2.message.includes('lớn hơn');
    results.push({ case: 'Date Conflict 2: Create expiryDate == startDate', result: passConflict2 ? 'PASS' : 'FAIL', details: JSON.stringify(resConflict2) });

    // Test Case Date Conflict 3: Create voucher with valid dates. Expected: success
    const resConflict3 = mockCreateVoucher({ startDate: '2026-06-24', expiryDate: '2026-06-25' });
    const passConflict3 = resConflict3.success === true;
    results.push({ case: 'Date Conflict 3: Create valid dates', result: passConflict3 ? 'PASS' : 'FAIL', details: JSON.stringify(resConflict3) });

    // Test Case Date Conflict 4: Update voucher with invalid expiryDate. Expected: error
    const resConflict4 = mockUpdateVoucher({ startDate: '2026-06-24', expiryDate: '2026-06-25' }, { expiryDate: '2026-06-23' });
    const passConflict4 = resConflict4.error && resConflict4.message.includes('lớn hơn');
    results.push({ case: 'Date Conflict 4: Update invalid expiryDate', result: passConflict4 ? 'PASS' : 'FAIL', details: JSON.stringify(resConflict4) });

    // Test Case Date Conflict 5: Update voucher with invalid startDate. Expected: error
    const resConflict5 = mockUpdateVoucher({ startDate: '2026-06-24', expiryDate: '2026-06-25' }, { startDate: '2026-06-26' });
    const passConflict5 = resConflict5.error && resConflict5.message.includes('lớn hơn');
    results.push({ case: 'Date Conflict 5: Update invalid startDate', result: passConflict5 ? 'PASS' : 'FAIL', details: JSON.stringify(resConflict5) });

    console.log('\n--- VOUCHER LOGIC TEST CASES RESULTS ---');
    console.table(results);
    
    // Clean up seeded test vouchers
    await VoucherModel.deleteMany({ code: { $in: ['SUMMER20', 'FIXED30', 'EXPIREDV', 'FUTUREV', 'LIMITV', 'INACTIVEV'] } });

  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await connection.close();
    console.log('Disconnected!');
  }
}

runTests();
