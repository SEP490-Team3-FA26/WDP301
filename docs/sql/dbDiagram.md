# Database Diagram cho dự án Pharmacy

Bạn có thể copy toàn bộ đoạn code dưới đây và dán vào [dbdiagram.io](https://dbdiagram.io) để xem và chỉnh sửa sơ đồ ERD trực quan.

```dbml
Project Pharmacy {
  database_type: 'MySQL'
  Note: 'Sơ đồ cơ sở dữ liệu hệ thống nhà thuốc tích hợp AI và Quản lý Kho thông minh'
}

Table medicine_groups [Note: 'Quản lý nhóm thuốc (UC-41)'] {
  id int [pk, increment]
  name varchar
  code varchar
  description text
}

Table suppliers [Note: 'Quản lý nhà cung cấp (UC-46)'] {
  id int [pk, increment]
  name varchar
  code varchar
  phone varchar
  email varchar
  address varchar
  current_debt decimal [Note: 'Công nợ nhà cung cấp (UC-55)']
}

Table employees [Note: 'Quản lý nhân viên chi nhánh (Liên quan UC-24, UC-58)'] {
  id int [pk, increment]
  emp_code varchar
  full_name varchar
  phone varchar
  email varchar
  address text
  start_date date
  status varchar
}

Table accounts [Note: 'Quản lý tài khoản & phân quyền RBAC (UC-58)'] {
  id int [pk, increment]
  employee_id int [ref: - employees.id]
  username varchar
  password_hash varchar
  role varchar
  status varchar
}

Table customers [Note: 'Quản lý khách hàng, tích điểm & lịch sử (UC-10, UC-43)'] {
  id int [pk, increment]
  full_name varchar
  phone varchar
  address varchar
  age int
  customer_group varchar [Note: 'Phân loại khách hàng (Bán lẻ/Sỉ - UC-06, UC-48)']
}

Table medicines [Note: 'Quản lý danh mục thuốc, SKU (UC-40, UC-42, UC-49)'] {
  id int [pk, increment]
  medicine_code varchar [Note: 'Mã vạch / QR Code (UC-42)']
  name varchar
  group_id int [ref: > medicine_groups.id]
  description text
  dosage varchar
  active_ingredient varchar [Note: 'Hoạt chất - Dùng cho AI gợi ý thuốc thay thế (UC-36)']
  origin varchar
}

Table import_batches [Note: 'Phiếu nhập kho (UC-13, UC-14)'] {
  id int [pk, increment]
  import_batch_code varchar
  supplier_id int [ref: > suppliers.id]
  employee_id int [ref: > employees.id]
  total_amount decimal
  note text
  created_at datetime
}

Table import_batch_details [Note: 'Chi tiết lô nhập kho, Lot Tracking (UC-15, UC-23)'] {
  id int [pk, increment]
  batch_id int [ref: > import_batches.id]
  medicine_id int [ref: > medicines.id]
  import_price decimal
  quantity int
  stock_quantity int
  unit varchar
  expiry_date date [Note: 'Hạn sử dụng - Phục vụ AI Cảnh báo tồn kho (UC-32)']
  created_at datetime
}

Table import_invoices [Note: 'Hóa đơn nhập hàng, công nợ NCC (UC-55)'] {
  id int [pk, increment]
  batch_id int [ref: - import_batches.id]
  employee_id int [ref: > employees.id]
  debt_amount decimal
  paid_amount decimal
  total_amount decimal
  note text
  created_at datetime
}

Table stores [Note: 'Tồn kho tổng, thời gian thực (UC-30, UC-37, UC-38)'] {
  id int [pk, increment]
  medicine_id int [ref: - medicines.id]
  stock_quantity int
  basic_unit varchar
  conversion_unit varchar
  conversion_rate int
  origin varchar
}

Table export_batches [Note: 'Phiếu xuất kho, luân chuyển, bán hàng (UC-17, UC-21, UC-01, UC-06)'] {
  id int [pk, increment]
  export_batch_code varchar
  invoice_id int [ref: - export_invoices.id]
  employee_id int [ref: > employees.id]
  type varchar [Note: 'Loại xuất: Bán hàng, Chuyển kho (UC-21)']
  total_amount decimal
  note text
}

Table export_batch_details [Note: 'Chi tiết xuất kho theo FIFO, cảnh báo HSD (UC-16)'] {
  id int [pk, increment]
  batch_id int [ref: > export_batches.id]
  medicine_id int [ref: > medicines.id]
  import_batch_id int [ref: > import_batches.id]
  selling_price decimal [Note: 'Giá bán (UC-47, UC-48)']
  quantity int
  expiry_date date
}

Table export_invoices [Note: 'Hóa đơn xuất hàng, thanh toán (UC-03, UC-07, UC-12)'] {
  id int [pk, increment]
  export_code varchar
  employee_id int [ref: > employees.id]
  type varchar
  batch_id int 
  note text
}

Table sale_stocks [Note: 'Tồn kho tại quầy để bán lẻ (UC-30)'] {
  id int [pk, increment]
  medicine_id int [ref: > medicines.id]
  export_batch_detail_id int [ref: - export_batch_details.id]
  selling_price decimal
  quantity int
  remaining_quantity int
  expiry_date date
}

Table sample_prescriptions [Note: 'Đơn thuốc mẫu, AI gợi ý lâm sàng (UC-05, UC-36)'] {
  id int [pk, increment]
  name varchar
  symptom varchar
  target_user varchar
  note text
}

Table sample_prescription_details [Note: 'Chi tiết đơn thuốc mẫu'] {
  id int [pk, increment]
  prescription_id int [ref: > sample_prescriptions.id]
  medicine_id int [ref: > medicines.id]
  quantity int
  days int
  daily_usage int
  dosage varchar
}

Table doctor_prescriptions [Note: 'Đơn thuốc của bác sĩ (Quét QR - UC-04)'] {
  id int [pk, increment]
  name varchar
  doctor varchar
  doctor_address varchar
  symptom varchar
  diagnosis varchar
  target_user varchar
  note text
}
```
