import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Report extends Document {
  // Mã định danh báo cáo duy nhất (VD: REP-883A2C)
  @Prop({ required: true, unique: true })
  reportCode: string;

  // Tên hiển thị của báo cáo (VD: Báo cáo doanh thu tháng - Chi nhánh 1)
  @Prop({ required: true })
  name: string;

  // Loại báo cáo để phân loại (VD: Doanh thu, Tồn kho, Cảnh báo)
  @Prop({ required: true })
  type: string;

  // Định dạng file xuất ra (VD: PDF, Excel)
  @Prop({ required: true })
  format: string;

  // Dung lượng của file báo cáo (VD: 2.7 KB, 1.5 MB)
  @Prop()
  size: string;

  // Trạng thái hiện tại của quá trình tạo báo cáo (VD: Hoàn thành, Đang tạo, Lỗi)
  @Prop({ required: true })
  status: string;

  // Tên của người dùng/nhân viên đã ấn nút tạo báo cáo
  @Prop({ required: true })
  author: string;

  // Đường dẫn tĩnh (S3 URL) dùng để tải file báo cáo về máy
  @Prop({ required: true })
  downloadUrl: string;

  // Mã chi nhánh sở hữu báo cáo này (Dùng để phân quyền xem báo cáo giữa các chi nhánh)
  @Prop()
  branchId: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
