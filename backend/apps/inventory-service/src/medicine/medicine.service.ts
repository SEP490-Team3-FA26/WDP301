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

  async createMedicine(data: any) {
    try {
      this.logger.log(`[createMedicine] Creating new medicine: ${data?.name}`);
      if (!data?.name) {
        throw new RpcException('Tên dược phẩm không được để trống');
      }

      const sku = data.sku || Math.floor(100000 + Math.random() * 900000).toString();
      const barcode = data.barcode || sku;
      const drug_classification = data.drug_classification || 'NORMAL';
      const category = data.category || 'Thuốc thường';
      const unit = data.unit || 'Hộp';
      const price = Number(data.price) || 0;
      const safetyStock = Number(data.safetyStock) || 50;
      const reorderPoint = Number(data.reorderPoint) || 100;
      const initialStock = Number(data.stock) || 0;

      const newMedicine = new this.medicineModel({
        ...data,
        sku,
        barcode,
        drug_classification,
        category,
        unit,
        price,
        safetyStock,
        reorderPoint,
        stock: initialStock,
        status: data.status || 'ACTIVE',
      });

      const saved = await newMedicine.save();

      // If initial stock > 0, create an initial batch
      if (initialStock > 0) {
        const expDate = data.expiry_date ? new Date(data.expiry_date) : new Date('2027-12-31');
        await this.batchModel.create({
          medicineId: saved._id.toString(),
          batchNo: `INIT-${saved.sku || saved._id.toString().substring(0, 6)}`,
          expDate,
          mfgDate: new Date(),
          stock: initialStock,
          importPrice: Math.round(price * 0.7),
          supplierId: data.supplierId || null,
          status: 'ACTIVE',
        });
      }

      this.logger.log(`[createMedicine] Successfully created medicine with ID: ${saved._id}`);
      return {
        ...saved.toObject(),
        id: saved._id.toString(),
      };
    } catch (error) {
      this.logger.error(`[createMedicine] Error creating medicine: ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi tạo dược phẩm mới');
    }
  }

  async updateMedicine(id: string, updateData: any) {
    try {
      this.logger.log(`[updateMedicine] Updating medicine with ID: "${id}"`);
      const existing = await this.medicineModel.findById(id).exec();
      if (!existing) {
        throw new RpcException(`Không tìm thấy dược phẩm với ID: ${id}`);
      }

      const { _id, id: medId, ...cleanData } = updateData;
      if (cleanData.price !== undefined) cleanData.price = Number(cleanData.price);
      if (cleanData.safetyStock !== undefined) cleanData.safetyStock = Number(cleanData.safetyStock);
      if (cleanData.reorderPoint !== undefined) cleanData.reorderPoint = Number(cleanData.reorderPoint);

      const updated = await this.medicineModel.findByIdAndUpdate(
        id,
        { $set: cleanData },
        { new: true }
      ).exec();

      this.logger.log(`[updateMedicine] Successfully updated medicine "${updated?.name}"`);
      return {
        ...updated?.toObject(),
        id: updated?._id.toString(),
      };
    } catch (error) {
      this.logger.error(`[updateMedicine] Error updating medicine "${id}": ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi cập nhật thông tin dược phẩm');
    }
  }

  async getMedicineById(id: string) {
    try {
      this.logger.log(`[getMedicineById] Querying medicine by ID from MongoDB: "${id}"`);
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        this.logger.warn(`[getMedicineById] Medicine with ID "${id}" NOT found in MongoDB!`);
        throw new RpcException(`Medicine with ID ${id} not found in database`);
      }
      this.logger.log(`[getMedicineById] Found medicine: "${medicine.name}"`);

      // Lấy danh sách lô hàng khả dụng
      const batches = await this.batchModel.find({ medicineId: id, status: 'ACTIVE', stock: { $gt: 0 } }).exec();
      const totalStock = batches.reduce((sum, b) => sum + b.stock, 0);
      this.logger.log(`[getMedicineById] Found ${batches.length} active batches. Total stock: ${totalStock}`);

      // Tìm hạn dùng gần nhất
      let earliestExpiryStr = '2026-12-31';
      if (batches.length > 0) {
        const earliestBatch = batches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, batches[0]);
        earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
      }

      const medObj = medicine.toObject();
      const result = {
        ...medObj,
        id: medObj._id.toString(),
        stock: totalStock,
        expiry: earliestExpiryStr,
        status: totalStock > 0 ? 'In Stock' : 'Out of Stock',
        minStock: 50
      };
      this.logger.log(`[getMedicineById] Returning enriched medicine object: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`[getMedicineById] Error fetching medicine by ID "${id}": ${error.message}`, error.stack);
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


  async getBranchMedicines(query: any) {
    // Tách biệt hàm xử lý riêng cho branch để có thể dễ dàng custom
    // (ví dụ: chỉ hiện các thuốc đang có lô hàng ở branch)
    // Hiện tại tạm thời gọi lại listMedicines với branchId bắt buộc.
    if (!query.branchId) {
      throw new RpcException('Yêu cầu branchId để lấy danh sách thuốc chi nhánh');
    }

    if (query.branchStockOnly === 'true' || query.branchStockOnly === true) {
      // Lấy danh sách medicineIds có lô hàng ở chi nhánh này
      const branchBatches = await this.batchModel.find({ branchId: query.branchId }).select('medicineId').lean().exec();
      const medicineIds = [...new Set(branchBatches.map(b => b.medicineId))];
      
      if (medicineIds.length === 0) {
        return { data: [], total: 0, page: query.page || 1, limit: query.limit || 10, totalPages: 0 };
      }
      
      query.medicineIds = medicineIds;
      query.bypassAiSearch = true; // Bỏ qua AI search khi chỉ lấy tồn kho chi nhánh để kết quả chính xác tuyệt đối
    }

    return this.listMedicines(query);
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
    medicineIds?: string[];
    bypassAiSearch?: boolean;
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
      if (query.medicineIds && query.medicineIds.length > 0) {
        conditions.push({ _id: { $in: query.medicineIds } });
      }
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
      // Khi đó, UI sẽ hiển thị Tồn kho: 0 và cho phép user bấm "Gợi ý thay thế" (UC-36).
      if (search && !query.bypassAiSearch) {
        // AI SERVICE VECTOR SEARCH with Mongoose fallback
        let aiServiceUrl = `http://ai-service:8000/api/ai/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`;
        if (category) aiServiceUrl += `&category=${encodeURIComponent(category)}`;
        if (classification) aiServiceUrl += `&classification=${encodeURIComponent(classification)}`;

        let mappedAiData: any[] = [];
        let aiTotal = 0;
        let useFallback = query.bypassAiSearch || false;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
          const response = await fetch(aiServiceUrl, {
            headers: {
              'X-Internal-Token': process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
            },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
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
              // Filter AI results against actual database to prevent returning non-existent medicines
              const rawAiMedIds = aiData.map((med: any) => (med._id || med.id || '').toString()).filter(id => id);
              const existingMeds = await this.medicineModel.find({ _id: { $in: rawAiMedIds } }).select('_id stock price').lean().exec();
              const existingMedIds = new Set(existingMeds.map(m => m._id.toString()));
              const existingMedMap = new Map(existingMeds.map(m => [m._id.toString(), m]));

              aiData = aiData.filter((med: any) => existingMedIds.has((med._id || med.id || '').toString()));
              const aiMedIds = Array.from(existingMedIds);

              // Truy vấn lô hàng cho các kết quả từ AI Service
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
                const dbMed = existingMedMap.get(medId);
                const medBatches = aiBatchesByMedId.get(medId) || [];
                const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
                
                // Use DB stock and price to ensure consistency
                const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + b.stock, 0) : (dbMed?.stock || 0);
                const actualPrice = dbMed?.price || med.price || 50000;

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
                  price: actualPrice,
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
            const medIdStr = batch.medicineId ? String(batch.medicineId) : '';
            if (!medIdStr) continue;
            const list = batchesByMedId.get(medIdStr) || [];
            list.push(batch);
            batchesByMedId.set(medIdStr, list);
          }

          const mappedData = data.map((med) => {
            const medId = med._id.toString();
            const medBatches = batchesByMedId.get(medId) || [];
            const activeBatches = medBatches.filter(b => 
              (!b.status || String(b.status).toUpperCase() === 'ACTIVE') && Number(b.stock) > 0
            );
            const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0) : (med.stock || 0);

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
          const bId = String(query.branchId).trim();
          const regexStr = bId.replace(/^BR-0*/i, ''); // e.g. BR-001 -> 1
          batchFilter.$or = [
            { branchId: bId },
            { branchId: new RegExp(bId, 'i') },
            { branchId: new RegExp(`CN-?0*${regexStr}$`, 'i') },
            { branchId: new RegExp(`Quận\\s*${regexStr}`, 'i') },
          ];
        }
        const allBatches = await this.batchModel.find(batchFilter).lean().exec();

        const batchesByMedId = new Map<string, any[]>();
        for (const batch of allBatches) {
          const medIdStr = batch.medicineId ? String(batch.medicineId) : '';
          if (!medIdStr) continue;
          const list = batchesByMedId.get(medIdStr) || [];
          list.push(batch);
          batchesByMedId.set(medIdStr, list);
        }

        const mappedData = data.map((med) => {
          const medId = med._id.toString();
          const medBatches = batchesByMedId.get(medId) || [];
          const activeBatches = medBatches.filter(b => 
            (!b.status || String(b.status).toUpperCase() === 'ACTIVE') && Number(b.stock) > 0
          );
          const totalStock = query.branchId ? activeBatches.reduce((sum, b) => sum + Number(b.stock || 0), 0) : (med.stock || 0);

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

  async getInventoryStats(branchId?: string) {
    try {
      console.log(`📨 [Inventory MS] Nhận yêu cầu lấy thống kê tồn kho. Branch: ${branchId}`);
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const batchQuery: any = { stock: { $gt: 0 } };
      if (branchId && branchId !== 'all') {
        batchQuery.branchId = branchId;
      }

      console.log('🔍 [Inventory MS] Đang truy vấn database (tối ưu select & lean)...');
      const [medicines, batches] = await Promise.all([
        this.medicineModel.find().select('price').lean().exec(),
        this.batchModel.find(batchQuery).select('medicineId stock expDate status branchId').lean().exec()
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
      }).select('medicineId batchNo expDate stock status branchId').lean().exec();
      const medIds = [...new Set(batches.map(b => b.medicineId))];
      const medicines = await this.medicineModel.find({ _id: { $in: medIds } }).select('name category unit price').lean().exec();
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
            price: med ? med.price : 0,
            branchId: b.branchId || 'CENTRAL_WH'
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

  async handleExpirationAction(data: {
    batchId: string;
    action: 'DISPOSE' | 'RETURN_SUPPLIER' | 'DISCOUNT';
    quantity: number;
    notes?: string;
    discountPrice?: number;
    performedBy?: string;
  }) {
    try {
      const { batchId, action, quantity, notes, discountPrice, performedBy } = data;
      this.logger.log(`Handling expiration action: ${action} for batch ${batchId}`);

      const batch = await this.batchModel.findById(batchId).exec();
      if (!batch) {
        throw new RpcException('Không tìm thấy lô thuốc này');
      }

      const medicine = await this.medicineModel.findById(batch.medicineId).exec();
      if (!medicine) {
        throw new RpcException('Không tìm thấy dược phẩm tương ứng');
      }

      if (action === 'DISPOSE') {
        const actualDeduct = Math.min(batch.stock, quantity);
        if (actualDeduct <= 0) {
          throw new RpcException('Số lượng hủy không hợp lệ hoặc lô hàng đã hết');
        }

        const stockBefore = batch.stock;
        batch.stock -= actualDeduct;
        if (batch.stock === 0) {
          batch.status = 'EXPIRED';
        }
        await batch.save();

        const txn = new this.txnModel({
          type: 'DISPOSE',
          medicineId: batch.medicineId,
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: -actualDeduct,
          stockBefore,
          stockAfter: batch.stock,
          referenceType: 'EXPIRED_DISPOSAL',
          performedBy: performedBy || 'Quản lý',
          notes: notes || 'Xuất hủy thuốc hết hạn/cận hạn',
        });
        await txn.save();

        await this.syncMedicineStock(batch.medicineId);

        return {
          success: true,
          message: `Đã xuất hủy thành công ${actualDeduct} đơn vị của lô ${batch.batchNo}.`,
          data: batch
        };

      } else if (action === 'RETURN_SUPPLIER') {
        const actualDeduct = Math.min(batch.stock, quantity);
        if (actualDeduct <= 0) {
          throw new RpcException('Số lượng trả hàng không hợp lệ hoặc lô hàng đã hết');
        }

        const stockBefore = batch.stock;
        batch.stock -= actualDeduct;
        if (batch.stock === 0) {
          batch.status = 'EXPIRED';
        }
        await batch.save();

        const txn = new this.txnModel({
          type: 'ADJUSTMENT',
          medicineId: batch.medicineId,
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: -actualDeduct,
          stockBefore,
          stockAfter: batch.stock,
          referenceType: 'SUPPLIER_RETURN',
          performedBy: performedBy || 'Quản lý',
          notes: notes || 'Gửi trả nhà cung cấp do cận hạn/hết hạn',
        });
        await txn.save();

        await this.syncMedicineStock(batch.medicineId);

        return {
          success: true,
          message: `Đã xuất trả nhà cung cấp thành công ${actualDeduct} đơn vị của lô ${batch.batchNo}.`,
          data: batch
        };

      } else if (action === 'DISCOUNT') {
        if (!discountPrice || discountPrice <= 0) {
          throw new RpcException('Giá khuyến mãi không hợp lệ');
        }

        const oldPrice = medicine.price;
        medicine.price = discountPrice;
        await medicine.save();

        const txn = new this.txnModel({
          type: 'ADJUSTMENT',
          medicineId: batch.medicineId,
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: 0,
          stockBefore: batch.stock,
          stockAfter: batch.stock,
          referenceType: 'PRICE_DISCOUNT',
          performedBy: performedBy || 'Quản lý',
          notes: notes || `Thiết lập giá khuyến mãi cận hạn: ${oldPrice?.toLocaleString('vi-VN')}đ -> ${discountPrice?.toLocaleString('vi-VN')}đ`,
        });
        await txn.save();

        return {
          success: true,
          message: `Đã áp dụng giảm giá thành công cho thuốc ${medicine.name}: ${oldPrice?.toLocaleString('vi-VN')}đ -> ${discountPrice?.toLocaleString('vi-VN')}đ`,
          data: medicine
        };
      } else {
        throw new RpcException('Hành động không hợp lệ');
      }
    } catch (err) {
      throw new RpcException(err.message || 'Lỗi xử lý đề xuất hết hạn');
    }
  }

  private async syncMedicineStock(medicineId: string) {
    const activeBatches = await this.batchModel.find({
      medicineId,
      status: 'ACTIVE',
      stock: { $gt: 0 }
    }).exec();
    const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);
    await this.medicineModel.findByIdAndUpdate(medicineId, {
      $set: {
        stock: totalStock,
        status: totalStock > 0 ? 'In Stock' : 'Out of Stock'
      }
    }).exec();
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

    // Đồng bộ tồn kho cho bảng medicines
    const uniqueMedicineIds = [...new Set(check.items.map((item: any) => item.medicineId))];
    for (const medId of uniqueMedicineIds) {
      const activeBatches = await this.batchModel.find({ medicineId: medId, status: 'ACTIVE', stock: { $gt: 0 } }).exec();
      const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);
      await this.medicineModel.findByIdAndUpdate(medId, {
        $set: { stock: totalStock, status: totalStock > 0 ? 'In Stock' : 'Out of Stock' }
      }).exec();
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

  async getSafeStockChain(query: {
    serviceLevel?: number;
    periodDays?: number;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const serviceLevel = query.serviceLevel ? Number(query.serviceLevel) : 0.95;
      const periodDays = query.periodDays ? Number(query.periodDays) : 30;
      const branchId = query.branchId;
      const page = query.page ? Number(query.page) : 1;
      const limit = query.limit ? Number(query.limit) : 20;
      const skip = (page - 1) * limit;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - periodDays);

      const filterQuery: any = {};
      const [medicines, total] = await Promise.all([
        this.medicineModel.find(filterQuery).skip(skip).limit(limit).lean().exec(),
        this.medicineModel.countDocuments(filterQuery).exec()
      ]);

      const medIds = medicines.map(med => med._id.toString());

      // Bulk queries:
      // 1. Get all active batches for these medicines
      const batchQuery: any = { medicineId: { $in: medIds } };
      if (branchId) batchQuery.branchId = branchId;
      const allActiveBatches = await this.batchModel.find(batchQuery).lean().exec();

      // Group batches by medicineId
      const batchesByMedMap = new Map<string, any[]>();
      for (const batch of allActiveBatches) {
        if (!batch.medicineId) continue;
        const mId = batch.medicineId.toString();
        const list = batchesByMedMap.get(mId) || [];
        list.push(batch);
        batchesByMedMap.set(mId, list);
      }

      // 2. Query transactions for demand calculation in bulk
      const txnQuery: any = {
        medicineId: { $in: medIds },
        type: { $in: ['SALE_EXPORT', 'DISPOSE'] },
        createdAt: { $gte: startDate, $lte: endDate }
      };

      if (branchId) {
        const branchBatches = await this.batchModel.find({ branchId, medicineId: { $in: medIds } }).select('batchNo').lean().exec();
        const batchNos = branchBatches.map(b => b.batchNo);
        txnQuery.batchNo = { $in: batchNos };
      }

      const allExportTxns = await this.txnModel.find(txnQuery).sort({ createdAt: 1 }).lean().exec();

      // Group transactions by medicineId
      const txnsByMedMap = new Map<string, any[]>();
      for (const txn of allExportTxns) {
        const mId = txn.medicineId.toString();
        const list = txnsByMedMap.get(mId) || [];
        list.push(txn);
        txnsByMedMap.set(mId, list);
      }

      // 3. Lead Time: Query POs & GRNs in bulk
      let purchaseOrders = [];
      let grns = [];
      try {
        const db = this.medicineModel.db;
        purchaseOrders = await db.collection('purchaseorders').find({
          status: 'COMPLETED',
          'items.medicineId': { $in: medIds }
        }).toArray();

        const poIds = purchaseOrders.map(po => po._id.toString());
        if (poIds.length > 0) {
          grns = await db.collection('goodsreceiptnotes').find({
            poId: { $in: poIds },
            status: 'COMPLETED'
          }).toArray();
        }
      } catch (err) {
        this.logger.error('Failed to query purchase orders and grns in bulk', err);
      }

      // Group POs by medicineId
      const posByMedMap = new Map<string, any[]>();
      for (const po of purchaseOrders) {
        for (const item of po.items || []) {
          if (!item.medicineId) continue;
          const list = posByMedMap.get(item.medicineId) || [];
          list.push(po);
          posByMedMap.set(item.medicineId, list);
        }
      }

      const data = [];

      for (const med of medicines) {
        const medId = med._id.toString();

        // 1. Get batches & currentStock
        const activeBatches = batchesByMedMap.get(medId) || [];
        const currentStock = activeBatches.reduce((sum, b) => sum + (b.stock || 0), 0);

        // 2. Query transactions for demand calculation
        const exportTxns = txnsByMedMap.get(medId) || [];

        // 3. Compute daily demand array & statistics
        const dailyDemandMap: Record<string, number> = {};
        const d = new Date(startDate);
        while (d <= endDate) {
          const dateStr = d.toISOString().split('T')[0];
          dailyDemandMap[dateStr] = 0;
          d.setDate(d.getDate() + 1);
        }
        exportTxns.forEach(t => {
          const dateStr = new Date((t as any).createdAt).toISOString().split('T')[0];
          if (dailyDemandMap[dateStr] !== undefined) {
            dailyDemandMap[dateStr] += Math.abs(t.quantityChange);
          }
        });
        const dailyDemands = Object.values(dailyDemandMap);
        const totalExported = dailyDemands.reduce((a, b) => a + b, 0);
        const avgDailyDemand = dailyDemands.length > 0 ? totalExported / dailyDemands.length : 0;
        const variance = dailyDemands.length > 0
          ? dailyDemands.reduce((sum, val) => sum + Math.pow(val - avgDailyDemand, 2), 0) / dailyDemands.length
          : 0;
        const stdDevDemand = Math.sqrt(variance);

        // 4. Lead Time: Calculate from bulk POs & GRNs
        let avgLeadTimeDays = 5;
        let stdDevLeadTimeDays = 1.2;

        const medPOs = posByMedMap.get(medId) || [];
        const leadTimes = medPOs.map(po => {
          const grn = grns.find(g => g.poId === po._id.toString());
          if (!grn) return null;
          const poTime = new Date(po.createdAt).getTime();
          const grnTime = new Date(grn.createdAt).getTime();
          return (grnTime - poTime) / (1000 * 60 * 60 * 24);
        }).filter((val): val is number => val !== null && val >= 0);

        if (leadTimes.length > 0) {
          avgLeadTimeDays = leadTimes.reduce((sum, val) => sum + val, 0) / leadTimes.length;
          const ltVariance = leadTimes.reduce((sum, val) => sum + Math.pow(val - avgLeadTimeDays, 2), 0) / leadTimes.length;
          stdDevLeadTimeDays = Math.sqrt(ltVariance);
        }

        // 5. Turnover calculation
        const firstTxn = exportTxns[0];
        const lastTxn = exportTxns[exportTxns.length - 1];
        const openingStock = firstTxn ? firstTxn.stockBefore : currentStock;
        const closingStock = lastTxn ? lastTxn.stockAfter : currentStock;
        const avgInventory = (openingStock + closingStock) / 2;
        const inventoryTurnoverRate = avgInventory > 0 ? totalExported / avgInventory : 0;
        const daysInInventory = inventoryTurnoverRate > 0 ? periodDays / inventoryTurnoverRate : periodDays;

        // 6. Safety Stock & ROP & EOQ
        const Z_TABLE = { 0.90: 1.28, 0.95: 1.65, 0.98: 2.05, 0.99: 2.33 };
        const Z = Z_TABLE[serviceLevel] || 1.65;

        const safetyStock = Z * Math.sqrt(
          avgLeadTimeDays * Math.pow(stdDevDemand, 2) +
          Math.pow(avgDailyDemand, 2) * Math.pow(stdDevLeadTimeDays, 2)
        );
        const reorderPoint = (avgDailyDemand * avgLeadTimeDays) + safetyStock;

        const annualDemand = avgDailyDemand * 365;
        const orderingCost = 200000;
        const unitCost = med.price || 10000;
        const holdingCost = 0.05 * unitCost;
        const eoq = holdingCost > 0 ? Math.sqrt((2 * annualDemand * orderingCost) / holdingCost) : 0;

        // 7. Stock status assessment
        let stockStatus: 'CRITICAL' | 'LOW' | 'SAFE' | 'OVERSTOCK';
        if (currentStock <= 0) {
          stockStatus = 'CRITICAL';
        } else if (currentStock < safetyStock) {
          stockStatus = 'LOW';
        } else if (currentStock < reorderPoint) {
          stockStatus = 'SAFE';
        } else if (eoq > 0 && currentStock > eoq * 3) {
          stockStatus = 'OVERSTOCK';
        } else {
          stockStatus = 'SAFE';
        }

        const branchBreakdown = activeBatches.map(b => ({
          branchId: b.branchId || 'CENTRAL_WH',
          batchNo: b.batchNo || 'UNKNOWN-BATCH',
          stock: b.stock || 0,
          expDate: b.expDate ? new Date(b.expDate).toISOString() : '2026-12-31'
        }));

        data.push({
          medicineId: medId,
          medicineName: med.name,
          category: med.category || 'Chưa phân loại',
          unit: med.unit || 'Hộp',
          currentStock,
          stockStatus,
          demand: {
            totalExported,
            avgDailyDemand: Number(avgDailyDemand.toFixed(2)),
            stdDevDemand: Number(stdDevDemand.toFixed(2)),
          },
          leadTime: {
            avgDays: Number(avgLeadTimeDays.toFixed(2)),
            stdDevDays: Number(stdDevLeadTimeDays.toFixed(2)),
          },
          turnover: {
            openingStock,
            closingStock,
            avgInventory: Number(avgInventory.toFixed(2)),
            inventoryTurnoverRate: Number(inventoryTurnoverRate.toFixed(2)),
            daysInInventory: Number(daysInInventory.toFixed(2)),
          },
          thresholds: {
            safetyStock: Math.ceil(safetyStock),
            reorderPoint: Math.ceil(reorderPoint),
            eoq: Math.ceil(eoq),
            serviceLevel: (serviceLevel * 100) + '%',
          },
          branchBreakdown,
        });
      }

      return {
        data,
        total,
        page,
        limit,
        periodDays,
        serviceLevel
      };
    } catch (error) {
      this.logger.error('Failed to get safe stock chain:', error);
      throw new RpcException(error.message || 'Lỗi lấy báo cáo tồn kho an toàn');
    }
  }

  async getAnomalyDetection(query: {
    periodDays?: number;
    zScoreThreshold?: number;
  }) {
    try {
      const periodDays = query.periodDays ? Number(query.periodDays) : 60;
      const zScoreThreshold = query.zScoreThreshold ? Number(query.zScoreThreshold) : 3;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - periodDays);

      const transactions = await this.txnModel.find({
        type: { $in: ['SALE_EXPORT', 'DISPOSE', 'ADJUSTMENT'] },
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean().exec();

      const txnsByMed: Record<string, any[]> = {};
      for (const t of transactions) {
        if (!txnsByMed[t.medicineId]) txnsByMed[t.medicineId] = [];
        txnsByMed[t.medicineId].push(t);
      }

      const anomalies = [];
      let summaryHigh = 0;
      let summaryMedium = 0;
      let summarySpikeExport = 0;
      let summaryLargeAdjustment = 0;

      for (const [medId, txs] of Object.entries(txnsByMed)) {
        const quantities = txs.map(t => Math.abs(t.quantityChange));
        const total = quantities.reduce((a, b) => a + b, 0);
        const mean = total / quantities.length;
        const variance = quantities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / quantities.length;
        const stdDev = Math.sqrt(variance);

        if (stdDev === 0) continue;

        for (const t of txs) {
          const qty = Math.abs(t.quantityChange);
          const zScore = (qty - mean) / stdDev;

          if (zScore > zScoreThreshold) {
            const severity = zScore > 4 ? 'HIGH' : 'MEDIUM';
            const anomalyType = t.type === 'ADJUSTMENT' ? 'LARGE_ADJUSTMENT' : 'SPIKE_EXPORT';

            if (severity === 'HIGH') summaryHigh++;
            else summaryMedium++;

            if (anomalyType === 'LARGE_ADJUSTMENT') summaryLargeAdjustment++;
            else summarySpikeExport++;

            const med = await this.medicineModel.findById(medId).select('name category').lean().exec();

            anomalies.push({
              id: t._id.toString(),
              medicineId: medId,
              medicineName: med ? med.name : t.medicineName || 'Thuốc không xác định',
              category: med ? med.category : 'Chưa phân loại',
              anomalyType,
              severity,
              transactionType: t.type,
              quantityChange: t.quantityChange,
              detectedAt: new Date((t as any).createdAt).toISOString(),
              referenceId: t.referenceId || null,
              referenceType: t.referenceType || null,
              performedBy: t.performedBy || 'System',
              statistics: {
                avgDailyExport: Number(mean.toFixed(2)),
                stdDev: Number(stdDev.toFixed(2)),
                zScore: Number(zScore.toFixed(2)),
                upperThreshold: Number((mean + zScoreThreshold * stdDev).toFixed(2)),
                lowerThreshold: Number(Math.max(0, mean - zScoreThreshold * stdDev).toFixed(2)),
              },
              description: `${t.type === 'ADJUSTMENT' ? 'Biến động kiểm kê/điều chỉnh' : 'Số lượng xuất kho'} đột biến: ${qty} đơn vị (Z-Score = ${zScore.toFixed(2)})`
            });
          }
        }
      }

      anomalies.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

      return {
        data: anomalies,
        total: anomalies.length,
        periodDays,
        zScoreThreshold,
        analyzedAt: new Date().toISOString(),
        summary: {
          high: summaryHigh,
          medium: summaryMedium,
          spikeExport: summarySpikeExport,
          largeAdjustment: summaryLargeAdjustment,
        }
      };
    } catch (error) {
      this.logger.error('Failed to detect anomalies:', error);
      throw new RpcException(error.message || 'Lỗi phát hiện bất thường tồn kho');
    }
  }

  async getExpirationReport() {
    try {
      this.logger.log('[getExpirationReport] Calculating expiring batches...');
      const now = new Date();
      const next90Days = new Date();
      next90Days.setDate(now.getDate() + 90);

      const batches = await this.batchModel
        .find({
          status: 'ACTIVE',
          stock: { $gt: 0 },
          expDate: { $lte: next90Days },
        })
        .lean()
        .exec();

      const medicineIds = [...new Set(batches.map((b) => b.medicineId))];
      const medicines = await this.medicineModel
        .find({ _id: { $in: medicineIds } }, { _id: 1, name: 1, sku: 1, unit: 1, drug_classification: 1 })
        .lean()
        .exec();

      const medMap = new Map(medicines.map((m) => [String(m._id), m]));

      const report = batches.map((b) => {
        const med: any = medMap.get(String(b.medicineId)) || {};
        const daysLeft = Math.ceil((new Date(b.expDate).getTime() - now.getTime()) / (1000 * 3600 * 24));
        return {
          batchId: b._id,
          batchNo: b.batchNo,
          medicineId: b.medicineId,
          medicineName: med.name || 'Dược phẩm',
          sku: med.sku || 'N/A',
          unit: med.unit || 'Hộp',
          stock: b.stock,
          expDate: b.expDate,
          daysLeft,
          status: daysLeft <= 0 ? 'EXPIRED' : daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
        };
      });

      return report.sort((a, b) => a.daysLeft - b.daysLeft);
    } catch (error) {
      this.logger.error(`[getExpirationReport] Error: ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi lấy báo cáo hết hạn');
    }
  }

  async handleExpirationAction(data: {
    batchId: string;
    action: 'DISPOSE' | 'RETURN_SUPPLIER' | 'DISCOUNT';
    quantity: number;
    notes?: string;
    discountPrice?: number;
    performedBy?: string;
  }) {
    try {
      this.logger.log(`[handleExpirationAction] Action ${data?.action} on batch ${data?.batchId}`);
      const batch = await this.batchModel.findById(data?.batchId);
      if (!batch) {
        throw new RpcException('Không tìm thấy lô hàng');
      }

      if (data.action === 'DISPOSE' || data.action === 'RETURN_SUPPLIER') {
        const qtyToReduce = Math.min(batch.stock, data.quantity || batch.stock);
        batch.stock -= qtyToReduce;
        if (batch.stock <= 0) {
          batch.status = 'EXPIRED';
        }
        await batch.save();

        await this.medicineModel.findByIdAndUpdate(batch.medicineId, {
          $inc: { stock: -qtyToReduce },
        });
      } else if (data.action === 'DISCOUNT') {
        if (data.discountPrice && data.discountPrice > 0) {
          await this.medicineModel.findByIdAndUpdate(batch.medicineId, {
            price: data.discountPrice,
          });
        }
      }

      return { success: true, message: 'Xử lý hành động hết hạn thành công', batchId: batch._id };
    } catch (error) {
      this.logger.error(`[handleExpirationAction] Error: ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi xử lý hành động hết hạn');
    }
  }

  async getLowStockReport() {
    try {
      this.logger.log('[getLowStockReport] Calculating low stock medicines...');
      const medicines = await this.medicineModel.find({}).lean().exec();

      const lowStockItems = medicines
        .filter((m) => {
          const stock = m.stock || 0;
          const safetyStock = m.safetyStock ?? 50;
          return stock <= safetyStock;
        })
        .map((m) => ({
          medicineId: m._id,
          name: m.name,
          sku: m.sku || 'N/A',
          stock: m.stock || 0,
          safetyStock: m.safetyStock ?? 50,
          reorderPoint: m.reorderPoint ?? 100,
          unit: m.unit || 'Hộp',
          status: (m.stock || 0) === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        }));

      return lowStockItems.sort((a, b) => a.stock - b.stock);
    } catch (error) {
      this.logger.error(`[getLowStockReport] Error: ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi lấy báo cáo thuốc sắp hết hàng');
    }
  }
}


