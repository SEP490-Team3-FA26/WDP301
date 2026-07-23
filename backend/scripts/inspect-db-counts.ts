import { connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

async function run() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await connect(MONGODB_URI);
    console.log('✅ Connected!');

    const db = connection.db;
    const branchId = 'BR-001';
    const monthsCount = 12;

    // Simulate getSeasonalDataset
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);

    const salesQuery: any = {
      createdAt: { $gte: startDate }
    };
    if (branchId && branchId !== 'all') {
      salesQuery.branchId = branchId;
    }

    console.log('salesQuery:', salesQuery);

    const t0 = Date.now();
    const salesByMonth = await db.collection('salesorders').aggregate([
      { $match: salesQuery },
      { $unwind: "$items" },
      { $unwind: { path: "$items.batches", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          medicineId: "$items.medicineId",
          medicineName: "$items.name",
          quantity: { $ifNull: ["$items.batches.quantity", "$items.quantity"] },
          price: "$items.price",
          batchNo: "$items.batches.batchNo",
          month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
        }
      }
    ]).toArray();
    console.log(`Sales aggregate took ${Date.now() - t0}ms, returned ${salesByMonth.length} items`);

    const batchNos = [...new Set(salesByMonth.map(s => s.batchNo).filter(Boolean))];
    console.log(`Found ${batchNos.length} batchNos`);

    const t1 = Date.now();
    const grns = await db.collection('goodsreceiptnotes').find({
      "items.batchNo": { $in: batchNos }
    }).toArray();
    console.log(`GRN query took ${Date.now() - t1}ms, returned ${grns.length} items`);

    const batchPriceMap = new Map<string, number>();
    grns.forEach((grn: any) => {
      grn.items.forEach((item: any) => {
        if (item.batchNo && item.unitPrice !== undefined) {
          batchPriceMap.set(item.batchNo, item.unitPrice);
        }
      });
    });

    const medicineSales = new Map<string, Record<string, { quantity: number; revenue: number; profit: number }>>();
    salesByMonth.forEach(sale => {
      const medId = String(sale.medicineId);
      const month = sale.month;
      const qty = sale.quantity || 0;
      const price = sale.price || 0;
      const revenue = qty * price;
      
      const importPrice = sale.batchNo && batchPriceMap.has(sale.batchNo)
        ? batchPriceMap.get(sale.batchNo)
        : 0.7 * price;
      
      const cogs = qty * importPrice;
      const profit = revenue - cogs;
      
      if (!medicineSales.has(medId)) {
        medicineSales.set(medId, {});
      }
      
      const monthsMap = medicineSales.get(medId)!;
      if (!monthsMap[month]) {
        monthsMap[month] = { quantity: 0, revenue: 0, profit: 0 };
      }
      
      monthsMap[month].quantity += qty;
      monthsMap[month].revenue += revenue;
      monthsMap[month].profit += profit;
    });

    const poQuery: any = {
      status: { $in: ['PENDING_APPROVAL', 'SHIPPING', 'RECEIVING', 'PARTIAL_RECEIVED'] }
    };
    const t2 = Date.now();
    const activePos = await db.collection('purchaseorders').find(poQuery).toArray();
    console.log(`PO query took ${Date.now() - t2}ms, returned ${activePos.length} items`);

    const incomingMap = new Map<string, number>();
    activePos.forEach(po => {
      po.items.forEach((item: any) => {
        const pendingQty = Math.max(0, item.quantity - (item.receivedQuantity || 0));
        if (pendingQty > 0) {
          incomingMap.set(item.medicineId, (incomingMap.get(item.medicineId) || 0) + pendingQty);
        }
      });
    });

    const batchQuery: any = { status: 'ACTIVE' };
    if (branchId && branchId !== 'all') {
      batchQuery.branchId = branchId;
    }
    const t3 = Date.now();
    const activeBatches = await db.collection('medicinebatches').find(batchQuery).toArray();
    console.log(`Batch query took ${Date.now() - t3}ms, returned ${activeBatches.length} items`);

    const stockMap = new Map<string, number>();
    activeBatches.forEach(batch => {
      stockMap.set(batch.medicineId, (stockMap.get(batch.medicineId) || 0) + batch.stock);
    });

    const t4 = Date.now();
    const suppliers = await db.collection('suppliers').find({}).toArray();
    const supplierMap = new Map<string, any>(suppliers.map(s => [s._id.toString(), s]));
    console.log(`Supplier query took ${Date.now() - t4}ms, returned ${suppliers.length} items`);

    const medicines = await db.collection('medicines').find({ status: { $ne: 'INACTIVE' } }).toArray();
    console.log(`Medicines query returned ${medicines.length} items`);

    const t5 = Date.now();
    const dataset = medicines.map(med => {
      const medId = med._id.toString();
      const currentStock = stockMap.get(medId) || 0;
      const expectedIncoming = incomingMap.get(medId) || 0;
      const salesHistory = medicineSales.get(medId) || {};
      
      const supplier = med.supplierId ? supplierMap.get(med.supplierId.toString()) : null;
      const leadTime = supplier && supplier.leadTime !== undefined ? supplier.leadTime : 3;
      const moq = supplier && supplier.moq !== undefined ? supplier.moq : 20;
      
      return {
        medicineId: medId,
        name: med.name,
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Hộp',
        price: med.price || 0,
        currentStock,
        expectedIncoming,
        safetyStock: med.safetyStock !== undefined ? med.safetyStock : 50,
        reorderPoint: med.reorderPoint !== undefined ? med.reorderPoint : 100,
        leadTime,
        moq,
        supplierName: supplier ? supplier.name : 'Nhà cung cấp vãng lai',
        salesHistory
      };
    });

    const filteredDataset = dataset.filter(item => {
      const hasSales = Object.values(item.salesHistory).some((v: any) => {
        const qty = typeof v === 'object' && v !== null ? v.quantity : Number(v || 0);
        return qty > 0;
      });
      return item.currentStock > 0 || hasSales || item.expectedIncoming > 0;
    });

    console.log(`Dataset generated successfully! Total items: ${dataset.length}, Filtered items: ${filteredDataset.length}`);
    console.log(`Total time taken: ${Date.now() - t0}ms`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await connection.close();
    console.log('Disconnected!');
  }
}

run();
