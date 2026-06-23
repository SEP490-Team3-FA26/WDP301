const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Lỗi: MONGODB_URI chưa được cấu hình trong biến môi trường hoặc file .env!');
    process.exit(1);
}

async function run() {
    const client = new MongoClient(MONGODB_URI);
    try {
        console.log('Đang kết nối Database...');
        await client.connect();
        console.log('Kết nối Database thành công!');

        const db = client.db('WDP201');
        const collection = db.collection('medicinebatches');

        // Tìm tất cả các lô thuốc chưa có branchId
        const query = {
            $or: [
                { branchId: { $exists: false } },
                { branchId: null }
            ]
        };

        const batches = await collection.find(query).toArray();
        console.log(`Tìm thấy ${batches.length} lô thuốc chưa có branchId. Bắt đầu cập nhật thành CENTRAL_WH...`);

        if (batches.length === 0) {
            console.log('Không có lô thuốc nào cần cập nhật.');
            return;
        }

        const result = await collection.updateMany(query, {
            $set: { branchId: 'CENTRAL_WH' }
        });

        console.log(`Hoàn tất! Đã cập nhật ${result.modifiedCount} lô thuốc thành CENTRAL_WH.`);

    } catch (error) {
        console.error('Có lỗi xảy ra:', error);
    } finally {
        await client.close();
    }
}

run();
