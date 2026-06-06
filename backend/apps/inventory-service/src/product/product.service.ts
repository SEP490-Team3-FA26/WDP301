import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './product.schema';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) {}

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    // Controller is expected to use ValidationPipe to enforce DTO constraints
    // (e.g. drug_classification is required and must be a valid Enum)
    
    // Check if SKU already exists
    const existingProduct = await this.productModel.findOne({ sku: createProductDto.sku });
    if (existingProduct) {
      throw new BadRequestException('Mã SKU đã tồn tại trong hệ thống');
    }

    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }
}
