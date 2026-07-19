import { IsArray, IsString, IsOptional, IsIn, IsNotEmpty } from 'class-validator';

export class AutoRoutePoDto {
  @IsArray()
  @IsNotEmpty()
  items: any[];

  @IsArray()
  @IsNotEmpty()
  prIds: string[];

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class ApprovePayPoDto {
  @IsString()
  @IsNotEmpty()
  poId: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  paymentType?: string;
}

export class RejectPoDeliveryDto {
  @IsString()
  @IsNotEmpty()
  poId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReceivePoDto {
  @IsString()
  @IsNotEmpty()
  receivedBy: string;
}
