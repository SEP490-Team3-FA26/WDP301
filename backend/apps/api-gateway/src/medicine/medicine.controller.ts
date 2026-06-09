import { Controller, Get, Query, HttpException, HttpStatus, UseInterceptors, Param, Body, Patch } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine } from './medicine.schema';
import { MedicineBatch } from '../../../inventory-service/src/medicine-batch.schema';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('💊 Medicines')
@Controller('api/medicines')
export class MedicineController {
  constructor(
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
  ) {}

  @Get('filters')
  @ApiOperation({ summary: 'Lấy danh sách các bộ lọc có sẵn' })
  async getFilters() {
    try {
      const categories = await this.medicineModel.distinct('category').exec();
      const classifications = await this.medicineModel.distinct('drug_classification').exec();
      return {
        categories: categories.filter(c => c),
        classifications: classifications.filter(c => c)
      };
    } catch (error) {
      throw new HttpException(error.message || 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 loại thuốc' })
  async getMedicineById(@Param('id') id: string) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new HttpException('Medicine not found', HttpStatus.NOT_FOUND);
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
      throw new HttpException(error.message || 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cập nhật trạng thái / tồn kho của thuốc' })
  async updateMedicineStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('stock') stock?: number
  ) {
    try {
      const medicine = await this.medicineModel.findById(id).exec();
      if (!medicine) {
        throw new HttpException('Medicine not found', HttpStatus.NOT_FOUND);
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
      throw new HttpException(error.message || 'Internal server error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60000) // Cache for 60 seconds
  @ApiOperation({ summary: 'Lấy danh sách thuốc (kết nối Mongoose & Vector DB)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'classification', required: false, type: String })
  async getMedicines(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('category') category = '',
    @Query('classification') classification = '',
  ) {
    try {
      const skip = (page - 1) * limit;

      if (search) {
        // AI SERVICE VECTOR SEARCH
        let aiServiceUrl = `http://ai-service:8000/api/ai/medicines?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`;
        if (category) aiServiceUrl += `&category=${encodeURIComponent(category)}`;
        if (classification) aiServiceUrl += `&classification=${encodeURIComponent(classification)}`;
        
        let aiData = [];
        let aiTotal = 0;
        let fetchSuccess = false;

        try {
          const response = await fetch(aiServiceUrl);
          if (response.ok) {
            const resJson = await response.json();
            aiData = resJson.data || [];
            aiTotal = resJson.total || aiData.length;
            fetchSuccess = true;
          }
        } catch (err) {
          console.warn('AI Service connection failed, falling back to database regex search:', err.message);
        }

        if (!fetchSuccess) {
          const filterQuery: any = {};
          if (category) filterQuery.category = category;
          if (classification) filterQuery.drug_classification = classification;
          filterQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { active_ingredient: { $regex: search, $options: 'i' } }
          ];

          const [fallbackData, fallbackTotal] = await Promise.all([
            this.medicineModel.find(filterQuery).skip(skip).limit(Number(limit)).exec(),
            this.medicineModel.countDocuments(filterQuery).exec(),
          ]);
          aiData = fallbackData;
          aiTotal = fallbackTotal;
        }

        // Truy vấn lô hàng cho các kết quả từ AI Service
        const aiMedIds = aiData.map((med: any) => (med._id || med.id).toString());
        const aiBatches = await this.batchModel.find({ medicineId: { $in: aiMedIds } }).exec();
        const aiBatchesByMedId = new Map<string, MedicineBatch[]>();
        for (const batch of aiBatches) {
          const list = aiBatchesByMedId.get(batch.medicineId) || [];
          list.push(batch);
          aiBatchesByMedId.set(batch.medicineId, list);
        }

        const mappedAiData = aiData.map((med: any) => {
          const medId = (med._id || med.id).toString();
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
          };
        });

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
      throw new HttpException(
        error.message || 'Internal server error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
