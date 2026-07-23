# UC-53: Báo cáo Lợi Nhuận (Profit Report) - Thiết Kế Theo FEFO

Tài liệu này mô tả chi tiết phương pháp tính toán lợi nhuận gộp chính xác theo nguyên tắc xuất kho **FEFO (First Expired, First Out - Hết hạn trước, xuất trước)** và kế hoạch triển khai cho dự án.

---

## 1. Khảo Sát Hiện Trạng Dự Án (Current Project Analysis)

Qua rà soát mã nguồn thực tế của dự án, em nhận thấy hệ thống đã có sẵn nền tảng rất tốt để tính toán lợi nhuận chính xác theo từng lô thuốc:

1. **Quy trình xuất kho FEFO đã được triển khai:**
   * Trong hàm [SalesService.createSalesOrder](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/sales.service.ts#L208), khi dược sĩ tạo đơn bán lẻ/bán sỉ, hệ thống tự động tìm các lô thuốc còn hạn và sắp xếp theo thứ tự `expDate: 1` (hạn dùng tăng dần) để trừ kho trước.
2. **Thông tin số lô bán ra đã được lưu vết:**
   * Schema [SalesOrder](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/sales/schemas/sales-order.schema.ts#L31) lưu trữ danh sách các lô thuốc tương ứng với từng mặt hàng bán ra thông qua mảng `batches` kiểu `SalesOrderBatchItem` (`batchNo`, `quantity`).
3. **Giá vốn nhập đã có trong Goods Receipt Note (GRN):**
   * Khi thủ kho tạo phiếu nhập kho, schema [GoodsReceiptNoteItem](file:///d:/Nam%204_NTD/Ki_8/Project/wdp301-rbl-project-wdp_se18d08_group-7/backend/apps/inventory-service/src/purchase/schemas/goods-receipt-note.schema.ts#L19) ghi nhận rõ trường `unitPrice` (giá vốn nhập của lô hàng đó).

### ⚠️ Điểm Nghẽn / Thiếu Sót Hiện Tại:
* Schema `MedicineBatch` và `SalesOrderBatchItem` chưa lưu trữ trường **Giá vốn nhập (`importPrice`)**. Do đó, tại thời điểm bán hàng, đơn hàng không ghi nhận trực tiếp giá vốn của lô đó, và nếu muốn tính lợi nhuận sẽ phải thực hiện truy vấn ngược (query join) rất nặng tới bảng `goodsreceiptnotes` dựa trên `batchNo` và `medicineId`.

---

## 2. Hướng Giải Quyết Tối Ưu (Proposed Solution)

Để giải quyết triệt để và tối ưu hiệu năng cơ sở dữ liệu MongoDB, em đề xuất áp dụng giải pháp **Denormalization (Phi chuẩn hóa)**: Lưu trữ trực tiếp giá vốn nhập vào lô thuốc và hóa đơn bán hàng tại thời điểm phát sinh giao dịch.

### A. Công thức tính lợi nhuận gộp theo từng dòng đơn hàng
$$\text{Lợi nhuận gộp sản phẩm} = (\text{Giá bán} - \text{Giá vốn nhập của Lô thuốc xuất}) \times \text{Số lượng bán}$$

*Nếu sản phẩm bán ra được trích từ nhiều lô khác nhau (ví dụ bán 15 hộp: 10 hộp từ Lô A giá vốn 20k, 5 hộp từ Lô B giá vốn 22k), lợi nhuận gộp của sản phẩm đó sẽ bằng:*
$$\text{Lợi nhuận gộp} = (15 \times \text{Giá bán}) - (10 \times 20.000 + 5 \times 22.000)$$

### B. Thay đổi Schema Cơ sở dữ liệu
1. **Schema `MedicineBatch`:** Bổ sung trường `importPrice` (Giá vốn nhập của lô).
2. **Schema `SalesOrderBatchItem` (thuộc `SalesOrder`):** Bổ sung trường `importPrice` (Giá vốn nhập tại thời điểm bán) để đóng băng giá trị lịch sử, phục vụ tính toán lợi nhuận gộp tức thời mà không cần truy vấn bảng khác.

---

## 3. Kế Hoạch Triển Khai Chi Tiết (Implementation Plan)

### Bước 1: Cập nhật Schema & Logic Nhập Kho (Backend - Purchase Service)
* **File sửa đổi:**
  * `backend/apps/inventory-service/src/medicine/schemas/medicine-batch.schema.ts`
  * `backend/apps/inventory-service/src/purchase/purchase.service.ts`
* **Nghiệp vụ:**
  * Thêm trường `importPrice` vào schema `MedicineBatch`.
  * Trong hàm `createGoodsReceiptNote` của `PurchaseService`, khi lưu/tạo mới `MedicineBatch`, gán `importPrice = item.unitPrice` (giá nhập từ GRN).

### Bước 2: Cập nhật Logic Bán Hàng & Lưu vết Lô thuốc xuất (Backend - Sales Service)
* **File sửa đổi:**
  * `backend/apps/inventory-service/src/sales/schemas/sales-order.schema.ts`
  * `backend/apps/inventory-service/src/sales/sales.service.ts`
* **Nghiệp vụ:**
  * Thêm trường `importPrice` vào `SalesOrderBatchItem` schema.
  * Trong hàm `createSalesOrder` của `SalesService`, tại vòng lặp trừ kho FEFO, đọc `importPrice` của lô đang xuất từ database và lưu vào mảng `allocatedBatches` của hóa đơn bán lẻ/sỉ.

### Bước 3: Phát triển API Báo cáo Lợi nhuận (Backend - API Gateway & Kafka)
* **File sửa đổi:**
  * `backend/apps/api-gateway/src/controllers/report.controller.ts`
  * `backend/apps/inventory-service/src/sales/sales.service.ts`
* **Nghiệp vụ:**
  * Viết API `@Get('profit')` trong `ReportController`. API này sẽ gửi message Kafka `inventory.profit.report` sang `inventory-service`.
  * Hàm xử lý ở `inventory-service` sẽ tổng hợp dữ liệu đơn hàng trong khoảng thời gian yêu cầu, tính tổng doanh thu bán ra và tổng chi phí giá vốn (COGS) thực tế dựa trên mảng `batches` trong từng hóa đơn.
  * **Ràng buộc phân quyền:** Chỉ cho phép tài khoản có role `admin` hoặc `head_branch` gọi API này. Nếu user có role khác sẽ trả về lỗi `ForbiddenException` (403).

### Bước 4: Thiết kế & Tích Hợp UI Dashboard cho Admin (Frontend)
* **File sửa đổi:**
  * `frontend/src/pages/admin/Reports.tsx`
  * `frontend/src/components/reports/ProfitAnalyticsDashboard.tsx` (Tạo mới)
* **Nghiệp vụ:**
  * Thêm tab **"Báo cáo Lợi nhuận"** chỉ hiển thị khi `isAdmin === true`.
  * Hiển thị các thẻ KPI: Tổng Doanh số thực tế, Tổng Giá vốn thực tế (COGS), Lợi nhuận gộp và Biên lợi nhuận gộp trung bình của toàn chuỗi.
  * Thiết kế biểu đồ cột nhóm (Grouped Bar Chart) hiển thị song song Doanh số, Giá vốn và Lợi nhuận gộp để Admin thấy rõ tỉ lệ tiền lời.
  * Bảng so sánh đóng góp lợi nhuận và biên lợi nhuận (%) của từng chi nhánh.
  * Tích hợp tính năng Xuất báo cáo PDF/Excel lưu trữ trên S3.
