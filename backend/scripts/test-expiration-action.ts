import * as http from 'http';

function post(url: string, data: any, token?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const parsedUrl = new URL(url);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname,
      method: 'POST',
      headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

function get(url: string, token?: string): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ statusCode: res.statusCode || 0, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode || 0, data: responseBody });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.end();
  });
}

async function run() {
  console.log('🧪 === BẮT ĐẦU CHẠY THỬ NGHIỆM ĐỀ XUẤT XỬ LÝ THUỐC HẾT HẠN (UC-33) ===\n');

  let adminToken = '';

  // 1. Đăng nhập với quyền Quản trị/Quản lý để lấy Token
  try {
    console.log('🔑 Đang đăng nhập tài khoản Admin (admin@vinapharmacy.com)...');
    const loginRes = await post('http://localhost:4000/api/auth/login', {
      email: 'admin@vinapharmacy.com',
      password: '123456'
    });
    if ((loginRes.statusCode === 200 || loginRes.statusCode === 201) && loginRes.data?.access_token) {
      adminToken = loginRes.data.access_token;
      console.log('✅ Đăng nhập Admin thành công!');
    } else {
      console.error('❌ Đăng nhập thất bại:', loginRes.statusCode, loginRes.data);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối khi đăng nhập:', err.message);
    console.log('💡 Lưu ý: Hãy đảm bảo backend/gateway đang chạy ở port 4000 trước khi chạy test.');
    process.exit(1);
  }

  // 2. Lấy danh sách báo cáo hết hạn
  let testBatch: any = null;
  try {
    console.log('\n📋 2. Lấy danh sách thuốc hết hạn hoặc sắp hết hạn...');
    const reportRes = await get('http://localhost:4000/api/medicines/expiration-report', adminToken);
    if (reportRes.statusCode === 200 && Array.isArray(reportRes.data)) {
      console.log(`✅ Lấy thành công báo cáo. Tìm thấy ${reportRes.data.length} lô thuốc cận hạn/hết hạn.`);
      if (reportRes.data.length > 0) {
        testBatch = reportRes.data[0];
        console.log(`👉 Chọn lô thuốc đầu tiên làm mẫu kiểm thử:`);
        console.log(`   - Tên thuốc: ${testBatch.medicineName}`);
        console.log(`   - Số Lô: ${testBatch.batchNo}`);
        console.log(`   - Hạn dùng: ${testBatch.expDate}`);
        console.log(`   - Tồn kho lô: ${testBatch.stock}`);
      } else {
        console.log('⚠️ Không tìm thấy lô thuốc cận hạn nào trong DB để chạy thử hành động.');
      }
    } else {
      console.error('❌ Lỗi khi lấy báo cáo hết hạn:', reportRes.statusCode, reportRes.data);
    }
  } catch (err) {
    console.error('❌ Lỗi khi tải báo cáo hết hạn:', err.message);
  }

  if (!testBatch) {
    console.log('\n⚠️ Không có dữ liệu mẫu. Dừng kịch bản kiểm thử.');
    return;
  }

  // 3. Test hành động: Khuyến mãi giảm giá
  try {
    console.log(`\n🏷️ 3. Thử nghiệm đề xuất: Khuyến mãi giảm giá cho thuốc ${testBatch.medicineName}`);
    const promoPrice = 35000;
    const actionRes = await post('http://localhost:4000/api/medicines/expiration-action', {
      batchId: testBatch.id,
      action: 'DISCOUNT',
      quantity: testBatch.stock,
      notes: 'Giảm giá xả hàng cận hạn sử dụng 30%',
      discountPrice: promoPrice
    }, adminToken);

    console.log(`-> Status Code: ${actionRes.statusCode}`);
    console.log(`-> Kết quả:`, actionRes.data);
    if (actionRes.statusCode === 200 || actionRes.statusCode === 201) {
      console.log('🎉 PASS: Áp dụng giá khuyến mãi cận hạn thành công.');
    } else {
      console.error('❌ FAIL: Không thể áp dụng khuyến mãi.');
    }
  } catch (err) {
    console.error('❌ Lỗi khi test hành động DISCOUNT:', err.message);
  }

  // 4. Test hành động: Xuất hủy
  try {
    console.log(`\n🗑️ 4. Thử nghiệm đề xuất: Xuất hủy 5 đơn vị của lô ${testBatch.batchNo}`);
    const actionRes = await post('http://localhost:4000/api/medicines/expiration-action', {
      batchId: testBatch.id,
      action: 'DISPOSE',
      quantity: 5,
      notes: 'Xuất hủy 5 hộp thuốc bị ẩm mốc/hết hạn'
    }, adminToken);

    console.log(`-> Status Code: ${actionRes.statusCode}`);
    console.log(`-> Kết quả:`, actionRes.data);
    if (actionRes.statusCode === 200 || actionRes.statusCode === 201) {
      console.log('🎉 PASS: Trừ kho và lập biên bản xuất hủy thành công.');
    } else {
      console.error('❌ FAIL: Không thể thực hiện xuất hủy.');
    }
  } catch (err) {
    console.error('❌ Lỗi khi test hành động DISPOSE:', err.message);
  }

  // 5. Test hành động: Gửi trả NCC
  try {
    console.log(`\n🚚 5. Thử nghiệm đề xuất: Gửi trả NCC 10 đơn vị của lô ${testBatch.batchNo}`);
    const actionRes = await post('http://localhost:4000/api/medicines/expiration-action', {
      batchId: testBatch.id,
      action: 'RETURN_SUPPLIER',
      quantity: 10,
      notes: 'Trả hàng cận hạn cho nhà cung cấp theo điều khoản hợp đồng'
    }, adminToken);

    console.log(`-> Status Code: ${actionRes.statusCode}`);
    console.log(`-> Kết quả:`, actionRes.data);
    if (actionRes.statusCode === 200 || actionRes.statusCode === 201) {
      console.log('🎉 PASS: Trừ kho và lập biên bản trả hàng NCC thành công.');
    } else {
      console.error('❌ FAIL: Không thể thực hiện trả hàng nhà cung cấp.');
    }
  } catch (err) {
    console.error('❌ Lỗi khi test hành động RETURN_SUPPLIER:', err.message);
  }

  console.log('\n🧪 === HOÀN TẤT KỊCH BẢN KIỂM THỬ UC-33 ===');
}

run();
