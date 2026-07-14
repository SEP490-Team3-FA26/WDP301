const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
global.performance = require('perf_hooks').performance;

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
    console.log("Connected to MongoDB Atlas!");
    const db = client.db(); // It will use the default db from URI (WDP201)
    const medicinesCol = db.collection("medicines");

    const query = {
      $or: [
        { name: /KefenTech/i },
        { name: /Tiger Balm/i },
        { name: /Poncityl/i }
      ]
    };

    const results = await medicinesCol.find(query).toArray();
    console.log(`Found ${results.length} medicines in database:`);
    results.forEach(med => {
      console.log({
        _id: med._id.toString(),
        name: med.name,
        category: med.category,
        price: med.price,
        stock: med.stock
      });
    });

  } catch (err) {
    console.error("Error: ", err);
  } finally {
    await client.close();
  }
}

main();
