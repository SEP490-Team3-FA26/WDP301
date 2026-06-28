const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Lỗi: MONGODB_URI chưa được cấu hình trong biến môi trường hoặc file .env!');
    process.exit(1);
}

// Hàm tính checksum cho EAN-13
function calculateEAN13Checksum(code12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(code12[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
}

// Hàm sinh mã Barcode (chuẩn EAN-13, 893 là mã Việt Nam)
function generateBarcode() {
    const prefix = '893'; // Mã quốc gia VN
    // Random 9 số tiếp theo
    const random9 = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    const code12 = prefix + random9;
    const checksum = calculateEAN13Checksum(code12);
    return code12 + checksum;
}

async function run() {
    const client = new MongoClient(MONGODB_URI);
    try {
        console.log('Đang kết nối Database...');
        await client.connect();
        console.log('Kết nối Database thành công!');

        const db = client.db('WDP201');
        const collection = db.collection('medicines');

        // Tìm tất cả các thuốc chưa có barcode
        const medicines = await collection.find({ 
            $or: [
                { barcode: { $exists: false } },
                { barcode: null },
                { barcode: "" }
            ] 
        }).toArray();

        console.log(`Tìm thấy ${medicines.length} thuốc chưa có barcode/sku. Bắt đầu tạo...`);

        if (medicines.length === 0) {
            console.log('Không có thuốc nào cần cập nhật.');
            return;
        }

        let count = 0;
        let bulkOp = collection.initializeUnorderedBulkOp();

        for (const med of medicines) {
            // Generate SKU: Lấy tiền tố MED + 6 ký tự cuối của _id
            const sku = `MED-${med._id.toString().slice(-6).toUpperCase()}`;
            const barcode = generateBarcode();

            bulkOp.find({ _id: med._id }).updateOne({
                $set: {
                    sku: sku,
                    barcode: barcode
                }
            });

            count++;
            
            // Execute batch mỗi 500 records
            if (count % 500 === 0) {
                await bulkOp.execute();
                console.log(`Đã cập nhật ${count} records...`);
                bulkOp = collection.initializeUnorderedBulkOp();
            }
        }

        // Execute phần còn lại
        if (count % 500 !== 0 && count > 0) {
            await bulkOp.execute();
            console.log(`Đã cập nhật ${count} records...`);
        }

        console.log(`Hoàn tất! Đã tạo SKU và Barcode cho ${count} loại thuốc.`);

    } catch (error) {
        console.error('Có lỗi xảy ra:', error);
    } finally {
        await client.close();
    }
}

run();
