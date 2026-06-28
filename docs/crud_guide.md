# Hướng Dẫn Phát Triển CRUD Quy Chuẩn (CRUD Implementation Playbook)

## Kiến Trúc Microservices: API Gateway + Kafka + Redis + MongoDB

Tài liệu này là **"công thức nấu ăn" (Recipe Book)** dành cho đội ngũ phát triển (Dev Team) để triển khai đồng bộ các tác vụ CRUD (Create, Read, Update, Delete) trên hệ thống.

không đuơợc su dung api truc tiep trong code


Mọi Entity mới (ví dụ: `Product`, `Order`, `Inventory`...) khi được phát triển cần tuân thủ tuyệt đối cấu trúc và luồng xử lý chuẩn hóa dưới đây.

---

## 1. Luồng Giao Tiếp Chuẩn Cho Các Tác Vụ (CRUD Standard Protocols)

| Tác vụ (Operation)                  | Giao thức truyền thông                                    | Cơ chế Cache (Redis)                                                                         |
| :------------------------------------ | :----------------------------------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Create (Tạo mới)**          | Event-Driven (Gateway `emit` -> Kafka -> Microservice)     | Chủ động cập nhật cache hoặc đợi đọc lần đầu.                                     |
| **Read One (Đọc chi tiết)**  | Request-Response (Gateway `send` -> Kafka -> Microservice) | **Cache-Aside:** Kiểm tra Redis trước. Nếu Miss, gọi DB rồi lưu Redis.            |
| **Read All (Đọc danh sách)** | Request-Response (Gateway `send` -> Kafka -> Microservice) | Thường truy vấn DB trực tiếp hoặc Cache ngắn hạn (TTL ngắn) cho danh sách.           |
| **Update (Cập nhật)**         | Event-Driven (Gateway `emit` -> Kafka -> Microservice)     | **Cache Eviction:** Xóa hoặc ghi đè cache cũ trên Redis để đồng bộ dữ liệu. |
| **Delete (Xóa)**               | Event-Driven (Gateway `emit` -> Kafka -> Microservice)     | **Cache Eviction:** Xóa hẳn key cache tương ứng khỏi Redis.                        |

---

## 2. Mã Nguồn Mẫu Chuẩn Hóa (Entity: `Product`)

Dưới đây là mã nguồn mẫu quy chuẩn cho một Entity tên là `Product`. Dev Team có thể thay thế cụm từ `Product` bằng bất kỳ Entity nào khác (`Order`, `User`, `Voucher`...) để phát triển.

### PHẦN 1: TRIỂN KHAI PHÍA API GATEWAY (`apps/api-gateway`)

Phía API Gateway chịu trách nhiệm tiếp nhận HTTP Request từ client, quản lý bộ nhớ đệm (Redis Cache) và giao tiếp với Kafka.

1. Controller API Gateway (`product.controller.ts`)

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, HttpStatus, HttpCode } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/products')
export class ProductController implements OnModuleInit {
  private readonly CACHE_TTL = 3600000; // 1 giờ (tính bằng mili-giây)

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Đăng ký nhận phản hồi từ các topic Request-Response đồng bộ
  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'product.get.by.id',
      'product.get.all',
    ]);
  }

  // ==========================================
  // CREATE (Tạo mới) - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createProduct(@Body() dto: { name: string; price: number; stock: number }) {
    // Bắn event không chặn (Non-blocking)
    this.kafkaClient.emit('product.event.create', JSON.stringify(dto));
  
    return {
      status: 'Accepted',
      message: 'Sự kiện tạo sản phẩm đã được gửi vào hàng đợi Kafka để xử lý!',
    };
  }

  // ==========================================
  // READ ONE (Lấy chi tiết) - Đồng bộ + Cache Layer
  // ==========================================
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    const cacheKey = `product:${id}`;

    // 1. Kiểm tra cache trong Redis
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ [Cache Hit] Lấy sản phẩm ${id} từ Redis`);
      return cachedData;
    }

    console.log(`❌ [Cache Miss] Lấy sản phẩm ${id} qua Kafka -> Database`);
  
    // 2. Gọi qua Kafka sang Microservice nếu cache miss
    const product = await sendKafkaMessage(this.kafkaClient, 'product.get.by.id', id);

    if (product) {
      // 3. Set Cache ngược lại vào Redis để phục vụ lần sau
      await this.cacheManager.set(cacheKey, product, this.CACHE_TTL);
    }
    return product;
  }

  // ==========================================
  // READ ALL (Lấy danh sách) - Đồng bộ
  // ==========================================
  @Get()
  async getAllProducts() {
    // Với danh sách động, nên query DB trực tiếp qua Kafka để đảm bảo chính xác phân trang/lọc
    return await sendKafkaMessage(this.kafkaClient, 'product.get.all', {});
  }

  // ==========================================
  // UPDATE (Cập nhật) - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    const payload = { id, data: dto };
  
    // 1. Gửi event cập nhật cho Microservice xử lý DB
    this.kafkaClient.emit('product.event.update', JSON.stringify(payload));

    // 2. Chủ động xóa cache cũ trên Redis ngay lập tức tránh bất nhất dữ liệu
    await this.cacheManager.del(`product:${id}`);
  
    return {
      status: 'Accepted',
      message: 'Yêu cầu cập nhật sản phẩm đang được xử lý ngầm!',
    };
  }

  // ==========================================
  // DELETE (Xóa) - Bất đồng bộ (Event-Driven)
  // ==========================================
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    // 1. Gửi event xóa
    this.kafkaClient.emit('product.event.delete', id);

    // 2. Xóa Cache ngay lập tức trên Redis
    await this.cacheManager.del(`product:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu xóa sản phẩm đã được tiếp nhận!',
    };
  }
}
```

---

### PHẦN 2: TRIỂN KHAI PHÍA MICROSERVICE (`apps/products-service`)

Phía Microservice chịu trách nhiệm tương tác trực tiếp với Database (MongoDB), lắng nghe sự kiện từ Kafka và phản hồi dữ liệu.

#### 1. Controller Microservice (`product-ms.controller.ts`)

```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { ProductMsService } from './product-ms.service';

@Controller()
export class ProductMsController {
  constructor(private readonly productService: ProductMsService) {}

  // =========================================================================
  // CONSUME EVENTS (Các tác vụ Ghi - Dùng EventPattern của cơ chế emit())
  // Cơ chế này nhận các sự kiện bất đồng bộ một chiều (Fire-and-Forget), 
  // không cần trả về bất kỳ kết quả nào cho API Gateway.
  // =========================================================================
  
  // Lắng nghe sự kiện tạo sản phẩm mới
  @EventPattern('product.event.create')
  async handleProductCreate(@Payload() data: string) {
    // Vì Kafka truyền chuỗi, cần chuyển đổi ngược từ JSON String sang Object
    const dto = JSON.parse(data);
    
    // Gọi tầng Service để ghi trực tiếp xuống Database MongoDB
    await this.productService.create(dto);
    console.log('✅ [Microservice] Đã tạo thành công sản phẩm mới trong Database!');
  }

  // Lắng nghe sự kiện cập nhật sản phẩm
  @EventPattern('product.event.update')
  async handleProductUpdate(@Payload() payload: string) {
    // Phân rã dữ liệu bao gồm ID sản phẩm và cụm thông tin mới cần cập nhật
    const { id, data } = JSON.parse(payload);
    
    // Cập nhật dữ liệu trong MongoDB
    await this.productService.update(id, data);
    console.log(`✅ [Microservice] Đã cập nhật thành công sản phẩm ${id} trong Database!`);
  }

  // Lắng nghe sự kiện xóa sản phẩm
  @EventPattern('product.event.delete')
  async handleProductDelete(@Payload() id: string) {
    // Xóa sản phẩm khỏi MongoDB
    await this.productService.delete(id);
    console.log(`✅ [Microservice] Đã xóa thành công sản phẩm ${id} khỏi Database!`);
  }

  // =========================================================================
  // CONSUME MESSAGES (Các tác vụ Đọc - Dùng MessagePattern của cơ chế send())
  // Cơ chế này nhận yêu cầu và BẮT BUỘC phải return về kết quả để NestJS 
  // tự động gửi trả lại cho API Gateway qua Reply Topic.
  // =========================================================================

  // Lắng nghe yêu cầu lấy chi tiết một sản phẩm theo ID
  @MessagePattern('product.get.by.id')
  async getProductById(@Payload() id: string) {
    // Tìm kiếm trong DB và return kết quả (kết quả này sẽ được gửi về Gateway)
    return this.productService.findById(id);
  }

  // Lắng nghe yêu cầu lấy toàn bộ danh sách sản phẩm
  @MessagePattern('product.get.all')
  async getAllProducts() {
    // Lấy toàn bộ danh sách sản phẩm trong DB và return
    return this.productService.findAll();
  }
}
```

#### 2. Service Microservice (`product-ms.service.ts`)

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './product.schema';

@Injectable()
export class ProductMsService {
  // Inject Model Mongoose để thực hiện các câu lệnh thao tác với cơ sở dữ liệu MongoDB
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  // Logic nghiệp vụ: Tạo mới và lưu sản phẩm vào Database
  async create(data: any): Promise<Product> {
    const newProduct = new this.productModel(data);
    return newProduct.save(); // Mongoose tự động tạo ObjectId _id và lưu
  }

  // Logic nghiệp vụ: Tìm kiếm chi tiết sản phẩm theo ID trong Database
  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    
    // Nếu không tìm thấy, ném ngoại lệ NotFoundException
    if (!product) {
      throw new NotFoundException(`Product với ID ${id} không tồn tại!`);
    }
    return product;
  }

  // Logic nghiệp vụ: Lấy toàn bộ bản ghi sản phẩm
  async findAll(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  // Logic nghiệp vụ: Cập nhật thông tin sản phẩm theo ID
  async update(id: string, data: any): Promise<Product> {
    // $set giúp cập nhật đúng các trường truyền vào, { new: true } trả về dữ liệu MỚI sau cập nhật
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    
    if (!updatedProduct) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id} để cập nhật!`);
    }
    return updatedProduct;
  }

  // Logic nghiệp vụ: Xóa sản phẩm khỏi hệ thống
  async delete(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    
    if (!result) {
      throw new NotFoundException(`Không tìm thấy sản phẩm ${id} để xóa!`);
    }
  }
}
```

---

## 3. Các Quy Tắc An Toàn Dành Cho Dev Team (Safety Rules)

> [!WARNING]
> **1. Quy tắc nhất quán Cache (Cache Consistency):**
> Luôn luôn thực hiện xóa Cache (`cacheManager.del`) ngay tại API Gateway khi phát ra sự kiện `Update` hoặc `Delete`. Việc giữ lại cache cũ sẽ khiến Client đọc phải thông tin sai lệch (Stale Data).

> [!IMPORTANT]
> **2. Ép kiểu dữ liệu qua Kafka:**
> Kafka chỉ truyền dữ liệu ở dạng chuỗi (String/Buffer). Khi phát ra sự kiện (`emit` / `send`), hãy luôn sử dụng `JSON.stringify(payload)`. Phía Microservice nhận vào cần parse ngược lại `JSON.parse(data)` để sử dụng.

> [!TIP]
> **3. Đặt tên Topic quy chuẩn:**
> Đặt tên topic thống nhất theo cấu trúc:
>
> * Đối với sự kiện (Event-Driven): `{entity}.event.{action}` (Ví dụ: `order.event.created`).
> * Đối với truy vấn (Request-Response): `{entity}.get.{query}` (Ví dụ: `order.get.by.id`).
