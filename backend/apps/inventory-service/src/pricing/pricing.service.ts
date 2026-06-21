import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BranchPriceList } from './schemas/branch-price-list.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectModel(BranchPriceList.name) private readonly priceListModel: Model<BranchPriceList>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
  ) {}

  /**
   * Lấy bảng giá của 1 chi nhánh (có pagination, search)
   */
  async getPriceListByBranch(data: { branchId: string; page?: number; limit?: number; search?: string }) {
    const { branchId, page = 1, limit = 20, search = '' } = data;
    this.logger.log(`Fetching price list for branch: ${branchId}, page: ${page}, limit: ${limit}`);

    const priceLists = await this.priceListModel.find({ branchId }).sort({ updatedAt: -1 }).exec();

    // Enrich với thông tin thuốc
    const medicineIds = priceLists.map(p => p.medicineId);
    const medicines = await this.medicineModel.find({ _id: { $in: medicineIds } }).exec();
    const medicineMap = new Map(medicines.map(m => [m._id.toString(), m]));

    let enriched = priceLists.map(p => {
      const med = medicineMap.get(p.medicineId);
      return {
        id: p._id.toString(),
        branchId: p.branchId,
        medicineId: p.medicineId,
        medicineName: med?.name || 'Không xác định',
        medicineSku: med?.sku || '',
        medicineUnit: med?.unit || 'Hộp',
        defaultPrice: med?.price || 0,
        retailPrice: p.retailPrice,
        wholesalePrice: p.wholesalePrice,
        wholesaleTiers: p.wholesaleTiers || [],
        isActive: p.isActive,
        updatedBy: p.updatedBy,
        updatedAt: (p as any).updatedAt,
      };
    });

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      enriched = enriched.filter(
        e =>
          e.medicineName.toLowerCase().includes(searchLower) ||
          (e.medicineSku && e.medicineSku.toLowerCase().includes(searchLower)),
      );
    }

    const total = enriched.length;
    const startIdx = (page - 1) * limit;
    const paged = enriched.slice(startIdx, startIdx + limit);

    return {
      data: paged,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Tạo hoặc cập nhật giá cho 1 thuốc tại 1 chi nhánh
   */
  async upsertPrice(data: {
    branchId: string;
    medicineId: string;
    retailPrice?: number;
    wholesalePrice?: number;
    wholesaleTiers?: { minQuantity: number; price: number }[];
    isActive?: boolean;
    updatedBy?: string;
  }) {
    const { branchId, medicineId, retailPrice, wholesalePrice, wholesaleTiers, isActive, updatedBy } = data;
    this.logger.log(`Upserting price for branch: ${branchId}, medicine: ${medicineId}`);

    // Validate medicine exists
    const medicine = await this.medicineModel.findById(medicineId).exec();
    if (!medicine) {
      throw new RpcException({ message: `Không tìm thấy thuốc với ID: ${medicineId}`, statusCode: 404 });
    }

    // Sort wholesale tiers by minQuantity ascending
    const sortedTiers = wholesaleTiers
      ? [...wholesaleTiers].sort((a, b) => a.minQuantity - b.minQuantity)
      : undefined;

    const updateData: any = { updatedBy };
    if (retailPrice !== undefined) updateData.retailPrice = retailPrice;
    if (wholesalePrice !== undefined) updateData.wholesalePrice = wholesalePrice;
    if (sortedTiers !== undefined) updateData.wholesaleTiers = sortedTiers;
    if (isActive !== undefined) updateData.isActive = isActive;

    const result = await this.priceListModel.findOneAndUpdate(
      { branchId, medicineId },
      { $set: updateData, $setOnInsert: { branchId, medicineId } },
      { upsert: true, new: true },
    ).exec();

    return {
      success: true,
      message: 'Cập nhật bảng giá thành công',
      data: {
        id: result._id.toString(),
        branchId: result.branchId,
        medicineId: result.medicineId,
        medicineName: medicine.name,
        retailPrice: result.retailPrice,
        wholesalePrice: result.wholesalePrice,
        wholesaleTiers: result.wholesaleTiers,
        isActive: result.isActive,
        defaultPrice: medicine.price || 0,
      },
    };
  }

  /**
   * Import hàng loạt giá cho 1 chi nhánh
   */
  async bulkUpsertPrices(data: {
    branchId: string;
    items: {
      medicineId: string;
      retailPrice?: number;
      wholesalePrice?: number;
      wholesaleTiers?: { minQuantity: number; price: number }[];
    }[];
    updatedBy?: string;
  }) {
    const { branchId, items, updatedBy } = data;
    this.logger.log(`Bulk upserting ${items.length} prices for branch: ${branchId}`);

    const results = [];
    const errors = [];

    for (const item of items) {
      try {
        const result = await this.upsertPrice({
          branchId,
          medicineId: item.medicineId,
          retailPrice: item.retailPrice,
          wholesalePrice: item.wholesalePrice,
          wholesaleTiers: item.wholesaleTiers,
          updatedBy,
        });
        results.push(result.data);
      } catch (error) {
        errors.push({ medicineId: item.medicineId, error: error.message || 'Lỗi không xác định' });
      }
    }

    return {
      success: true,
      message: `Đã cập nhật ${results.length}/${items.length} mục`,
      data: results,
      errors,
    };
  }

  /**
   * Xóa override giá → chi nhánh dùng giá mặc định
   */
  async deletePrice(data: { branchId: string; medicineId: string }) {
    const { branchId, medicineId } = data;
    this.logger.log(`Deleting price override for branch: ${branchId}, medicine: ${medicineId}`);

    const result = await this.priceListModel.findOneAndDelete({ branchId, medicineId }).exec();
    if (!result) {
      throw new RpcException({ message: 'Không tìm thấy bảng giá để xóa', statusCode: 404 });
    }

    return {
      success: true,
      message: 'Đã xóa override giá. Chi nhánh sẽ dùng giá mặc định.',
    };
  }

  /**
   * Core logic: Resolve giá cuối cùng dựa vào chi nhánh + loại bán + số lượng
   */
  async resolvePrice(
    branchId: string | undefined,
    medicineId: string,
    type: string = 'RETAIL',
    quantity: number = 1,
  ): Promise<number> {
    // Nếu không có branchId, fallback về giá mặc định
    if (!branchId) {
      const medicine = await this.medicineModel.findById(medicineId).exec();
      return medicine?.price || 0;
    }

    const priceEntry = await this.priceListModel.findOne({
      branchId,
      medicineId,
      isActive: true,
    }).exec();

    if (!priceEntry) {
      // Fallback về giá mặc định từ Medicine
      const medicine = await this.medicineModel.findById(medicineId).exec();
      return medicine?.price || 0;
    }

    if (type === 'WHOLESALE') {
      // Kiểm tra bậc thang giá sỉ (sắp xếp giảm dần minQuantity)
      if (priceEntry.wholesaleTiers && priceEntry.wholesaleTiers.length > 0) {
        const sortedTiers = [...priceEntry.wholesaleTiers].sort((a, b) => b.minQuantity - a.minQuantity);
        for (const tier of sortedTiers) {
          if (quantity >= tier.minQuantity) {
            return tier.price;
          }
        }
      }
      // Không match tier nào → giá sỉ cơ bản
      if (priceEntry.wholesalePrice != null) {
        return priceEntry.wholesalePrice;
      }
    }

    // RETAIL hoặc fallback
    if (priceEntry.retailPrice != null) {
      return priceEntry.retailPrice;
    }

    // Cuối cùng fallback về Medicine.price
    const medicine = await this.medicineModel.findById(medicineId).exec();
    return medicine?.price || 0;
  }

  /**
   * Sao chép bảng giá từ chi nhánh này sang chi nhánh khác
   */
  async copyPriceList(data: { fromBranchId: string; toBranchId: string; updatedBy?: string }) {
    const { fromBranchId, toBranchId, updatedBy } = data;
    this.logger.log(`Copying price list from branch ${fromBranchId} to ${toBranchId}`);

    if (fromBranchId === toBranchId) {
      throw new RpcException({ message: 'Chi nhánh nguồn và đích không được trùng nhau', statusCode: 400 });
    }

    const sourcePrices = await this.priceListModel.find({ branchId: fromBranchId }).exec();
    if (sourcePrices.length === 0) {
      throw new RpcException({ message: 'Chi nhánh nguồn chưa có bảng giá nào', statusCode: 404 });
    }

    let copied = 0;
    for (const sp of sourcePrices) {
      await this.priceListModel.findOneAndUpdate(
        { branchId: toBranchId, medicineId: sp.medicineId },
        {
          $set: {
            retailPrice: sp.retailPrice,
            wholesalePrice: sp.wholesalePrice,
            wholesaleTiers: sp.wholesaleTiers,
            isActive: sp.isActive,
            updatedBy,
          },
          $setOnInsert: { branchId: toBranchId, medicineId: sp.medicineId },
        },
        { upsert: true },
      ).exec();
      copied++;
    }

    return {
      success: true,
      message: `Đã sao chép ${copied} mục bảng giá từ chi nhánh ${fromBranchId} sang ${toBranchId}`,
      copied,
    };
  }

  /**
   * Tổng hợp thống kê bảng giá tất cả chi nhánh
   */
  async getAllBranchPriceSummary() {
    this.logger.log('Getting price summary for all branches');

    const summary = await this.priceListModel.aggregate([
      {
        $group: {
          _id: '$branchId',
          totalItems: { $sum: 1 },
          activeItems: { $sum: { $cond: ['$isActive', 1, 0] } },
          avgRetailPrice: { $avg: '$retailPrice' },
          avgWholesalePrice: { $avg: '$wholesalePrice' },
          lastUpdated: { $max: '$updatedAt' },
        },
      },
      { $sort: { lastUpdated: -1 } },
    ]).exec();

    return summary.map(s => ({
      branchId: s._id,
      totalItems: s.totalItems,
      activeItems: s.activeItems,
      avgRetailPrice: Math.round(s.avgRetailPrice || 0),
      avgWholesalePrice: Math.round(s.avgWholesalePrice || 0),
      lastUpdated: s.lastUpdated,
    }));
  }
}
