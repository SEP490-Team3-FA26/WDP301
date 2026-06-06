import { Controller, Get, Query, HttpException, HttpStatus, UseInterceptors, Param, Body, Patch } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Medicine } from './medicine.schema';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('💊 Medicines')
@Controller('api/medicines')
export class MedicineController {
  constructor(@InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>) {}

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
      return medicine;
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
      const updateData: any = { status };
      if (stock !== undefined) updateData.stock = stock;

      const medicine = await this.medicineModel.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      ).exec();

      if (!medicine) {
        throw new HttpException('Medicine not found', HttpStatus.NOT_FOUND);
      }
      return medicine;
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
        
        const response = await fetch(aiServiceUrl);
        if (!response.ok) {
          throw new HttpException(
            'Failed to fetch from AI Service',
            HttpStatus.BAD_GATEWAY,
          );
        }
        return await response.json();
      } else {
        // MONGOOSE SCROLL (Default View)
        const filterQuery: any = {};
        if (category) filterQuery.category = category;
        if (classification) filterQuery.drug_classification = classification;

        const [data, total] = await Promise.all([
          this.medicineModel.find(filterQuery).skip(skip).limit(Number(limit)).exec(),
          this.medicineModel.countDocuments(filterQuery).exec(),
        ]);

        const mappedData = data.map((med) => {
          const price = med.thong_tin_chi_tiet?.['Giá bán'] || med.thong_tin_chi_tiet?.price || Math.floor(Math.random() * (450 - 15 + 1) + 15) * 1000;
          return {
            id: med._id.toString(),
            name: med.name,
            category: med.category || med.thong_tin_chi_tiet?.['Danh mục'] || 'Chưa phân loại',
            drug_classification: med.get('drug_classification') || 'COMMON_SUPPLEMENT',
            price,
            stock: med.stock || 0,
            minStock: 50,
            status: med.status || 'Out of Stock',
            expiry: med.expiry_date || '2026-12-31',
            unit: med.unit || 'Hộp',
            image: med.image,
            active_ingredient: med.thong_tin_chi_tiet?.['Thành phần'] || '',
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
