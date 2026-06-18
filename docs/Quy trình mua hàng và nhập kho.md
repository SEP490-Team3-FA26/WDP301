# TÀI LIỆU NGHIỆP VỤ: QUY TRÌNH CHUỖI CUNG ỨNG TẬP TRUNG (CENTRALIZED SUPPLY CHAIN)
**Phiên bản:** 1.0
**Mô đun:** Quản lý Kho thông minh & Mua hàng (WMS & Procurement)

## 📌 Tổng quan Hệ thống
Quy trình này mô tả luồng nhập hàng khép kín từ lúc phát sinh nhu cầu tại các chi nhánh cơ sở cho đến khi hàng hóa thực tế được cộng vào kho tổng. Quy trình được thiết kế theo chuẩn ERP, chia làm 4 bước tách bạch nhằm đảm bảo tính minh bạch, tối ưu giá vốn và kiểm soát chặt chẽ an toàn y tế (Lô/Hạn sử dụng).

---

## 🔄 Sơ đồ Luồng Tổng Quát (Workflow)
`[Chi nhánh]` **PR** (Đề xuất) $\rightarrow$ `[Headquarter]` **Approval** (Duyệt/Gom đơn) $\rightarrow$ `[Kho vận]` **PO** (Đặt hàng) $\rightarrow$ `[Kho vận]` **GRN** (Nhận hàng & Nhập kho).

---

## 📝 Chi tiết 4 Bước Nghiệp Vụ

### BƯỚC 1: PR - PURCHASE REQUISITION (Yêu cầu mua hàng)
Đây là giai đoạn khởi tạo nhu cầu từ tuyến dưới. Các chi nhánh không có quyền trực tiếp mua hàng từ nhà cung cấp để tránh thất thoát và loạn giá.

* **Vai trò thực hiện:** Quản lý Chi nhánh (Branch Manager) hoặc Hệ thống tự động (Auto-trigger).
* **Hành động nghiệp vụ:**
    * Quản lý chi nhánh xem báo cáo tồn kho tại cơ sở, nhận thấy một số loại thuốc sắp hết (chạm ngưỡng `min_stock_level`).
    * Tạo một phiếu Yêu cầu mua hàng (PR) gửi lên Trụ sở chính (Headquarter).
    * Chỉ định rõ: Tên thuốc, Số lượng xin cấp, Lý do (ví dụ: Chuẩn bị vào mùa dịch cúm).
* **Trạng thái Dữ liệu (Status):** Phiếu PR ở trạng thái `SUBMITTED` (Đã trình duyệt).
* **Tác động Tồn kho:** Không thay đổi.

### BƯỚC 2: APPROVAL & CONSOLIDATION (Duyệt & Gom đơn)
Giai đoạn kiểm soát tài chính và chiến lược mua hàng của doanh nghiệp.

* **Vai trò thực hiện:** Quản lý Kho (Warehouse Manager) và Giám đốc Chuỗi (Headquarter/Admin).
* **Hành động nghiệp vụ:**
    * **Tiếp nhận & Gom đơn (Consolidation):** Quản lý Kho tiếp nhận danh sách PR từ tất cả các chi nhánh. (Ví dụ: Chi nhánh A xin 20 hộp, Chi nhánh B xin 30 hộp $\rightarrow$ Quản lý kho gom thành 1 đề xuất mua 50 hộp).
    * **Kiểm tra chéo:** Quản lý Kho kiểm tra xem Kho Tổng còn hàng không. Nếu còn, chuyển sang luồng "Điều chuyển nội bộ" (Quy trình điều chuyển nội bộ sẽ được quy định ở một tài liệu/Use Case riêng). Nếu hết, trình danh sách gom đơn lên Headquarter.
    * **Phê duyệt:** Headquarter (Admin/CEO) xem xét đề xuất từ Quản lý Kho và bấm "Phê duyệt" lệnh nhập thuốc.
* **Trạng thái Dữ liệu:** Lệnh gom được Headquarter duyệt chuyển thành `APPROVED`. Thông tin được đẩy lại cho bộ phận Kho vận để tiến hành đặt hàng (PO).
* **Tác động Tồn kho:** Không thay đổi.

### BƯỚC 3: PO - PURCHASE ORDER (Đơn đặt hàng)
Bắt đầu giao dịch với đối tác bên ngoài (Nhà cung cấp/Hãng dược). 

* **Vai trò thực hiện:** Quản lý Kho (Kho Vận).
* **Hành động nghiệp vụ:**
    * Tiếp nhận lệnh đã duyệt từ Headquarter.
    * Tạo Đơn đặt hàng (PO) trên hệ thống. Chọn **Nhà cung cấp** phù hợp (Ví dụ: Dược Hậu Giang, Imexpharm).
    * Hệ thống chốt danh sách: Loại thuốc, Số lượng đặt, Đơn giá nhập thỏa thuận.
    * Xuất file/In PO gửi cho đối tác qua Email hoặc Zalo.
* **Ràng buộc Dữ liệu:** Lúc này hàng chưa về, nên **chưa có Số lô và Hạn sử dụng**.
* **Trạng thái Dữ liệu:** PO được tạo mới và nằm ở trạng thái `PENDING` (Đang chờ giao hàng).
* **Tác động Tồn kho:** * Tồn kho thực tế (Physical Stock): KHÔNG thay đổi.
    * Hàng dự kiến về (Pipeline/Incoming Stock): Tăng lên (Giúp sale biết sắp có hàng để nhận cọc khách).

### BƯỚC 4: GRN - GOODS RECEIPT NOTE (Phiếu nhập kho) - [Use Case 13]
Giai đoạn thực thi vật lý. Hàng hóa thực sự đến cửa kho. Đây là chốt chặn quan trọng nhất để bảo vệ chất lượng dữ liệu của hệ thống.

* **Vai trò thực hiện:** Quản lý Kho / Thủ kho.
* **Hành động nghiệp vụ:**
    * Xe tải chở hàng tới. Thủ kho mở màn hình quản lý PO, tìm đơn đang `PENDING` và bấm "Nhận hàng".
    * Hệ thống bật Popup Form Tạo GRN (Phiếu Nhập Kho).
    * Thủ kho tiến hành đếm số lượng thực tế và **BẮT BUỘC** nhập 2 thông số trên vỏ hộp:
        1.  `Số Lô (Lot/Batch Number)`
        2.  `Hạn sử dụng (Expiry Date)`
    * *(Hệ thống hỗ trợ quét Barcode để tìm nhanh SKU).*
    * Bấm "Xác nhận nhận hàng & Nhập kho".
* **Trạng thái Dữ liệu & Xử lý Backend (Transaction):**
    1.  Tạo chứng từ GRN lưu trữ lịch sử nhận hàng.
    2.  Đổi trạng thái PO từ `PENDING` thành `COMPLETED` (Hoặc `PARTIAL` nếu nhà cung cấp giao thiếu).
    3.  Khởi tạo dòng dữ liệu mới trong bảng **Lô Thuốc (`medicinebatches`)**.
    4.  Ghi log vào nhật ký biến động kho (`inventory_transaction`).
* **Tác động Tồn kho:** Tồn kho thực tế (Current Quantity) chính thức **TĂNG LÊN**. Thuật toán FEFO bắt đầu theo dõi hạn sử dụng của Lô hàng này.

---

## ⚠️ Các Ngoại Lệ Cần Lưu Ý (Edge Cases)
1. **Giao thiếu hàng (Partial Delivery):** - Đặt 100 hộp, giao 80 hộp. GRN ghi nhận 80. Trạng thái PO sẽ là `PARTIAL_RECEIVED`. Tồn kho chỉ cộng 80.
2. **Hàng giao cận date:**
   - Khi Thủ kho nhập HSD vào form GRN, nếu HSD còn dưới 3 tháng, hệ thống cần bật Popup Cảnh Báo màu đỏ báo cho Quản lý kho quyết định có nhận lô hàng này hay yêu cầu nhà cung cấp đổi trả.