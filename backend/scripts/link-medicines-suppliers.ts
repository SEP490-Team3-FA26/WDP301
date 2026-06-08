import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || process.env.MONGODB_CONNECTION_STRING;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env file');
  process.exit(1);
}

async function run() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected successfully!');

  const db = mongoose.connection.db;
  const medicinesCollection = db.collection('medicines');
  const suppliersCollection = db.collection('suppliers');

  // 1. Fetch all suppliers
  console.log('🔍 Fetching all suppliers...');
  const suppliers = await suppliersCollection.find({}).toArray();
  console.log(`📋 Found ${suppliers.length} suppliers in database.`);

  if (suppliers.length === 0) {
    console.warn('⚠️ No suppliers found. Please run the backend first to seed suppliers, or add them manually.');
    await mongoose.disconnect();
    return;
  }

  // Create a name-to-ID map for fast lookup
  const supplierMap = new Map<string, string>();
  for (const supplier of suppliers) {
    supplierMap.set(supplier.name.toLowerCase().trim(), supplier._id.toString());
  }

  // 2. Fetch all medicines
  console.log('🔍 Fetching medicines...');
  const medicines = await medicinesCollection.find({}).toArray();
  console.log(`💊 Found ${medicines.length} medicines in database.`);

  let updatedCount = 0;
  let skippedCount = 0;

  // 3. Update medicines with supplierId
  for (const medicine of medicines) {
    // Determine the manufacturer name from category or thong_tin_chi_tiet
    const categoryName = medicine.category || medicine.thong_tin_chi_tiet?.['Danh mục'] || '';
    const cleanCategory = categoryName.toLowerCase().trim();

    if (!cleanCategory) {
      skippedCount++;
      continue;
    }

    // Try to find matching supplier ID
    let supplierId = supplierMap.get(cleanCategory);

    // Fallback: If not found, check if any supplier name starts with or is contained within the category name
    if (!supplierId) {
      for (const [supName, supId] of supplierMap.entries()) {
        if (cleanCategory.includes(supName) || supName.includes(cleanCategory)) {
          supplierId = supId;
          break;
        }
      }
    }

    if (supplierId) {
      await medicinesCollection.updateOne(
        { _id: medicine._id },
        { $set: { supplierId: supplierId } }
      );
      updatedCount++;
    } else {
      skippedCount++;
    }
  }

  console.log(`\n🎉 Process completed:`);
  console.log(`   ✅ Linked ${updatedCount} medicines to their suppliers.`);
  console.log(`   ⚠️ Skipped/Not matched: ${skippedCount} medicines.`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

run().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
