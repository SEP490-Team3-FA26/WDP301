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
    const result = await col.findOne(query);
    
    if (result) {
        console.log("PR Found:");
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log("PR Not Found");
    }

  } catch (err) {
    console.error("Error: ", err);
  } finally {
    await client.close();
  }
}

main();
