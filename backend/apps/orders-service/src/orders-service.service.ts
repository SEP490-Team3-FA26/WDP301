import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { PayOS } from '@payos/node';
import { Order } from './schemas/order.schema';

@Injectable()
export class OrdersServiceService implements OnModuleInit {
  private readonly logger = new Logger(OrdersServiceService.name);
  private payos: PayOS;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    private readonly configService: ConfigService,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');
    
    this.logger.log(`Initializing PayOS client with client ID: ${clientId ? 'FOUND' : 'MISSING'}`);
    this.payos = new PayOS({ clientId, apiKey, checksumKey });
  }

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.sale.create');
    await this.inventoryClient.connect();
  }

  async createOrder(data: any) {
    this.logger.log(`Creating order in DB. PaymentMethod: ${data.paymentMethod}`);

    // Generate a unique 64-bit int order code for PayOS
    const orderCode = Math.floor(100000 + Math.random() * 90000000);

    const newOrder = new this.orderModel({
      orderCode,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      shippingAddress: data.shippingAddress || 'Mua tại quầy',
      items: data.items,
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod || 'QR_PAY',
      paymentStatus: 'PENDING',
      type: data.type || 'ONLINE',
    });

    if (data.paymentMethod === 'QR_PAY') {
      try {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
        
        // Clean description to avoid PayOS validation error (alphanumeric, no spaces, max 25 chars)
        const description = `WDP${orderCode}`.substring(0, 25);

        const paymentBody = {
          orderCode,
          amount: data.totalAmount,
          description,
          items: data.items.map((it: any) => ({
            name: it.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 20), // remove vietnamese tones & limit length
            quantity: it.quantity,
            price: it.price,
          })),
          returnUrl: `${frontendUrl}/customer/checkout?success=true&orderCode=${orderCode}`,
          cancelUrl: `${frontendUrl}/customer/checkout?cancel=true&orderCode=${orderCode}`,
        };

        this.logger.log(`Calling PayOS with orderCode: ${orderCode}`);
        const paymentLinkRes = await this.payos.paymentRequests.create(paymentBody);

        newOrder.payosPaymentLinkId = paymentLinkRes.paymentLinkId;
        await newOrder.save();

        return {
          success: true,
          orderCode,
          paymentMethod: 'QR_PAY',
          checkoutUrl: paymentLinkRes.checkoutUrl,
          order: newOrder,
        };
      } catch (err) {
        this.logger.error('Error creating PayOS payment link:', err);
        throw new RpcException({ message: `Lỗi tạo link thanh toán PayOS: ${err.message}` });
      }
    } else {
      // CASH or CARD: Complete order instantly
      newOrder.paymentStatus = 'PAID';
      await newOrder.save();

      // Deduct inventory and record sale
      try {
        const saleRes = await this.deductInventory(newOrder);
        return {
          success: true,
          orderCode,
          paymentMethod: data.paymentMethod,
          order: newOrder,
          saleResult: saleRes,
        };
      } catch (err) {
        this.logger.error('Error deducting inventory:', err);
        // Save with warning
        return {
          success: true,
          orderCode,
          paymentMethod: data.paymentMethod,
          order: newOrder,
          warning: `Đơn hàng đã lưu nhưng trừ kho thất bại: ${err.message}`,
        };
      }
    }
  }

  async checkPaymentStatus(orderCode: number) {
    this.logger.log(`Checking payment status for orderCode: ${orderCode}`);
    const order = await this.orderModel.findOne({ orderCode }).exec();
    if (!order) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng với mã: ${orderCode}` });
    }

    if (order.paymentStatus === 'PAID') {
      return { success: true, status: 'PAID', order };
    }

    try {
      this.logger.log(`Querying PayOS for details of order: ${orderCode}`);
      const paymentInfo = await this.payos.paymentRequests.get(orderCode);

      this.logger.log(`PayOS status for ${orderCode}: ${paymentInfo.status}`);
      if (paymentInfo.status === 'PAID') {
        order.paymentStatus = 'PAID';
        await order.save();

        // Deduct inventory
        const saleRes = await this.deductInventory(order);
        return { success: true, status: 'PAID', order, saleResult: saleRes };
      } else if (paymentInfo.status === 'CANCELLED') {
        order.paymentStatus = 'CANCELLED';
        await order.save();
        return { success: true, status: 'CANCELLED', order };
      }

      return { success: true, status: 'PENDING', order };
    } catch (err) {
      this.logger.error(`Error querying PayOS for ${orderCode}:`, err);
      // Return pending if transaction is not found or fails
      return { success: true, status: 'PENDING', order };
    }
  }

  async listOrders() {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  private async deductInventory(order: any) {
    this.logger.log(`Sending stock deduction to inventory-service for orderCode: ${order.orderCode}`);
    const payload = {
      type: order.type === 'ONLINE' ? 'RETAIL' : order.type,
      paymentMethod: order.paymentMethod,
      items: order.items.map((it: any) => ({
        medicineId: it.medicineId,
        quantity: it.quantity,
      })),
      patientName: order.patientName,
      patientPhone: order.patientPhone,
      soldBy: order.type === 'ONLINE' ? 'Khách đặt online' : 'Dược sĩ tại quầy',
    };

    return new Promise((resolve, reject) => {
      this.inventoryClient.send('inventory.sale.create', payload).subscribe({
        next: (res) => resolve(res),
        error: (err) => reject(err),
      });
    });
  }
}
