import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { User } from '../../auth-service/src/auth/user.schema';
import { Cart } from './schemas/cart.schema';

@Injectable()
export class UserService implements OnModuleInit {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_id');
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_ids');
    
    const retries = 20;
    const delay = 3000;
    for (let i = 0; i < retries; i++) {
      try {
        await this.inventoryClient.connect();
        this.logger.log('Successfully connected ClientKafka for INVENTORY_SERVICE');
        return;
      } catch (err: any) {
        if (i === retries - 1) {
          this.logger.error('Failed to connect to INVENTORY_SERVICE via Kafka after retries', err);
          throw err;
        }
        this.logger.warn(`Kafka INVENTORY_SERVICE connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        try { await this.inventoryClient.close(); } catch(e) {}
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }


  async editProfile(userId: string, data: { fullName?: string }) {
    this.logger.log(`Editing profile for user ${userId}`);
    
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  async changeAvatar(userId: string, avatarUrl: string) {
    this.logger.log(`Changing avatar for user ${userId}`);
    
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  // --- CART OPERATIONS ---

  async getCart(userId: string) {
    this.logger.log(`Fetching cart for user ${userId}`);
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
      await cart.save();
    }

    if (cart.items.length === 0) {
      return { items: [], totalQuantity: 0 };
    }

    const itemIds = cart.items.map((it) => it.medicineId);
    let medicineDetails: any[] = [];
    
    try {
      medicineDetails = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_ids', { ids: itemIds })
      );
    } catch (err: any) {
      this.logger.error(`Failed to fetch medicine details via Kafka RPC: ${err.message}`);
    }

    const medicineMap = new Map<string, any>(
      medicineDetails.map((med) => [med.id.toString(), med])
    );

    let hasHealed = false;
    const enrichedItems = [];

    for (const item of cart.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) {
        // Auto-healing: Medicine has been deleted from the catalog, so remove it from user's cart
        hasHealed = true;
        continue;
      }

      const priceChanged = med.price !== item.addedPrice;
      const currentStock = med.stock || 0;
      let finalQty = item.quantity;

      // Cap quantity if it exceeds current stock
      if (finalQty > currentStock) {
        finalQty = currentStock;
        hasHealed = true;
      }

      enrichedItems.push({
        id: item.medicineId,
        name: med.name,
        active_ingredient: med.active_ingredient || '',
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Viên',
        price: med.price,
        addedPrice: item.addedPrice,
        priceChanged,
        stock: currentStock,
        quantity: finalQty,
      });

      // Update quantity or pricing in the DB item if adjusted/healed
      item.quantity = finalQty;
    }

    // Filter out items with 0 quantity (out of stock/depleted items capped to 0) or deleted items
    const validItems = cart.items.filter((it, index) => {
      const med = medicineMap.get(it.medicineId);
      return med && it.quantity > 0;
    });

    if (hasHealed) {
      cart.items = validItems as any;
      await cart.save();
    }

    const finalEnrichedItems = enrichedItems.filter((it) => it.stock > 0 && it.quantity > 0);
    const totalQuantity = finalEnrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      items: finalEnrichedItems,
      totalQuantity,
    };
  }

  async addToCart(userId: string, medicineId: string, quantity: number) {
    this.logger.log(`Adding medicine ${medicineId} to cart for user ${userId}`);
    let medicine: any;
    
    try {
      medicine = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId })
      );
    } catch (err: any) {
      return { error: true, message: 'Không tìm thấy thông tin thuốc trên hệ thống', statusCode: 404 };
    }

    if (!medicine) {
      return { error: true, message: 'Thuốc không tồn tại', statusCode: 404 };
    }

    const currentStock = medicine.stock || 0;
    if (currentStock <= 0) {
      return { error: true, message: 'Thuốc hiện tại đã hết hàng', statusCode: 400 };
    }

    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > currentStock) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }
      cart.items[existingIndex].quantity = newQty;
    } else {
      if (quantity > currentStock) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }
      cart.items.push({
        medicineId,
        quantity,
        addedPrice: medicine.price,
      } as any);
    }

    await cart.save();
    return { success: true, message: 'Thêm vào giỏ hàng thành công!' };
  }

  async updateCartItem(userId: string, medicineId: string, quantity: number) {
    this.logger.log(`Updating quantity for medicine ${medicineId} in cart for user ${userId} to ${quantity}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex === -1) {
      return { error: true, message: 'Thuốc không có trong giỏ hàng', statusCode: 404 };
    }

    if (quantity <= 0) {
      cart.items.splice(existingIndex, 1);
      await cart.save();
      return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
    }

    let medicine: any;
    try {
      medicine = await lastValueFrom(
        this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId })
      );
    } catch (err: any) {
      return { error: true, message: 'Không thể kết nối đến kho dữ liệu', statusCode: 500 };
    }

    const currentStock = medicine ? medicine.stock : 0;
    if (quantity > currentStock) {
      return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
    }

    cart.items[existingIndex].quantity = quantity;
    await cart.save();
    return { success: true, message: 'Cập nhật số lượng thành công!' };
  }

  async deleteCartItem(userId: string, medicineId: string) {
    this.logger.log(`Deleting medicine ${medicineId} from cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    cart.items = cart.items.filter((it) => it.medicineId !== medicineId) as any;
    await cart.save();
    return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
  }

  async clearCart(userId: string) {
    this.logger.log(`Clearing cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return { success: true, message: 'Làm trống giỏ hàng thành công!' };
  }
}

