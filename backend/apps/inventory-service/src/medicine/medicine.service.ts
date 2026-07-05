import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine } from './schemas/medicine.schema';
import { MedicineBatch } from './schemas/medicine-batch.schema';
import { InventoryCheck } from './schemas/inventory-check.schema';
import { InventoryTransaction } from '../purchase/schemas/inventory-transaction.schema';

@Injectable()
export class MedicineService implements OnModuleInit {
  private readonly logger = new Logger(MedicineService.name);

  constructor(
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
    @InjectModel(InventoryCheck.name) private readonly checkModel: Model<InventoryCheck>,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
  ) { }

  onModuleInit() {
    this.syncMedicineStocksInBackground().catch((error) => {
      this.logger.error('Failed to synchronize stock in background:', error);
    });
  }

  private async syncMedicineStocksInBackground() {
    this.logger.log('Starting background stock synchronization for all medicines...');
    const startTime = Date.now();
    try {
      // 1. Fetch all medicines with only _id and stock
      const medicines = await this.medicineModel.find({}, { _id: 1, stock: 1 }).lean().exec();

      // 2. Fetch all active batches with stock > 0
      const activeBatches = await this.batchModel.find(
        { status: 'ACTIVE', stock: { $gt: 0 } },
        { medicineId: 1, stock: 1 }
      ).lean().exec();

      // 3. Aggregate active batch stocks in memory by medicineId
      const batchStockMap = new Map<string, number>();
      for (const batch of activeBatches) {
        if (batch.medicineId) {
          const medId = batch.medicineId.toString();
          batchStockMap.set(medId, (batchStockMap.get(medId) || 0) + batch.stock);
        }
      }

      // 4. Compare cached stock and build bulkWrite ops for mismatches
      const bulkOps = [];
      for (const med of medicines) {
        const medId = med._id.toString();
        const actualStock = batchStockMap.get(medId) || 0;
        const currentStock = med.stock || 0;

        if (currentStock !== actualStock) {
          bulkOps.push({
            updateOne: {
              filter: { _id: med._id },
              update: { $set: { stock: actualStock } }
            }
          });
        }
      }

      // 5. Execute bulkWrite if there are mismatched stocks
      if (bulkOps.length > 0) {
        this.logger.log(`Found ${bulkOps.length} medicines with mismatched stock. Syncing...`);
        await this.medicineModel.bulkWrite(bulkOps);
        this.logger.log(`Bulk stock synchronization completed successfully in ${Date.now() - startTime}ms.`);
      } else {
        this.logger.log(`All medicine stocks are already synchronized. Completed in ${Date.now() - startTime}ms.`);
      }
    } catch (error) {
      this.logger.error('Failed to run background stock synchronization:', error);
    }
  }

  async getMedicineFilters() {
    try {
      console.log('📨 [Inventory MS] Nhận yêu cầu lấy bộ lọc thuốc');
      const categories = await this.medicineModel.distinct('category').exec();
      const classifications = await this.medicineModel.distinct('drug_classification').exec();
      return {
        categories: categories.filter(c => c),
        classifications: classifications.filter(c => c)
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy bộ lọc thuốc');
    }
  }

  async getMedicineById(id: string) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new RpcException('Medicine not found');
      }

      // Lấy danh sách lô hàng khả dụng
      const batches = await this.batchModel.find({ medicineId: id, status: 'ACTIVE', stock: { $gt: 0 } }).exec();
      const totalStock = batches.reduce((sum, b) => sum + b.stock, 0);

      // Tìm hạn dùng gần nhất
      let earliestExpiryStr = '2026-12-31';
      if (batches.length > 0) {
        const earliestBatch = batches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, batches[0]);
        earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
      }

      const medObj = medicine.toObject();
      return {
        ...medObj,
        id: medObj._id.toString(),
        stock: totalStock,
        expiry: earliestExpiryStr,
        status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
        minStock: 50
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy chi tiết thuốc');
    }
  }

  async updateMedicineStatus(id: string, status: string, stock?: number) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new RpcException('Medicine not found');
      }

      // Cập nhật tồn kho ở lô INIT-BATCH nếu có tham số stock
      if (stock !== undefined) {
        let initBatch = await this.batchModel.findOne({ medicineId: id, batchNo: 'INIT-BATCH' }).exec();
        if (initBatch) {
          initBatch.stock = stock;
          initBatch.status = initBatch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
          await initBatch.save();
        } else {
          initBatch = new this.batchModel({
            medicineId: id,
            batchNo: 'INIT-BATCH',
            expDate: new Date('2026-12-31'),
            stock: stock,
            status: 'ACTIVE'
          });
          await initBatch.save();
        }
      }

      // Lấy tồn kho cập nhật mới
      const batches = await this.batchModel.find({ medicineId: id, status: 'ACTIVE', stock: { $gt: 0 } }).exec();
      const totalStock = batches.reduce((sum, b) => sum + b.stock, 0);

      // Cập nhật status và stock cho medicine
      const updatedMedicine = await this.medicineModel.findByIdAndUpdate(
        id,
        { $set: { status, stock: totalStock } },
        { new: true }
      ).exec();

      let earliestExpiryStr = '2026-12-31';
      if (batches.length > 0) {
        const earliestBatch = batches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, batches[0]);
        earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
      }

      const medObj = updatedMedicine.toObject();
      return {
        ...medObj,
        id: medObj._id.toString(),
        stock: totalStock,
        expiry: earliestExpiryStr,
        status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
        minStock: 50
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi cập nhật trạng thái thuốc');
    }
  }

  async updateMedicinePriceTiers(id: string, priceTiers: { minQuantity: number; price: number }[]) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new RpcException('Medicine not found');
      }

      // Sắp xếp priceTiers tăng dần theo số lượng tối thiểu để lưu
      const sortedTiers = (priceTiers || []).sort((a, b) => a.minQuantity - b.minQuantity);

      medicine.priceTiers = sortedTiers;
      await medicine.save();

      return {
        success: true,
        message: 'Cập nhật giá bậc thang thành công',
        priceTiers: medicine.priceTiers,
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi cập nhật giá bậc thang');
    }
  }


  async listMedicines(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    classification?: string;
    targetGroup?: string;
    minPrice?: number;
    maxPrice?: number;
    flavour?: string;
    country?: string;
    brand?: string;
    indication?: string;
    brandOrigin?: string;
    branchId?: string;
  }) {
    try {
      console.log('📨 [Inventory MS] Nhận yêu cầu lấy danh sách thuốc:', query);
      const page = query.page || 1;
      const limit = query.limit || 10;
      const search = query.search || '';
      const category = query.category || '';
      const classification = query.classification || '';
      const targetGroup = query.targetGroup || '';
      const minPrice = query.minPrice;
      const maxPrice = query.maxPrice;
      const flavour = query.flavour || '';
      const country = query.country || '';
      const brand = query.brand || '';
      const indication = query.indication || '';
      const brandOrigin = query.brandOrigin || '';
      const skip = (page - 1) * limit;

      // Construct standard filter conditions
      const conditions: any[] = [];
      if (category) conditions.push({ category });
      if (classification) conditions.push({ drug_classification: classification });
      if (targetGroup) {
        conditions.push({ 'thong_tin_chi_tiet.Đối tượng sử dụng': { $regex: targetGroup, $options: 'i' } });
      }
      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceCond: any = {};
        if (minPrice !== undefined) priceCond.$gte = minPrice;
        if (maxPrice !== undefined) priceCond.$lte = maxPrice;
        conditions.push({ price: priceCond });
      }
      if (flavour) {
        conditions.push({ 'thong_tin_chi_tiet.Mùi vị/ Mùi hương': { $regex: flavour, $options: 'i' } });
      }
      if (country) {
        conditions.push({ 'thong_tin_chi_tiet.Nước sản xuất': { $regex: country, $options: 'i' } });
      }
      if (brand) {
        conditions.push({
          $or: [
            { manufacturer: { $regex: brand, $options: 'i' } },
            { 'thong_tin_chi_tiet.Nhà sản xuất': { $regex: brand, $options: 'i' } }
          ]
        });
      }
      if (indication) {
        conditions.push({
          $or: [
            { cong_dung: { $regex: indication, $options: 'i' } },
            { 'thong_tin_chi_tiet.Chỉ định': { $regex: indication, $options: 'i' } }
          ]
        });
      }
      if (brandOrigin) {
        conditions.push({ 'thong_tin_chi_tiet.Xuất xứ thương hiệu': { $regex: brandOrigin, $options: 'i' } });
      }

      // Xoá logic filter cứng `stock > 0` theo branchId ở đây để
      // các thuốc hết hàng (stock = 0) vẫn được trả về trong kết quả tìm kiếm.
      // Khi đó, UI sẽ hiển thị Tồn kho: 0 và cho phép user bấm "Gợi ý thay thế" (UC-36).
      if (search) {
        // AI SERVICE VECTOR SEARCH with Mongoose fallback
        let aiServiceUrl = `http://ai-service:8000/api/ai/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`;
        if (category) aiServiceUrl += `&category=${encodeURIComponent(category)}`;
        if (classification) aiServiceUrl += `&classification=${encodeURIComponent(classification)}`;

        let mappedAiData: any[] = [];
        let aiTotal = 0;
        let useFallback = false;

        try {
          const response = await fetch(aiServiceUrl);
          if (!response.ok) {
            useFallback = true;
          } else {
            const resJson = await response.json();
            let aiData = resJson.data || [];

            // Apply advanced filters in-memory on aiData
            if (targetGroup || minPrice !== undefined || maxPrice !== undefined || flavour || country || brand || indication || brandOrigin) {
              aiData = aiData.filter((med: any) => {
                if (targetGroup) {
                  const val = med.thong_tin_chi_tiet?.['Đối tượng sử dụng'] || '';
                  if (!new RegExp(targetGroup, 'i').test(val)) return false;
                }
                if (minPrice !== undefined && med.price < minPrice) return false;
                if (maxPrice !== undefined && med.price > maxPrice) return false;
                if (flavour) {
                  const val = med.thong_tin_chi_tiet?.['Mùi vị/ Mùi hương'] || '';
                  if (!new RegExp(flavour, 'i').test(val)) return false;
                }
                if (country) {
                  const val = med.thong_tin_chi_tiet?.['Nước sản xuất'] || '';
                  if (!new RegExp(country, 'i').test(val)) return false;
                }
                if (brand) {
                  const val1 = med.manufacturer || '';
                  const val2 = med.thong_tin_chi_tiet?.['Nhà sản xuất'] || '';
                  if (!new RegExp(brand, 'i').test(val1) && !new RegExp(brand, 'i').test(val2)) return false;
                }
                if (indication) {
                  const val1 = med.cong_dung || '';
                  const val2 = med.thong_tin_chi_tiet?.['Chỉ định'] || '';
                  if (!new RegExp(indication, 'i').test(val1) && !new RegExp(indication, 'i').test(val2)) return false;
                }
                if (brandOrigin) {
                  const val = med.thong_tin_chi_tiet?.['Xuất xứ thương hiệu'] || '';
                  if (!new RegExp(brandOrigin, 'i').test(val)) return false;
                }
                return true;
              });
            }

            aiTotal = resJson.total !== undefined ? resJson.total : aiData.length;
            if (targetGroup || minPrice !== undefined || maxPrice !== undefined || flavour || country || brand || indication || brandOrigin) {
              aiTotal = aiData.length;
            }

            if (aiData.length === 0 && !targetGroup && minPrice === undefined && maxPrice === undefined && !flavour && !country && !brand && !indication && !brandOrigin) {
              useFallback = true;
            } else {
              // Truy vấn lô hàng cho các kết quả từ AI Service
              const aiMedIds = aiData.map((med: any) => (med._id || med.id || '').toString()).filter(id => id);
              const batchFilter: any = { medicineId: { $in: aiMedIds } };
              if (query.branchId) {
                batchFilter.branchId = query.branchId;
              }
              const aiBatches = await this.batchModel.find(batchFilter).lean().exec();
              const aiBatchesByMedId = new Map<string, any[]>();
              for (const batch of aiBatches) {
                const list = aiBatchesByMedId.get(batch.medicineId) || [];
                list.push(batch);
                aiBatchesByMedId.set(batch.medicineId, list);
              }

              mappedAiData = aiData.map((med: any) => {
                const medId = (med._id || med.id || '').toString();
                const medBatches = aiBatchesByMedId.get(medId) || [];
                const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
                const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + b.stock, 0) : (med.stock || 0);

                let earliestExpiryStr = '2026-12-31';
                if (activeBatches.length > 0) {
                  const earliestBatch = activeBatches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, activeBatches[0]);
                  earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
                }

                return {
                  id: medId,
                  name: med.name,
                  category: med.category || 'Chưa phân loại',
                  drug_classification: med.drug_classification || 'COMMON_SUPPLEMENT',
                  price: med.price || 50000,
                  stock: totalStock,
                  minStock: 50,
                  status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
                  expiry: earliestExpiryStr,
                  unit: med.unit || 'Hộp',
                  image: med.image,
                  active_ingredient: med.active_ingredient || '',
                  supplierId: med.supplierId || '',
                  priceTiers: med.priceTiers || [],
                  batches: medBatches.map(b => ({
                    batchNo: b.batchNo,
                    expDate: b.expDate,
                    stock: b.stock,
                    status: b.status,
                  })),
                };
              });
            }
          }
        } catch (fetchError) {
          this.logger.error(`AI Service failed or returned error: ${fetchError.message}. Using Mongoose fallback search.`);
          useFallback = true;
        }

        if (useFallback) {
          this.logger.log(`Executing fallback Mongoose regex search for "${search}"`);
          const filterQuery: any = {};
          const conditionsCopy = [...conditions];
          conditionsCopy.push({
            $or: [
              { name: { $regex: search, $options: 'i' } },
              { active_ingredient: { $regex: search, $options: 'i' } }
            ]
          });
          filterQuery.$and = conditionsCopy;

          const [data, total] = await Promise.all([
            this.medicineModel.find(filterQuery).select('-thong_tin_chi_tiet -cong_dung -luu_y -cach_dung').skip(skip).limit(Number(limit)).lean().exec(),
            this.medicineModel.countDocuments(filterQuery).exec(),
          ]);

          const medIds = data.map(med => med._id.toString());
          const batchFilter: any = { medicineId: { $in: medIds } };
          if (query.branchId) {
            batchFilter.branchId = query.branchId;
          }
          const allBatches = await this.batchModel.find(batchFilter).lean().exec();

          const batchesByMedId = new Map<string, any[]>();
          for (const batch of allBatches) {
            const list = batchesByMedId.get(batch.medicineId) || [];
            list.push(batch);
            batchesByMedId.set(batch.medicineId, list);
          }

          const mappedData = data.map((med) => {
            const medId = med._id.toString();
            const medBatches = batchesByMedId.get(medId) || [];
            const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
            const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + b.stock, 0) : (med.stock || 0);

            let earliestExpiryStr = '2026-12-31';
            if (activeBatches.length > 0) {
              const earliestBatch = activeBatches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, activeBatches[0]);
              earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
            }

            return {
              id: medId,
              name: med.name,
              category: med.category || 'Chưa phân loại',
              drug_classification: med.drug_classification || 'COMMON_SUPPLEMENT',
              price: med.price || 50000,
              stock: totalStock,
              minStock: 50,
              status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
              expiry: earliestExpiryStr,
              unit: med.unit || 'Hộp',
              image: med.image,
              active_ingredient: med.active_ingredient || '',
              supplierId: med.supplierId || '',
              priceTiers: med.priceTiers || [],
              batches: medBatches.map(b => ({
                batchNo: b.batchNo,
                expDate: b.expDate,
                stock: b.stock,
                status: b.status,
              })),
            };
          });

          return {
            data: mappedData,
            total,
            page: Number(page),
            limit: Number(limit),
          };
        }

        return {
          data: mappedAiData,
          total: aiTotal,
          page: Number(page),
          limit: Number(limit),
        };
      } else {
        // MONGOOSE SCROLL (Default View)
        const filterQuery: any = {};
        if (conditions.length > 0) {
          filterQuery.$and = conditions;
        }

        const [data, total] = await Promise.all([
          this.medicineModel.find(filterQuery).select('-thong_tin_chi_tiet -cong_dung -luu_y -cach_dung').skip(skip).limit(Number(limit)).lean().exec(),
          this.medicineModel.countDocuments(filterQuery).exec(),
        ]);

        // Truy vấn lô hàng cho toàn bộ danh sách kết quả hiển thị
        const medIds = data.map(med => med._id.toString());
        const batchFilter: any = { medicineId: { $in: medIds } };
        if (query.branchId) {
          batchFilter.branchId = query.branchId;
        }
        const allBatches = await this.batchModel.find(batchFilter).lean().exec();

        const batchesByMedId = new Map<string, any[]>();
        for (const batch of allBatches) {
          const list = batchesByMedId.get(batch.medicineId) || [];
          list.push(batch);
          batchesByMedId.set(batch.medicineId, list);
        }

        const mappedData = data.map((med) => {
          const medId = med._id.toString();
          const medBatches = batchesByMedId.get(medId) || [];
          const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
          const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + b.stock, 0) : (med.stock || 0);

          let earliestExpiryStr = '2026-12-31';
          if (activeBatches.length > 0) {
            const earliestBatch = activeBatches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, activeBatches[0]);
            earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
          }

          return {
            id: medId,
            name: med.name,
            category: med.category || 'Chưa phân loại',
            drug_classification: med.drug_classification || 'COMMON_SUPPLEMENT',
            price: med.price || 50000,
            stock: totalStock,
            minStock: 50,
            status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
            expiry: earliestExpiryStr,
            unit: med.unit || 'Hộp',
            image: med.image,
            active_ingredient: med.active_ingredient || '',
            supplierId: med.supplierId || '',
            priceTiers: med.priceTiers || [],
            batches: medBatches.map(b => ({
              batchNo: b.batchNo,
              expDate: b.expDate,
              stock: b.stock,
              status: b.status,
            })),
          };
        });

        return {
          data: mappedData,
          total,
          page: Number(page),
          limit: Number(limit),
        };
      }
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi danh sách thuốc');
    }
  }

  async getInventoryStats() {
    try {
      console.log('📨 [Inventory MS] Nhận yêu cầu lấy thống kê tồn kho');
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      console.log('🔍 [Inventory MS] Đang truy vấn database (tối ưu select & lean)...');
      const [medicines, batches] = await Promise.all([
        this.medicineModel.find().select('price').lean().exec(),
        this.batchModel.find({ stock: { $gt: 0 } }).select('medicineId stock expDate status').lean().exec()
      ]);
      console.log(`✅ [Inventory MS] Truy vấn thành công: ${medicines.length} medicines, ${batches.length} batches`);

      const totalMedicines = medicines.length;

      const activeBatches = batches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
      const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);

      const medPriceMap = new Map(medicines.map(m => [m._id.toString(), m.price || 0]));
      const totalValue = activeBatches.reduce((sum, b) => {
        const price = medPriceMap.get(b.medicineId) || 0;
        return sum + (price * b.stock);
      }, 0);

      const batchesByMedId = new Map<string, any[]>();
      for (const batch of activeBatches) {
        const list = batchesByMedId.get(batch.medicineId) || [];
        list.push(batch);
        batchesByMedId.set(batch.medicineId, list);
      }

      let lowStockCount = 0;
      let outOfStockCount = 0;

      for (const med of medicines) {
        const medId = med._id.toString();
        const medBatches = batchesByMedId.get(medId) || [];
        const stock = medBatches.reduce((sum, b) => sum + b.stock, 0);

        if (stock === 0) {
          outOfStockCount++;
        } else if (stock <= 50) {
          lowStockCount++;
        }
      }

      const expiredCount = batches.filter(b => b.stock > 0 && new Date(b.expDate) < today).length;

      const soonToExpireCount = batches.filter(b => {
        if (b.stock <= 0) return false;
        const exp = new Date(b.expDate);
        return exp >= today && exp <= ninetyDaysFromNow;
      }).length;

      return {
        totalMedicines,
        totalStock,
        totalValue,
        lowStockCount,
        outOfStockCount,
        expiredCount,
        soonToExpireCount
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi thống kê hàng tồn kho');
    }
  }

  async getExpirationReport() {
    try {
      console.log('📨 [Inventory MS] Nhận yêu cầu lấy báo cáo lô thuốc cận hạn/hết hạn');
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      // Tối ưu hóa: chỉ select các field cần thiết, sử dụng lean() và lọc trực tiếp theo ngày hết hạn (trong vòng 90 ngày)
      const batches = await this.batchModel.find({
        stock: { $gt: 0 },
        expDate: { $lte: ninetyDaysFromNow }
      }).select('medicineId batchNo expDate stock status').lean().exec();
      const medIds = [...new Set(batches.map(b => b.medicineId))];
      const medicines = await this.medicineModel.find({ _id: { $in: medIds } }).select('name category unit').lean().exec();
      const medMap = new Map(medicines.map(m => [m._id.toString(), m]));

      const report = batches
        .map(b => {
          const med = medMap.get(b.medicineId);
          const expDate = new Date(b.expDate);

          let status = 'ACTIVE';
          if (expDate < today) {
            status = 'EXPIRED';
          } else if (expDate <= ninetyDaysFromNow) {
            status = 'SOON_TO_EXPIRE';
          }

          return {
            id: b._id.toString(),
            medicineId: b.medicineId,
            medicineName: med ? med.name : 'Thuốc không xác định',
            category: med ? med.category : 'Chưa phân loại',
            unit: med ? med.unit : 'Hộp',
            batchNo: b.batchNo,
            expDate: expDate.toISOString().split('T')[0],
            stock: b.stock,
            status: status,
          };
        })
        .filter(item => item.status === 'EXPIRED' || item.status === 'SOON_TO_EXPIRE')
        .sort((a, b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime());

      console.log(`✅ [Inventory MS] Hoàn tất báo cáo hết hạn: tìm thấy ${report.length} lô.`);
      return report;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy báo cáo hết hạn');
    }
  }

  async getMedicinesByIds(ids: string[]) {
    try {
      this.logger.log(`Fetching multiple medicines by IDs: ${ids.join(', ')}`);
      const medicines = await this.medicineModel.find({ _id: { $in: ids } }).exec();
      const batches = await this.batchModel.find({
        medicineId: { $in: ids },
        status: 'ACTIVE',
        stock: { $gt: 0 }
      }).exec();

      const batchesByMedId = new Map<string, MedicineBatch[]>();
      for (const batch of batches) {
        const list = batchesByMedId.get(batch.medicineId) || [];
        list.push(batch);
        batchesByMedId.set(batch.medicineId, list);
      }

      return medicines.map((med) => {
        const medId = med._id.toString();
        const medBatches = batchesByMedId.get(medId) || [];
        const totalStock = medBatches.reduce((sum, b) => sum + b.stock, 0);

        let earliestExpiryStr = '2026-12-31';
        if (medBatches.length > 0) {
          const earliestBatch = medBatches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, medBatches[0]);
          earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
        }

        const medObj = med.toObject();
        return {
          ...medObj,
          id: medId,
          stock: totalStock,
          expiry: earliestExpiryStr,
          status: totalStock > 0 ? 'In Stock' : 'Out of Stock'
        };
      });
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy danh sách chi tiết thuốc');
    }
  }

  async createInventoryCheck(data: any) {
    this.logger.log(`Creating inventory check protocol. Status: ${data.status}`);

    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.checkModel.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
      },
    });
    const checkCode = `IC-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Verify and enrich items with system stock and calculate difference
    const enrichedItems = [];
    for (const item of data.items) {
      const batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo,
      }).exec();

      if (!batch) {
        throw new RpcException({ message: `Không tìm thấy lô "${item.batchNo}" của thuốc có ID: ${item.medicineId}` });
      }

      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      const systemStock = batch.stock;
      const actualStock = Number(item.actualStock);
      const difference = actualStock - systemStock;

      enrichedItems.push({
        medicineId: item.medicineId,
        medicineName: medicine ? medicine.name : 'Thuốc không xác định',
        batchNo: item.batchNo,
        systemStock,
        actualStock,
        difference,
        reason: item.reason || '',
      });
    }

    const check = new this.checkModel({
      checkCode,
      status: data.status || 'DRAFT',
      items: enrichedItems,
      performedBy: data.performedBy || 'Thủ kho',
      notes: data.notes || '',
    });

    await check.save();

    if (check.status === 'COMPLETED') {
      await this.applyStockAdjustments(check);
    }

    return {
      success: true,
      message: check.status === 'COMPLETED'
        ? `Đã tạo và hoàn tất biên bản kiểm kê ${checkCode}, tồn kho đã được điều chỉnh.`
        : `Đã lưu nháp biên bản kiểm kê ${checkCode}.`,
      data: check,
    };
  }

  async listInventoryChecks() {
    return this.checkModel.find().sort({ createdAt: -1 }).exec();
  }

  async getInventoryCheckById(id: string) {
    const check = await this.checkModel.findById(id).exec();
    if (!check) {
      throw new RpcException({ message: `Không tìm thấy biên bản kiểm kê: ${id}` });
    }
    return check;
  }

  async completeInventoryCheck(id: string) {
    const check = await this.checkModel.findById(id).exec();
    if (!check) {
      throw new RpcException({ message: `Không tìm thấy biên bản kiểm kê: ${id}` });
    }

    if (check.status === 'COMPLETED') {
      throw new RpcException({ message: 'Biên bản kiểm kê này đã được hoàn tất trước đó' });
    }

    check.status = 'COMPLETED';
    await check.save();

    await this.applyStockAdjustments(check);

    return {
      success: true,
      message: `Đã hoàn tất biên bản kiểm kê ${check.checkCode}, tồn kho đã được điều chỉnh.`,
      data: check,
    };
  }

  private async applyStockAdjustments(check: any) {
    this.logger.log(`Applying stock adjustments for check: ${check.checkCode}`);
    for (const item of check.items) {
      const batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo,
      }).exec();

      if (batch) {
        const stockBefore = batch.stock;
        batch.stock = item.actualStock;
        batch.status = batch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
        await batch.save();

        if (item.difference !== 0) {
          const log = new this.txnModel({
            type: 'ADJUSTMENT',
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchNo: item.batchNo,
            quantityChange: item.difference,
            stockBefore,
            stockAfter: item.actualStock,
            referenceId: check._id.toString(),
            referenceType: 'INVENTORY_CHECK',
            performedBy: check.performedBy || 'Thủ kho',
            notes: `Điều chỉnh kiểm kê theo biên bản ${check.checkCode}. Lý do: ${item.reason || 'Không có'}`,
          });
          await log.save();
        }
      }
    }
  }

  async getLowStockReport() {
    try {
      console.log('📨 [Inventory MS] Nhận yêu cầu lấy báo cáo thuốc sắp hết hàng/hết hàng');
      const batches = await this.batchModel.find({ stock: { $gt: 0 }, status: 'ACTIVE' })
        .select('medicineId stock')
        .lean()
        .exec();

      const stockMap = new Map<string, number>();
      for (const b of batches) {
        stockMap.set(b.medicineId, (stockMap.get(b.medicineId) || 0) + b.stock);
      }

      const medicines = await this.medicineModel.find()
        .select('name category unit price image active_ingredient')
        .lean()
        .exec();

      const lowStockMedicines = [];
      const lowStockMedIds = [];

      for (const med of medicines) {
        const medId = med._id.toString();
        const stock = stockMap.get(medId) || 0;
        const minStock = 50;

        if (stock <= minStock) {
          lowStockMedicines.push({ med, stock, minStock });
          lowStockMedIds.push(medId);
        }
      }

      // Query all batches for low stock medicines in one go to prevent N+1 query timeouts
      const allMedBatches = await this.batchModel.find({ medicineId: { $in: lowStockMedIds } })
        .select('medicineId batchNo expDate stock status')
        .lean()
        .exec();

      const batchesMap = new Map<string, any[]>();
      for (const b of allMedBatches) {
        const list = batchesMap.get(b.medicineId) || [];
        list.push(b);
        batchesMap.set(b.medicineId, list);
      }

      const report = lowStockMedicines.map(({ med, stock, minStock }) => {
        const medId = med._id.toString();
        const medBatches = batchesMap.get(medId) || [];
        return {
          id: medId,
          name: med.name,
          category: med.category || 'Chưa phân loại',
          price: med.price || 50000,
          stock: stock,
          minStock: minStock,
          status: stock > 0 ? 'In Stock' : 'Out of Stock',
          unit: med.unit || 'Hộp',
          image: med.image,
          active_ingredient: med.active_ingredient || '',
          batches: medBatches.map(b => ({
            batchNo: b.batchNo,
            expDate: b.expDate,
            stock: b.stock,
            status: b.status,
          })),
        };
      });

      console.log(`✅ [Inventory MS] Hoàn tất báo cáo thấp hơn mức tối thiểu: tìm thấy ${report.length} thuốc.`);
      return report;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy báo cáo thuốc sắp hết hàng');
    }
  }

  async getMedicinesDropdown() {
    try {
      const [medicines, batches] = await Promise.all([
        this.medicineModel.find().select('name unit price supplierId').lean().exec(),
        this.batchModel.find({ stock: { $gt: 0 }, status: 'ACTIVE' }).select('medicineId batchNo stock').lean().exec()
      ]);

      const batchesByMedId = new Map<string, any[]>();
      for (const batch of batches) {
        const list = batchesByMedId.get(batch.medicineId) || [];
        list.push({
          batchNo: batch.batchNo,
          stock: batch.stock
        });
        batchesByMedId.set(batch.medicineId, list);
      }

      return medicines.map(med => {
        const medId = med._id.toString();
        return {
          id: medId,
          name: med.name,
          unit: med.unit || 'Hộp',
          price: med.price || 0,
          supplierId: med.supplierId || '',
          batches: batchesByMedId.get(medId) || []
        };
      });
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy danh sách chọn thuốc');
    }
  }
  async findAlternatives(medicineId: string, branchId: string) {
    try {
      this.logger.log(`Finding alternatives for medicine ${medicineId} at branch ${branchId}`);
      const medicine = await this.medicineModel.findById(medicineId).lean().exec();
      if (!medicine) {
        throw new RpcException('Medicine not found');
      }

      let alternatives = [];
      const orConditions: any[] = [];

      // 1. Điều kiện trùng hoạt chất (kèm dạng bào chế nếu có)
      if (medicine.active_ingredient) {
        const activeIngredientCondition: any = { active_ingredient: medicine.active_ingredient };
        if (medicine.dosage_form) {
          activeIngredientCondition.dosage_form = medicine.dosage_form;
        }
        orConditions.push(activeIngredientCondition);
      }

      // 2. Điều kiện trùng danh mục
      if (medicine.category) {
        orConditions.push({ category: medicine.category });
      }

      // Query database 1 lần bằng $or
      if (orConditions.length > 0) {
        const query = {
          _id: { $ne: medicine._id },
          $or: orConditions
        };
        alternatives = await this.medicineModel.find(query).lean().exec();
      }

      if (alternatives.length === 0) {
        return [];
      }

      // 3. Filter theo tồn kho tại chi nhánh hiện tại (stock > 0)
      const altIds = alternatives.map(a => a._id.toString());
      const batches = await this.batchModel.find({
        medicineId: { $in: altIds },
        branchId: branchId || 'CENTRAL_WH',
        status: 'ACTIVE',
        stock: { $gt: 0 }
      }).lean().exec();

      const stockByMedId = new Map<string, number>();
      for (const b of batches) {
        stockByMedId.set(b.medicineId, (stockByMedId.get(b.medicineId) || 0) + b.stock);
      }

      const availableAlternatives = alternatives
        .filter(a => stockByMedId.has(a._id.toString()))
        .map(a => ({
          ...a,
          id: a._id.toString(),
          stock: stockByMedId.get(a._id.toString())
        }))
        .sort((a, b) => {
          // 1. Ưu tiên thuốc trùng hoạt chất lên đầu
          const aMatchesActive = medicine.active_ingredient && a.active_ingredient === medicine.active_ingredient;
          const bMatchesActive = medicine.active_ingredient && b.active_ingredient === medicine.active_ingredient;
          if (aMatchesActive && !bMatchesActive) return -1;
          if (!aMatchesActive && bMatchesActive) return 1;

          // 2. Nếu cùng mức độ ưu tiên hoạt chất, ưu tiên thuốc có tồn kho nhiều nhất
          return b.stock - a.stock;
        });

      return availableAlternatives;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi tìm thuốc thay thế');
    }
  }

  async updateMedicinePrice(id: string, price: number) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new RpcException('Medicine not found');
      }

      medicine.price = price;
      await medicine.save();

      return {
        success: true,
        message: 'Cập nhật giá thuốc thành công',
        price: medicine.price,
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi cập nhật giá thuốc');
    }
  }
}


