const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in .env");
    return;
  }
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const col = db.collection("purchaserequisitions");

    const query = { prCode: "PR-20260707-0002" };
    const update = {
      $set: {
        status: "URGENT_PENDING",
        isUrgent: true
      }
    };
    
    const result = await col.updateOne(query, update);
    
    if (result.modifiedCount > 0) {
        console.log("✅ Đã fix thành công! PR-20260707-0002 đã được chuyển thành HỎA TỐC (URGENT_PENDING).");
        console.log("👉 Bây giờ bạn hãy reload lại trang http://localhost:3000/admin/approvals, nó sẽ nằm ở tab '🔥 Yêu cầu Hỏa tốc'.");
    } else {
        console.log("⚠️ Không tìm thấy PR-20260707-0002 hoặc nó đã là Hỏa tốc rồi.");
    }

  } catch (err) {
    console.error("Error: ", err);
  } finally {
    await client.close();
  }
}

main();
