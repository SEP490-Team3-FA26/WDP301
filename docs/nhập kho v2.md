# TÀI LIỆU NGHIỆP VỤ: QUY TRÌNH CHUỖI CUNG ỨNG TẬP TRUNG (FINAL VERSION)
**Mô đun:** Quản lý Kho thông minh & Mua hàng (WMS & Procurement)
**Mô hình vận hành:** Centralized (Quản lý tập trung) - Separation of Duties (Tách biệt quyền hạn)
**Logic Dữ liệu:** 1 Thuốc fix cứng với 1 Nhà cung cấp (NCC) mặc định. 1 NCC có thể cung cấp nhiều loại thuốc.

## 📌 Tổng quan Hệ thống
Hệ thống vận hành theo kiến trúc Chuỗi cung ứng tập trung, chia làm 2 luồng xử lý:
1. **Luồng Tiêu Chuẩn (Standard Flow):** Xử lý nhập hàng định kỳ, gom mọi nhu cầu (từ Chi nhánh và từ định mức Kho Tổng) thành một đợt mua hàng lớn để tối ưu vận hành.
2. **Luồng Khẩn Cấp (Urgent Flow):** Xử lý cấp cứu tồn kho hỏa tốc cho chi nhánh khi có biến động/dịch bệnh.

---

## 📦 LUỒNG 1: QUY TRÌNH NHẬP HÀNG TIÊU CHUẨN (STANDARD FLOW)

### BƯỚC 1: PHÁT SINH NHU CẦU & GOM ĐƠN (Tại Kho Tổng)
* **Nguồn phát sinh nhu cầu:** 
    1. Các chi nhánh cơ sở gửi Phiếu yêu cầu (PR) lên hệ thống.
    2. Kho Tổng tự rà soát thấy một số mặt hàng chạm ngưỡng tồn kho tối thiểu.
* **Hành động nghiệp vụ (Add to cart):** 
    * Quản lý Kho/Thủ kho mở màn hình Tổng quan, tiếp nhận toàn bộ các nhu cầu trên.
    <!-- * Thủ kho nhập số lượng cần mua và dùng nút **"Add to Cart"** để gom tất cả các loại thuốc này vào chung 1 "Phiếu Đề Xuất Tổng".  -->
    * Bấm gửi yêu cầu lên Headquarter.

### BƯỚC 2: HỆ THỐNG TỰ ĐỘNG TÁCH ĐƠN (Auto-Routing)
* **Logic Dữ liệu cốt lõi:** Trong Database, mỗi loại thuốc đã được cấu hình liên kết sẵn với 1 Nhà cung cấp mặc định (`default_supplier_id`). 
* **Xử lý Backend:** Ngay khi Thủ kho gửi "Phiếu Đề Xuất Tổng", hệ thống dựa vào trường `default_supplier_id` để tự động gộp nhóm (`Group By`) các mặt hàng cùng chung một hãng.
* **Kết quả:** Phiếu Tổng khổng lồ được tự động tách thành các Đơn đặt hàng nháp (Draft PO) phân loại rành mạch theo từng Nhà cung cấp (Ví dụ: 1 đơn cho Imexpharm, 1 đơn cho Dược Hậu Giang).

### BƯỚC 3: PHÊ DUYỆT & THANH TOÁN (Tại Màn hình Admin / Headquarter)
* **Vai trò thực hiện:** Giám đốc Chuỗi / Admin (Người cầm dòng tiền).
* **Hành động nghiệp vụ:**
    * Admin vào danh sách các Đơn đặt hàng (PO) đã được hệ thống tách sẵn theo từng NCC.
    * Xem xét số lượng, tổng tiền. Nếu đồng ý, Admin bấm "Phê duyệt & Thanh toán" cho từng đơn.
    * Lệnh thanh toán được ghi nhận, hệ thống tự động gửi PO chính thức cho phía NCC để yêu cầu giao hàng.
* **Trạng thái:** Các đơn PO chuyển sang trạng thái `SHIPPING` (Đang vận chuyển). Tồn kho vật lý lúc này **chưa thay đổi**.

### BƯỚC 4: KIỂM KHO & NHẬP VẬT LÝ (Tại Kho Tổng - Logic All-or-Nothing)
* **Vai trò thực hiện:** Thủ kho (Người cầm hàng hóa).
* **Hành động nghiệp vụ:** Xe tải của NCC chở hàng tới. Thủ kho mở app, tìm đúng mã đơn đang ở trạng thái `SHIPPING` để kiểm đếm thực tế (chất lượng, số lượng, hàng thật/giả).
* **Phân nhánh Logic xử lý:**
    * **Kịch bản A (Thành công 100%):** Hàng đúng hợp đồng. Thủ kho bắt buộc nhập **Số Lô (Batch No.)** và **Hạn sử dụng (Expiry Date)** $\rightarrow$ Bấm "Xác nhận". Hệ thống tạo phiếu GRN, sinh ra Lô Thuốc (`medicinebatches`), **CỘNG TĂNG** tồn kho. PO chuyển thành `COMPLETED`.
    * **Kịch bản B (Từ chối Toàn bộ):** Phát hiện hàng lỗi, móp méo, thiếu số lượng, sai date. Thủ kho bấm "Từ chối nhận hàng" kèm lý do. Trả toàn bộ hàng về. Đơn PO chuyển sang `RETURNED`. **KHÔNG cộng tồn kho**. Admin sẽ nhận thông báo để đòi hoàn tiền từ NCC.

---

## 🚨 LUỒNG 2: CẤP CỨU TỒN KHO HỎA TỐC (URGENT FLOW)

### BƯỚC 1: Phát lệnh Khẩn cấp (Tại Chi nhánh)
* **Thao tác:** Chi nhánh hết thuốc đột xuất (VD: do dịch bệnh). Quản lý chi nhánh tạo PR gửi **thẳng lên Headquarter**, bỏ qua luồng gom đơn của Kho Tổng.
* **Đặc điểm:** Bắt buộc tick vào checkbox **"🔥 Hỏa Tốc"** và ghi rõ lý do.

### BƯỚC 2: Hiển thị Ưu tiên (Tại Admin)
* **Hành động:** Hệ thống đẩy đơn Hỏa tốc lên **Top 1** danh sách chờ duyệt, giao diện bôi đỏ chót và phát chuông cảnh báo liên tục.
* **Xử lý Điều phối Nhanh:**
    * **Nếu Kho Tổng còn hàng:** Admin duyệt, tạo "Lệnh Xuất Kho Khẩn". Thủ kho phải dừng mọi việc khác, nhặt hàng và book xe giao ngay xuống chi nhánh.
    * **Nếu Kho Tổng hết hàng:** Admin dùng quyền hạn trực tiếp liên hệ NCC để đặt giao hỏa tốc thẳng về chi nhánh trong ngày.