# TÀI LIỆU UML - THÀNH VIÊN: ĐẠT (DEVELOPER)
**Danh sách UCs đã hoàn thành: UC-07, UC-13, UC-30, UC-32, UC-42, UC-43, UC-44, UC-46**

Tài liệu này chứa các luồng nghiệp vụ chi tiết và mã nguồn **PlantUML** cho toàn bộ các UCs đã hoàn thành do Đạt chịu trách nhiệm thiết kế.

---

## 1. UC-13: TẠO PHIẾU NHẬP HÀNG & CHỌN NHÀ CUNG CẤP

### A. Luồng nghiệp vụ
1. Thủ kho/Quản lý chi nhánh lập đề xuất nhập hàng (Purchase Requisition).
2. Lựa chọn nhà cung cấp trong danh bạ liên kết.
3. Nhập số lượng thuốc cần mua, đơn giá thỏa thuận.
4. Gửi yêu cầu mua PO lên hệ thống ở trạng thái chờ duyệt.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Luồng Tạo yêu cầu mua hàng & chọn NCC (UC-13) - Đạt
start
:Thủ kho chọn "Tạo phiếu đề xuất mua hàng (PR)";
:Tìm kiếm và chọn Nhà cung cấp (Supplier) từ danh bạ;
repeat
  :Chọn SKU thuốc cần nhập hàng;
  :Nhập số lượng đề xuất & đơn giá nhập thỏa thuận;
  :Thêm vào danh sách đề xuất;
backward: Chọn tiếp thuốc tiếp theo;
repeat while (Còn thuốc muốn nhập?) is (Có)
:Xem lại tổng số tiền và thông tin NCC;
:Nhấn nút "Gửi yêu cầu mua hàng";
if (Dữ liệu hợp lệ?) then (Có)
  :Hệ thống sinh đơn Purchase Requisition ở trạng thái PENDING;
  :Thông báo "Đã gửi đề xuất mua hàng lên Admin thành công";
else (Không)
  :Báo lỗi trường thông tin thiếu hoặc không hợp lệ;
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tiến trình lập PR chọn NCC (UC-13) - Đạt
autonumber
actor "Thủ kho" as Staff
boundary "Màn hình Lập PR" as UI
control "API Gateway" as Gateway
control "Purchase Service" as PurchaseService
database "MongoDB" as DB

Staff -> UI: Click "Tạo PR mới" & Chọn NCC
activate UI
UI -> Gateway: GET /api/suppliers?search=...
activate Gateway
Gateway -> PurchaseService: getSupplierList(query)
activate PurchaseService
PurchaseService -> DB: Lấy danh bạ nhà cung cấp
DB --> PurchaseService: Mảng danh sách NCC
PurchaseService --> Gateway: Danh sách NCC
deactivate PurchaseService
Gateway --> UI: Hiển thị danh bạ NCC lên dropdown
deactivate Gateway

Staff -> UI: Thêm thuốc, nhập số lượng & bấm "Gửi yêu cầu"
UI -> Gateway: POST /api/purchase-requisitions (prData)
activate Gateway
Gateway -> PurchaseService: createPurchaseRequisition(prData)
activate PurchaseService
PurchaseService -> DB: Lưu PR document mới (status = PENDING_APPROVAL)
DB --> PurchaseService: Lưu thành công
PurchaseService --> Gateway: Trả về chi tiết PR
deactivate PurchaseService
Gateway --> UI: HTTP 201 Created (Phiếu PR tạo thành công)
deactivate Gateway
UI --> Staff: Hiển thị thông báo "Đã gửi phiếu PR chờ duyệt"
deactivate UI
@enduml
```

---

## 2. UC-42: LIÊN KẾT MÃ QR / BARCODE VỚI SKU THUỐC

### A. Luồng nghiệp vụ
1. Admin chọn một thuốc chưa được cấu hình mã vạch.
2. Dùng máy quét hoặc camera quét mã Barcode/QR có sẵn trên vỏ hộp thuốc của nhà sản xuất.
3. Lưu mã quét được và liên kết trực tiếp với mã SKU nội bộ của hệ thống để đồng bộ quét đếm POS / Kiểm kho.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Liên kết mã QR/Barcode với SKU (UC-42) - Đạt
autonumber
actor "Admin / Quản lý" as User
boundary "Màn hình Quản lý SKU" as UI
control "API Gateway" as Gateway
control "Medicine Service" as MedService
database "MongoDB" as DB

User -> UI: Chọn SKU thuốc X cần liên kết mã vạch
activate UI
UI -> UI: Kích hoạt camera quét Barcode/QR
User -> UI: Quét mã vạch thực tế trên vỏ hộp thuốc
UI -> Gateway: POST /api/medicines/:id/link-barcode (barcodeValue)
activate Gateway
Gateway -> MedService: linkBarcodeToSku(id, barcodeValue)
activate MedService
MedService -> DB: Kiểm tra xem mã vạch có bị trùng lặp với SKU khác?
alt Mã vạch bị trùng
  DB --> MedService: Phát hiện trùng lặp
  MedService --> Gateway: Báo lỗi "Mã vạch đã được liên kết với thuốc khác"
  Gateway --> UI: HTTP 400 Bad Request
  UI --> User: Cảnh báo đỏ: "Trùng mã vạch!"
else Mã vạch hợp lệ
  MedService -> DB: Cập nhật trường barcode = barcodeValue cho SKU thuốc X
  DB --> MedService: Thành công
  MedService --> Gateway: Trả về thông báo liên kết thành công
  deactivate MedService
  Gateway --> UI: HTTP 200 OK (Liên kết hoàn tất)
  deactivate Gateway
  UI --> User: Thông báo "Mã vạch đã được liên kết thành công với thuốc"
end
deactivate UI
@enduml
```

---

## 3. UC-07: QUẢN LÝ HẠN MỨC CÔNG NỢ CỦA ĐẠI LÝ (DEBT LIMIT)

### A. Luồng nghiệp vụ
1. Khi có đơn bán sỉ mua nợ, hệ thống kiểm tra số tiền nợ hiện tại cộng với tiền đơn mới.
2. Nếu vượt quá hạn mức nợ khả dụng, chặn thanh toán ghi nợ.
3. Nếu hợp lệ, tăng nợ đại lý và cho phép xuất kho.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Kiểm soát hạn mức nợ Đại lý (UC-07) - Đạt
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Giao diện POS Bán Sỉ" as UI
control "API Gateway" as Gateway
control "Customer Service" as CustService
database "MongoDB" as DB

Pharmacist -> UI: Nhập hóa đơn bán sỉ & chọn Đại lý
activate UI
UI -> Gateway: GET /api/customers/:id/debt-limit
activate Gateway
Gateway -> CustService: checkCustomerDebtLimit(customerId)
activate CustService
CustService -> DB: Query CreditLimit & CurrentDebt của đại lý
DB --> CustService: Dữ liệu tài chính đại lý
CustService -> CustService: Tính toán nợ khả dụng (Limit - CurrentDebt)
CustService --> Gateway: Trả về dư nợ khả dụng
deactivate CustService
Gateway --> UI: Trả về số dư nợ khả dụng cho POS
deactivate Gateway
UI -> UI: Kiểm tra tổng tiền đơn hàng mới <= dư nợ khả dụng?
alt Hợp lệ (Cho phép ghi nợ)
  UI --> Pharmacist: Nút "Xác nhận nợ" sáng màu cho phép click
else Vượt hạn mức (Bị chặn)
  UI --> Pharmacist: Khóa nút ghi nợ, yêu cầu thanh toán mặt bớt nợ
end
deactivate UI
@enduml
```

### C. State Diagram (Vòng đời hạn mức nợ - UC-07)
```plantuml
@startuml
title State Diagram - Hạn mức công nợ Đại lý (UC-07) - Đạt
[*] --> NO_DEBT : Tạo mới hồ sơ đại lý
NO_DEBT --> ACTIVE_DEBT : Phát sinh đơn bán sỉ mua nợ đầu tiên
ACTIVE_DEBT --> NO_DEBT : Đại lý thanh toán hết tiền nợ
ACTIVE_DEBT --> ACTIVE_DEBT : Mua nợ thêm nhưng tổng nợ vẫn < Hạn mức
ACTIVE_DEBT --> BLOCKED : Dư nợ phát sinh vượt quá Hạn mức nợ (Check Debt Limit)
BLOCKED --> ACTIVE_DEBT : Đại lý trả bớt nợ để hạ dư nợ về dưới hạn mức
BLOCKED --> [*]
NO_DEBT --> [*]
@enduml
```

---

## 4. UC-43 & UC-44: HỒ SƠ KHÁCH HÀNG & KHÁCH TỰ TRA CỨU ĐƠN HÀNG

### A. Luồng nghiệp vụ
1. Quản lý cập nhật thông tin khách hàng thân thiết (`UC-43`).
2. Khách hàng tự nhập số điện thoại để tra cứu các đơn hàng và toa thuốc điện tử của mình (`UC-44`).

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Khách hàng tự tra cứu đơn hàng (UC-44) - Đạt
autonumber
actor "Khách hàng" as Customer
boundary "Màn hình Tra cứu Khách" as UI
control "API Gateway" as Gateway
control "Order Service" as OrderService
database "MongoDB" as DB

Customer -> UI: Nhập số điện thoại cần tra cứu
activate UI
UI -> Gateway: GET /api/orders/history?phone=...
activate Gateway
Gateway -> OrderService: getCustomerOrderHistory(phone)
activate OrderService
OrderService -> DB: Query SalesOrders by customerPhone
DB --> OrderService: Danh sách đơn hàng & đơn thuốc điện tử
OrderService --> Gateway: Danh sách hóa đơn + Prescriptions
deactivate OrderService
Gateway --> UI: HTTP 200 OK (Data array)
deactivate Gateway
UI --> Customer: Render danh sách đơn hàng đã mua, tổng tiền & link xem toa thuốc điện tử
deactivate UI
@enduml
```

---

## 5. UC-46: QUẢN LÝ NHÀ CUNG CẤP (CRUD & ĐÁNH GIÁ SUPPILER)

### A. Luồng nghiệp vụ
1. Admin thực hiện thêm, sửa, xóa thông tin nhà cung cấp và đánh giá chất lượng cung cấp hàng.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Quản lý Nhà cung cấp (UC-46) - Đạt
autonumber
actor "Admin" as Admin
boundary "Giao diện Supplier Management" as UI
control "API Gateway" as Gateway
control "Purchase Service" as PurchaseService
database "MongoDB" as DB

Admin -> UI: Nhập thông tin NCC mới (Tên, MST, Số điện thoại)
activate UI
UI -> Gateway: POST /api/suppliers (supplierData)
activate Gateway
Gateway -> PurchaseService: createSupplier(data)
activate PurchaseService
PurchaseService -> DB: Lưu nhà cung cấp vào cơ sở dữ liệu
DB --> PurchaseService: Đã lưu thành công
PurchaseService --> Gateway: Trả về thông tin nhà cung cấp mới
deactivate PurchaseService
Gateway --> UI: HTTP 201 Created (Tạo thành công NCC)
UI --> Admin: Thông báo "Thêm nhà cung cấp mới thành công"
deactivate UI
@enduml
```

---

## 6. UC-32: CẢNH BÁO HẠN SỬ DỤNG LÔ THUỐC (ĐỎ / VÀNG / XANH)

### A. Luồng nghiệp vụ
1. Hệ thống tự động quét hạn sử dụng của tất cả các lô thuốc đang lưu kho và cảnh báo theo màu sắc.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Cảnh báo hạn sử dụng thuốc (UC-32) - Đạt
start
:Hệ thống quét tự động ngày hết hạn (expDate) của lô thuốc;
:Tính số ngày còn lại (DaysToExpiration);
if (DaysToExpiration <= 0) then (Có)
  :Đánh dấu Cảnh báo Đỏ (Đã hết hạn);
  :Khóa lô thuốc không cho phép bán lẻ;
else if (DaysToExpiration <= 90) then (Có)
  :Đánh dấu Cảnh báo Vàng (Sắp hết hạn);
  :Hiển thị lên danh sách theo dõi sát sao;
else
  :Đánh dấu Cảnh báo Xanh (Hạn dùng an toàn);
endif
:Cập nhật nhãn màu sắc cảnh báo trên giao diện kho;
stop
@enduml
```

---

## 7. UC-30: XEM TỒN KHO THỜI GIAN THỰC TOÀN CHUỖI

### A. Luồng nghiệp vụ
1. Quản lý / Thủ kho tra cứu lượng tồn kho của một SKU thuốc trên toàn bộ các chi nhánh chuỗi nhà thuốc.

### B. Communication Diagram (PlantUML)
```plantuml
@startuml
title Communication Diagram - Xem tồn kho thời gian thực (UC-30) - Đạt
object "Thủ kho / Admin" as User
object "Giao diện Web/App" as UI
object "Gateway" as Gateway
object "Inventory Service" as InvService
object "Database MongoDB" as DB

User -> UI : "1: Chọn thuốc cần xem tồn kho\n2: Nhấn Xem tồn chuỗi"
UI -> Gateway : "3: GET /api/inventory/realtime?medicineId=..."
Gateway -> InvService : "4: getRealtimeStock(medicineId)"
InvService -> DB : "5: Query tồn kho tại tất cả chi nhánh"
DB --> InvService : "6: Trả về danh sách tồn chi nhánh"
InvService --> Gateway : "7: Trả về kết quả tồn"
Gateway --> UI : "8: Render bảng tồn kho chuỗi"
@enduml
```

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
