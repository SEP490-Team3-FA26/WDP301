import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine } from './schemas/medicine.schema';
import { MedicineBatch } from './schemas/medicine-batch.schema';

@Injectable()
export class MedicineService {
  private readonly logger = new Logger(MedicineService.name);

  constructor(
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
  ) { }

  async getMedicineFilters() {
    try {
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

      const updateData: any = { status };
      const updatedMedicine = await this.medicineModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).exec();

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

  async listMedicines(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    classification?: string;
  }) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const search = query.search || '';
      const category = query.category || '';
      const classification = query.classification || '';
      const skip = (page - 1) * limit;

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
            const aiData = resJson.data || [];
            aiTotal = resJson.total || aiData.length;

            if (aiData.length === 0) {
              useFallback = true;
            } else {
              // Truy vấn lô hàng cho các kết quả từ AI Service
              const aiMedIds = aiData.map((med: any) => (med._id || med.id || '').toString()).filter(id => id);
              const aiBatches = await this.batchModel.find({ medicineId: { $in: aiMedIds } }).exec();
              const aiBatchesByMedId = new Map<string, MedicineBatch[]>();
              for (const batch of aiBatches) {
                const list = aiBatchesByMedId.get(batch.medicineId) || [];
                list.push(batch);
                aiBatchesByMedId.set(batch.medicineId, list);
              }

              mappedAiData = aiData.map((med: any) => {
                const medId = (med._id || med.id || '').toString();
                const medBatches = aiBatchesByMedId.get(medId) || [];
                const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
                const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);

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
                  batches: medBatches.map(b => ({
                    batchNo: b.batchNo,
                    expDate: b.expDate,
                    stock: b.stock,
                    status: b.status,
                  })),
                  cong_dung: med.cong_dung || 'N/A',
                  cach_dung: med.cach_dung || 'N/A',
                  tac_dung_phu: med.tac_dung_phu || 'N/A',
                  luu_y: med.luu_y || 'N/A',
                  bao_quan: med.bao_quan || 'N/A',
                  manufacturer: med.manufacturer || 'N/A',
                  registration_number: med.registration_number || 'N/A',
                  dosage_form: med.dosage_form || 'N/A',
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
          if (category) filterQuery.category = category;
          if (classification) filterQuery.drug_classification = classification;

          filterQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { active_ingredient: { $regex: search, $options: 'i' } }
          ];

          const [data, total] = await Promise.all([
            this.medicineModel.find(filterQuery).skip(skip).limit(Number(limit)).exec(),
            this.medicineModel.countDocuments(filterQuery).exec(),
          ]);

          const medIds = data.map(med => med._id.toString());
          const allBatches = await this.batchModel.find({ medicineId: { $in: medIds } }).exec();

          const batchesByMedId = new Map<string, MedicineBatch[]>();
          for (const batch of allBatches) {
            const list = batchesByMedId.get(batch.medicineId) || [];
            list.push(batch);
            batchesByMedId.set(batch.medicineId, list);
          }

          const mappedData = data.map((med) => {
            const medId = med._id.toString();
            const medBatches = batchesByMedId.get(medId) || [];
            const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
            const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);

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
              batches: medBatches.map(b => ({
                batchNo: b.batchNo,
                expDate: b.expDate,
                stock: b.stock,
                status: b.status,
              })),
              cong_dung: med.cong_dung || 'N/A',
              cach_dung: med.cach_dung || 'N/A',
              tac_dung_phu: med.tac_dung_phu || 'N/A',
              luu_y: med.luu_y || 'N/A',
              bao_quan: med.bao_quan || 'N/A',
              manufacturer: med.manufacturer || 'N/A',
              registration_number: med.registration_number || 'N/A',
              dosage_form: med.dosage_form || 'N/A',
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
        if (category) filterQuery.category = category;
        if (classification) filterQuery.drug_classification = classification;

        const [data, total] = await Promise.all([
          this.medicineModel.find(filterQuery).skip(skip).limit(Number(limit)).exec(),
          this.medicineModel.countDocuments(filterQuery).exec(),
        ]);

        // Truy vấn lô hàng cho toàn bộ danh sách kết quả hiển thị
        const medIds = data.map(med => med._id.toString());
        const allBatches = await this.batchModel.find({ medicineId: { $in: medIds } }).exec();

        const batchesByMedId = new Map<string, MedicineBatch[]>();
        for (const batch of allBatches) {
          const list = batchesByMedId.get(batch.medicineId) || [];
          list.push(batch);
          batchesByMedId.set(batch.medicineId, list);
        }

        const mappedData = data.map((med) => {
          const medId = med._id.toString();
          const medBatches = batchesByMedId.get(medId) || [];
          const activeBatches = medBatches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
          const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);

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
            batches: medBatches.map(b => ({
              batchNo: b.batchNo,
              expDate: b.expDate,
              stock: b.stock,
              status: b.status,
            })),
            cong_dung: med.cong_dung || 'N/A',
            cach_dung: med.cach_dung || 'N/A',
            tac_dung_phu: med.tac_dung_phu || 'N/A',
            luu_y: med.luu_y || 'N/A',
            bao_quan: med.bao_quan || 'N/A',
            manufacturer: med.manufacturer || 'N/A',
            registration_number: med.registration_number || 'N/A',
            dosage_form: med.dosage_form || 'N/A',
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
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const [medicines, batches] = await Promise.all([
        this.medicineModel.find().exec(),
        this.batchModel.find().exec()
      ]);

      const totalMedicines = medicines.length;

      const activeBatches = batches.filter(b => b.status === 'ACTIVE' && b.stock > 0);
      const totalStock = activeBatches.reduce((sum, b) => sum + b.stock, 0);

      const medPriceMap = new Map(medicines.map(m => [m._id.toString(), m.price || 0]));
      const totalValue = activeBatches.reduce((sum, b) => {
        const price = medPriceMap.get(b.medicineId) || 0;
        return sum + (price * b.stock);
      }, 0);

      const batchesByMedId = new Map<string, MedicineBatch[]>();
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
      const today = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(today.getDate() + 90);

      const batches = await this.batchModel.find({ stock: { $gt: 0 } }).exec();
      const medIds = [...new Set(batches.map(b => b.medicineId))];
      const medicines = await this.medicineModel.find({ _id: { $in: medIds } }).exec();
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

      return report;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy báo cáo hết hạn');
    }
  }
}
