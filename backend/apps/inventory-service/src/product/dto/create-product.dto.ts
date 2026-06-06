import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { DrugClassification } from '../product.schema';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  active_ingredient?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  stock?: number;

  @IsEnum(DrugClassification, {
    message: 'Phân loại thuốc không hợp lệ. Vui lòng chọn: PRESCRIPTION_ANTIBIOTIC, PSYCHOTROPIC_SLEEP, hoặc COMMON_SUPPLEMENT',
  })
  @IsNotEmpty({ message: 'Trường drug_classification là bắt buộc' })
  drug_classification: DrugClassification;
}
