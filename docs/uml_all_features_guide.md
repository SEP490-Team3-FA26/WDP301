# TÀI LIỆU TOÀN DIỆN: LUỒNG NGHIỆP VỤ & HƯỚNG DẪN VẼ UML (PLANTUML)
**Hệ thống Quản trị Chuỗi Nhà thuốc & Tối ưu Kho thông minh**

Tài liệu này chi tiết hóa toàn bộ các luồng đi của tất cả các chức năng hiện có trong dự án, đồng thời cung cấp mã nguồn **PlantUML** hoàn chỉnh cho 4 loại sơ đồ (Activity, State, Sequence, Communication) của cả 5 phân hệ lớn. 

Tài liệu được cấu trúc phân chia trực quan cho 5 thành viên: **Thành, Nam, Phước, Phúc, Đạt** phối hợp thực hiện.

---

## 📌 PHÂN CHIA VAI TRÒ VẼ UML TOÀN HỆ THỐNG

1.  **PHƯỚC (Dược sĩ & Khách hàng):** Phụ trách **Phân hệ Bán hàng POS & Khách hàng tự tra cứu**.
2.  **THÀNH (Thủ kho):** Phụ trách **Phân hệ Quản lý Kho (Nhập, Xuất, Kiểm kho & Lot Tracking)**.
3.  **ĐẠT (Quản lý Chi nhánh):** Phụ trách **Phân hệ Điều phối & Luân chuyển nội bộ**.
4.  **PHÚC (Admin / HQ Manager):** Phụ trách **Phân hệ Phê duyệt PO/GRN & Quản trị Danh mục**.
5.  **NAM (AI Developer):** Phụ trách **Phân hệ Dự báo Nhu cầu AI Forecast & Quét đơn thuốc AI**.

---

## PHÂN HỆ 1: BÁN HÀNG POS & KHÁCH HÀNG TỰ TRA CỨU (PHƯỚC PHỤ TRÁCH)

### 1. Luồng nghiệp vụ
*   **Bán hàng POS tại quầy:** Dược sĩ nhập tên thuốc tìm kiếm -> Thêm vào giỏ hàng -> Hệ thống tự động kiểm tra tương tác xung khắc -> Cảnh báo hoạt chất nếu có tương tác nguy hiểm -> Nhập thông tin khách hàng thân thiết -> Áp dụng mã giảm giá -> Xác nhận thanh toán (Tiền mặt/Chuyển khoản) -> Trừ kho theo FIFO -> Tạo hóa đơn điện tử -> Gửi hóa đơn qua email khách hàng.
*   **Khách hàng tự tra cứu:** Khách hàng vãng lai truy cập shop tự phục vụ -> Tìm kiếm thuốc theo tên/hoạt chất -> Xem thông tin chi tiết -> Thêm vào giỏ hàng -> Đặt hàng -> Tra cứu lịch sử mua hàng qua số điện thoại.

### 2. Sơ đồ PlantUML (Phước)

#### A. Activity Diagram: Luồng bán hàng POS tại quầy
```plantuml
@startuml
title Activity Diagram - Bán hàng POS tại quầy (Phước)
start
:Dược sĩ quét mã vạch hoặc gõ tìm kiếm thuốc;
if (Thuốc còn hàng?) then (Không)
  :Thông báo hết hàng, gợi ý thuốc thay thế cùng hoạt chất;
  stop
else (Có)
  :Thêm thuốc vào giỏ hàng POS;
  :Hệ thống tự động kiểm tra tương tác chéo giữa các hoạt chất;
  if (Phát hiện tương tác nguy hiểm?) then (Có)
    :Hiển thị Toast cảnh báo đỏ "Xung khắc hoạt chất";
    :Dược sĩ trao đổi với bác sĩ/khách hàng hoặc đổi thuốc;
  else (Không)
    :Giỏ hàng an toàn;
  endif
  :Nhập số điện thoại khách hàng thân thiết (nếu có);
  :Áp dụng voucher / tích điểm thành viên;
  :Chọn phương thức thanh toán (Tiền mặt / Chuyển khoản QR);
  :Nhấn nút "Xác nhận thanh toán";
  :Hệ thống cập nhật kho chi nhánh (FIFO);
  :In hóa đơn giấy & tự động gửi E-Invoice qua Email/Zalo khách hàng;
  :Cộng điểm tích lũy thành viên;
endif
stop
@enduml
```

#### B. Sequence Diagram: Luồng Khách hàng tự tra cứu đơn hàng bằng SĐT
```plantuml
@startuml
title Sequence Diagram - Khách hàng tự tra cứu đơn hàng (Phước)
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

#### C. State Diagram: Trạng thái của Đơn đặt hàng bán lẻ
```plantuml
@startuml
title State Diagram - Trạng thái đơn bán lẻ (Phước)
[*] --> PENDING_PAYMENT : Dược sĩ tạo giỏ hàng POS / Khách đặt hàng online
PENDING_PAYMENT --> PROCESSING : Xác nhận thanh toán thành công (Tiền mặt/Chuyển khoản)
PENDING_PAYMENT --> CANCELLED : Khách hủy mua hàng / Hết hạn thanh toán
PROCESSING --> DELIVERED : Xuất kho thành công & bàn giao cho khách
DELIVERED --> COMPLETED : Giao dịch hoàn tất
DELIVERED --> REFUND_REQUESTED : Khách yêu cầu đổi trả thuốc lỗi
REFUND_REQUESTED --> REFUNDED : Kiểm tra thuốc đạt yêu cầu đổi trả -> Trả tiền & nhập lại kho
REFUND_REQUESTED --> REFUND_REJECTED : Thuốc đã bóc vỏ / hỏng do khách -> Từ chối trả
CANCELLED --> [*]
COMPLETED --> [*]
REFUNDED --> [*]
REFUND_REJECTED --> [*]
@enduml
```

#### D. Communication Diagram: Tiến trình thanh toán POS
```plantuml
@startuml
title Communication Diagram - Tiến trình thanh toán POS (Phước)
object "Dược sĩ" as Cashier
object "Màn hình POS" as POS
object "Gateway" as Gateway
object "Order Service" as OrderService
object "Inventory Service" as InvService

Cashier -> POS : "1: Nhấn Thanh toán"
POS -> Gateway : "2: POST /api/sales/checkout"
Gateway -> OrderService : "3: Tạo đơn hàng mới"
OrderService -> InvService : "4: Trừ tồn kho theo lô (FIFO)"
InvService --> OrderService : "5: Xác nhận giảm tồn kho"
OrderService --> Gateway : "6: Trả về chi tiết hóa đơn"
Gateway --> POS : "7: Render QR Code chuyển khoản"
POS --> Cashier : "8: Hiển thị giao dịch hoàn tất & in Bill"
@enduml
```

---

## PHÂN HỆ 2: QUẢN LÝ KHO - NHẬP, XUẤT, KIỂM KHO & TRUY VẾT LÔ (THÀNH PHỤ TRÁCH)

### 1. Luồng nghiệp vụ
*   **Kiểm hàng & Nhập kho (Goods Receipt Note):** Thủ kho nhận hàng giao từ nhà cung cấp theo PO -> Tạo Phiên kiểm hàng (Inspection Record) -> Quét đếm số lượng thực tế nhận được (hỗ trợ đếm nhanh bằng camera AI) -> Ghi nhận lỗi hỏng nếu có -> Lưu mã số lô (`batchNo`) và Hạn sử dụng (`expDate`) của từng thuốc -> Tạo GRN gửi Admin duyệt nhập kho.
*   **Xuất hủy thuốc hết hạn (Dispose):** Hệ thống cảnh báo các lô hết hạn -> Thủ kho lập phiếu yêu cầu tiêu hủy -> Chờ duyệt -> Xuất kho hủy và cập nhật số lượng tồn.
*   **Truy vết lô (Lot Tracking):** Nhập mã lô -> Hệ thống truy vết ngược từ NCC -> PO -> GRN -> Lịch sử thay đổi số lượng kho theo thời gian (Timeline).

### 2. Sơ đồ PlantUML (Thành)

#### A. Activity Diagram: Luồng kiểm hàng và tạo phiếu nhập kho GRN
```plantuml
@startuml
title Activity Diagram - Kiểm hàng & Nhập kho GRN (Thành)
start
:Thủ kho chọn Đơn mua hàng (PO) đang giao đến;
:Khởi tạo Phiên kiểm hàng (Inspection Record);
repeat
  :Chọn thuốc cần kiểm đếm;
  :Quét đếm số lượng (Thủ công hoặc dùng Camera AI đếm hộp);
  :Ghi nhận số lượng thực tế & số lượng lỗi hỏng (nếu có);
  :Nhập Số lô (batchNo) & Hạn sử dụng (expDate) từ bao bì;
backward: Chọn thuốc tiếp theo;
repeat while (Còn thuốc chưa kiểm đếm?) is (Có)
:Hoàn tất kiểm hàng;
if (Có lệch số lượng lớn hoặc hỏng nặng?) then (Có)
  :Ghi nhận biên bản lỗi nhập hàng;
  :Gửi yêu cầu đổi trả/hoàn hàng về NCC;
  stop
else (Không)
  :Tự động tạo phiếu nhập kho GRN ở trạng thái CHỜ DUYỆT HQ;
  :Gửi thông báo duyệt lên Admin;
endif
stop
@enduml
```

#### B. Sequence Diagram: Luồng truy xuất nguồn gốc lô hàng (Lot Tracking)
```plantuml
@startuml
title Sequence Diagram - Truy xuất nguồn gốc lô thuốc (Thành)
autonumber
actor "Thủ kho / Admin" as User
boundary "Trang Lot Tracking Web/Mobile" as UI
control "API Gateway" as Gateway
control "Purchase Service" as PurchaseService
database "MongoDB" as DB

User -> UI: Nhập mã lô cần truy vết (VD: INIT-BATCH)
activate UI
UI -> Gateway: GET /api/inventory-transactions/trace/INIT-BATCH
activate Gateway
Gateway -> PurchaseService: traceLot(batchNo)
activate PurchaseService
PurchaseService -> DB: Query MedicineBatch & InventoryTransaction by batchNo
DB --> PurchaseService: Kết quả lô & giao dịch kho
PurchaseService -> DB: Query GRN / PO / Supplier gốc bằng referenceId
DB --> PurchaseService: Chứng từ nhập kho & thông tin NCC
PurchaseService -> PurchaseService: Sắp xếp các giao dịch thành Timeline lịch sử
PurchaseService --> Gateway: Trả về JSON kết quả truy vết đầy đủ
deactivate PurchaseService
Gateway --> UI: HTTP 200 OK (Trace data)
deactivate Gateway
UI --> User: Hiển thị: Thông tin thuốc, phân bố chi nhánh, hóa đơn NCC, timeline biến động
deactivate UI
@enduml
```

#### C. State Diagram: Trạng thái của một Phiên kiểm hàng (Inspection Record)
```plantuml
@startuml
title State Diagram - Phiên kiểm hàng Inspection Record (Thành)
[*] --> CREATED : Khởi tạo phiên kiểm hàng từ PO
CREATED --> IN_PROGRESS : Thủ kho bắt đầu đếm số lượng thực tế
IN_PROGRESS --> WAITING : Hoàn thành đếm, chờ HQ duyệt GRN
WAITING --> APPROVED : Admin duyệt thành công -> Đơn hàng nhập kho tăng tồn
WAITING --> REJECTED : Admin từ chối nhập kho (Sai lệch chứng từ)
APPROVED --> [*]
REJECTED --> IN_PROGRESS : Cập nhật lại số liệu kiểm đếm thực tế
@enduml
```

#### D. Communication Diagram: Luồng tạo phiếu xuất hủy thuốc quá hạn
```plantuml
@startuml
title Communication Diagram - Xuất hủy thuốc quá hạn (Thành)
object "Thủ kho" as Keeper
object "Giao diện Kho" as UI
object "Gateway" as Gateway
object "Inventory Service" as InvService
object "Database MongoDB" as DB

Keeper -> UI : "1: Chọn lô thuốc quá hạn\n2: Nhấn Yêu cầu tiêu hủy"
UI -> Gateway : "3: POST /api/inventory/dispose"
Gateway -> InvService : "4: Tạo phiếu hủy nháp"
InvService -> DB : "5: Lưu phiếu hủy & Đóng băng lô thuốc"
DB --> InvService : "6: Đã lưu thông tin"
InvService --> Gateway : "7: Trả về trạng thái chờ duyệt"
Gateway --> UI : "8: Hiển thị phiếu xuất hủy dạng chờ Admin ký duyệt"
@enduml
```

---

## PHÂN HỆ 3: ĐIỀU PHỐI & LUÂN CHUYỂN NỘI BỘ (ĐẠT PHỤ TRÁCH)

### 1. Luồng nghiệp vụ
1.  **Chi nhánh gửi yêu cầu:** Chi nhánh hết hàng tự động tạo cảnh báo hoặc Quản lý chi nhánh tạo phiếu **Yêu cầu cấp hàng (Branch Requisition)** gửi lên Kho tổng trung tâm.
2.  **Kho tổng tiếp nhận:** Thủ kho tại Kho tổng xem yêu cầu cấp hàng.
3.  **Xử lý tại Kho tổng:**
    *   Nếu Kho tổng hết hàng: Thủ kho bấm báo hết hàng (`OUT_OF_STOCK`), hệ thống kích hoạt luồng mua hàng NCC ngoài.
    *   Nếu Kho tổng còn hàng: Thủ kho nhấn duyệt, chọn lô hàng tương thích xuất kho và bàn giao đơn vị vận chuyển (`SHIPPING`).
4.  **Chi nhánh tiếp nhận:** Khi hàng đến nơi, cửa hàng trưởng chi nhánh kiểm đếm số lượng thực tế nhận được và nhấn **Xác nhận nhận hàng (Received)**. Hệ thống tự động trừ tồn kho Kho tổng và tăng tồn kho Chi nhánh nhận tương ứng.

### 2. Sơ đồ PlantUML (Đạt)

#### A. Activity Diagram: Luồng luân chuyển kho từ Kho tổng về Chi nhánh
```plantuml
@startuml
title Activity Diagram - Luân chuyển kho nội bộ (Đạt)
start
:Chi nhánh tạo yêu cầu cấp hàng (Requisition);
:Trạng thái phiếu đặt là SUBMITTED;
:Thủ kho Kho tổng duyệt phiếu yêu cầu;
if (Kho tổng đủ hàng trong kho?) then (Không)
  :Nhấn nút "Báo hết hàng";
  :Cập nhật trạng thái phiếu: OUT_OF_STOCK;
  :Hệ thống đề xuất Admin tạo PO mua ngoài;
  stop
else (Có)
  :Thủ kho chọn lô thuốc xuất kho;
  :Bấm "Xuất kho & Giao hàng";
  :Hệ thống trừ tồn kho ảo tại Kho tổng;
  :Phiếu chuyển sang trạng thái SHIPPING;
  :Hàng được vận chuyển đến chi nhánh;
  :Quản lý chi nhánh nhận hàng, đối chiếu số lượng;
  :Nhấn nút "Xác nhận nhận hàng";
  :Hệ thống cộng tồn kho thực tế tại Chi nhánh;
  :Hoàn tất đơn hàng (COMPLETED);
endif
stop
@enduml
```

#### B. Sequence Diagram: Luồng Cửa hàng trưởng yêu cầu cấp hàng nội bộ
```plantuml
@startuml
title Sequence Diagram - Yêu cầu cấp hàng chi nhánh (Đạt)
autonumber
actor "Quản lý Chi nhánh" as Manager
boundary "Màn hình Requisition" as UI
control "API Gateway" as Gateway
control "Inventory Service" as InvService
database "MongoDB" as DB

Manager -> UI: Chọn thuốc thiếu & Nhập số lượng cần cấp
activate UI
UI -> Gateway: POST /api/requisitions (Chi tiết yêu cầu)
activate Gateway
Gateway -> InvService: createBranchRequisition(data)
activate InvService
InvService -> DB: Lưu Requisition (status = SUBMITTED)
DB --> InvService: Lưu thành công
InvService --> Gateway: Trả về Requisition thông tin chi tiết
deactivate InvService
Gateway --> UI: HTTP 201 Created (Hiển thị phiếu yêu cầu)
deactivate Gateway
UI --> Manager: Hiển thị trạng thái đơn: "Chờ kho tổng xử lý"
deactivate UI
@enduml
```

#### C. State Diagram: Trạng thái của Phiếu Yêu cầu cấp hàng (Branch Requisition)
```plantuml
@startuml
title State Diagram - Trạng thái phiếu cấp hàng Requisition (Đạt)
[*] --> SUBMITTED : Chi nhánh tạo phiếu yêu cầu cấp hàng gửi lên
SUBMITTED --> SHIPPING : Kho tổng duyệt, xuất kho & bàn giao giao hàng
SUBMITTED --> OUT_OF_STOCK : Kho tổng kiểm tra kho và báo hết hàng
OUT_OF_STOCK --> SUBMITTED : Kho tổng nhập thêm hàng từ NCC
SHIPPING --> COMPLETED : Chi nhánh nhận hàng thành công và xác nhận
SHIPPING --> LOST_DAMAGE : Thất lạc / Hỏng hóc trong quá trình vận chuyển
LOST_DAMAGE --> COMPLETED : Đền bù / Gửi bù hàng thành công
COMPLETED --> [*]
@enduml
```

#### D. Communication Diagram: Luồng nhận hàng luân chuyển tại Chi nhánh
```plantuml
@startuml
title Communication Diagram - Nhận hàng luân chuyển tại Chi nhánh (Đạt)
object "Quản lý Chi nhánh" as Manager
object "Giao diện Nhận hàng" as UI
object "Gateway" as Gateway
object "Inventory Service" as InvService
object "Database MongoDB" as DB

Manager -> UI : "1: Kiểm đếm thực tế\n2: Nhấn Xác nhận nhận hàng"
UI -> Gateway : "3: PATCH /api/requisitions/:id/receive"
Gateway -> InvService : "4: Cập nhật tăng tồn kho Chi nhánh"
InvService -> DB : "5: Tăng stock chi nhánh\n6: Đổi trạng thái Requisition sang COMPLETED"
DB --> InvService : "7: Đã cập nhật thành công"
InvService --> Gateway : "8: Trả về trạng thái hoàn tất"
Gateway --> UI : "9: Hiển thị popup "Đã nhận hàng và tăng tồn kho thành công""
@enduml
```

---

## PHÂN HỆ 4: PHÊ DUYỆT PO/GRN & QUẢN TRỊ DANH MỤC (PHÚC PHỤ TRÁCH)

### 1. Luồng nghiệp vụ
*   **Phê duyệt PO (Purchase Order):** Admin nhận yêu cầu nhập hàng (PR) từ thủ kho -> Admin duyệt PO -> Chọn loại hình thanh toán (Thanh toán ngay hoặc Mua nợ ghi nhận công nợ NCC) -> PO chuyển sang trạng thái APPROVED -> NCC bắt đầu đóng gói giao hàng.
*   **Phê duyệt GRN (Goods Receipt Note):** Sau khi hàng được kiểm đếm tại kho, Admin kiểm tra chênh lệch trên Phiên kiểm hàng -> Nhấn duyệt GRN -> Hệ thống chính thức tăng số lượng tồn kho tổng và tạo các lô thuốc mới hoạt động trên hệ thống.
*   **Quản trị danh mục:** Admin CRUD thuốc, CRUD danh mục nhà cung cấp, cấu hình bảng giá bán toàn chuỗi và phân quyền truy cập chức năng cho nhân viên.

### 2. Sơ đồ PlantUML (Phúc)

#### A. Activity Diagram: Quy trình duyệt đơn mua hàng PO và thanh toán công nợ
```plantuml
@startuml
title Activity Diagram - Phê duyệt đơn hàng PO (Phúc)
start
:Admin đăng nhập, truy cập danh sách PO chờ duyệt;
:Chọn PO cần phê duyệt;
:Xem xét danh mục sản phẩm, số lượng và tổng số tiền;
if (Đồng ý phê duyệt?) then (Không)
  :Nhấn nút "Từ chối duyệt";
  :Nhập lý do từ chối đơn hàng;
  :Cập nhật trạng thái PO thành REJECTED;
  stop
else (Có)
  :Chọn hình thức thanh toán;
  if (Hình thức thanh toán?) then (Thanh toán ngay - PAID)
    :Trừ tiền tài khoản quỹ công ty;
    :Cập nhật trạng thái PO thành APPROVED_PAID;
  else (Mua nợ nhà cung cấp - CREDIT)
    :Ghi nhận công nợ phải trả NCC (Supplier Credit);
    :Cập nhật trạng thái PO thành APPROVED_CREDIT;
  endif
  :Gửi email đơn đặt hàng tự động tới Nhà cung cấp;
endif
stop
@enduml
```

#### B. Sequence Diagram: Luồng duyệt nhập kho GRN sau khi kiểm hàng thành công
```plantuml
@startuml
title Sequence Diagram - Phê duyệt GRN nhập kho (Phúc)
autonumber
actor "Admin / HQ Manager" as Admin
boundary "Giao diện HQ Approval" as UI
control "API Gateway" as Gateway
control "Purchase Service" as PurchaseService
database "MongoDB" as DB

Admin -> UI: Xem phiên kiểm hàng WAITING_APPROVAL
activate UI
UI -> Gateway: GET /api/inspections?status=WAITING
activate Gateway
Gateway -> PurchaseService: listPendingInspections()
activate PurchaseService
PurchaseService -> DB: Get InspectionRecords & GRN details
DB --> PurchaseService: Chi tiết phiếu kiểm
PurchaseService --> Gateway: Chi tiết phiếu kiểm
deactivate PurchaseService
Gateway --> UI: Render thông tin đối chiếu số lượng thực tế vs hóa đơn
deactivate Gateway

Admin -> UI: Click "Phê duyệt nhập kho (GRN)"
activate UI
UI -> Gateway: POST /api/inspections/:id/approve-import
activate Gateway
Gateway -> PurchaseService: approveGoodsReceiptNote(inspectionId)
activate PurchaseService
PurchaseService -> DB: Đổi trạng thái GRN sang COMPLETED
PurchaseService -> DB: Tạo các lô thuốc MedicineBatch mới
PurchaseService -> DB: Cộng số lượng tồn kho thực tế tại Kho tổng (CENTRAL_WH)
DB --> PurchaseService: Lưu thành công mọi thay đổi
PurchaseService --> Gateway: Trả về trạng thái nhập kho thành công
deactivate PurchaseService
Gateway --> UI: HTTP 200 OK (Cập nhật giao diện thành công)
deactivate Gateway
UI --> Admin: Hiển thị thông báo "Lô thuốc đã hoạt động, tồn kho tổng đã tăng"
deactivate UI
@enduml
```

#### C. State Diagram: Trạng thái của Tài khoản nhân viên & Quyền hạn (RBAC)
```plantuml
@startuml
title State Diagram - Trạng thái Nhân sự & Quyền hạn (Phúc)
[*] --> INACTIVE : Admin tạo tài khoản nhân sự mới (Chưa kích hoạt)
INACTIVE --> ACTIVE : Nhân viên xác thực Email / Đổi mật khẩu lần đầu
ACTIVE --> SUSPENDED : Nhân sự tạm nghỉ việc / Vi phạm bảo mật (Khóa tạm thời)
SUSPENDED --> ACTIVE : Mở khóa tài khoản nhân sự
ACTIVE --> TERMINATED : Nhân sự nghỉ việc hoàn toàn (Khóa vĩnh viễn)
TERMINATED --> [*]
@enduml
```

#### D. Communication Diagram: Luồng Admin cấu hình giá bán toàn chuỗi (Global Price)
```plantuml
@startuml
title Communication Diagram - Admin Cấu hình Global Price (Phúc)
object "Admin" as Owner
object "Giao diện Catalog" as UI
object "Gateway" as Gateway
object "Medicine Service" as MedService
object "Database MongoDB" as DB

Owner -> UI : "1: Chọn thuốc cần chỉnh giá\n2: Nhập đơn giá bán mới"
UI -> Gateway : "3: PATCH /api/medicines/:id/price"
Gateway -> MedService : "4: updateMedicinePrice(id, newPrice)"
MedService -> DB : "5: Cập nhật đơn giá bán gốc của sản phẩm"
DB --> MedService : "6: Lưu DB thành công"
MedService --> Gateway : "7: Trả về thông báo thành công"
Gateway --> UI : "8: Hiển thị Toast thông báo giá mới áp dụng toàn chuỗi"
@enduml
```

---

## PHÂN HỆ 5: AI FORECAST & AI OPERATIONS (NAM PHỤ TRÁCH)

### 1. Luồng nghiệp vụ
*   **AI Forecast (Dự báo nhu cầu nhập hàng):** Hệ thống tổng hợp lượng bán, tồn kho hiện tại và lượng hàng sắp về -> Gửi qua AI Service (FastAPI) -> LLM (Llama 3.3 70b) phân tích -> Trả về danh sách thuốc đề xuất nhập kèm độ khẩn cấp -> Thủ kho duyệt tạo nhanh PR/PO.
*   **Quét đơn thuốc AI (AI OCR Prescription):** Dược sĩ chụp đơn thuốc -> AI OCR phân tích bóc tách chữ -> Điền tự động tên thuốc vào giỏ hàng POS, giảm thiểu thời gian nhập liệu thủ công.

### 2. Sơ đồ PlantUML (Nam)

#### A. Activity Diagram: Luồng dự báo tồn kho thông minh bằng AI
```plantuml
@startuml
title Activity Diagram - Dự báo nhu cầu bằng AI Forecast (Nam)
start
:Thủ kho truy cập Tab "Dự báo nhu cầu AI";
:Chọn khoảng thời gian phân tích dự báo (7, 30, 90 ngày);
:Hệ thống lấy thông số bán hàng & tồn kho từ Database;
:AI Service xử lý dataset, xây dựng prompt ngữ cảnh y tế;
:Gửi prompt sang mô hình LLM Llama-3.3-70b;
:LLM phân tích tốc độ bán, hàng đang về & đưa ra đề xuất nhập;
:AI Service cấu trúc lại JSON kết quả (mức khẩn cấp, lý do);
:Hiển thị danh sách đề xuất dạng bảng trên giao diện;
if (Thủ kho muốn tạo nhanh đơn mua hàng?) then (Có)
  :Tích chọn các loại thuốc cần nhập;
  :Hệ thống tự động gom nhóm các thuốc theo NCC mặc định;
  :Điều hướng sang trang mua hàng với thông tin thuốc đã điền sẵn;
  :Thủ kho xác nhận gửi PR nháp lên Admin;
else (Không)
  :Lưu file báo cáo dự báo dạng PDF;
endif
stop
@enduml
```

#### B. Sequence Diagram: Luồng Quét đơn thuốc bằng AI (OCR Prescription)
```plantuml
@startuml
title Sequence Diagram - Quét đơn thuốc bằng AI (Nam)
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Màn hình POS Bán Hàng" as UI
control "API Gateway" as Gateway
control "AI Service (FastAPI)" as AIService
entity "Google Vision / Custom OCR" as OCR
database "MongoDB / Qdrant" as DB

Pharmacist -> UI: Click "Quét đơn thuốc bác sĩ" & tải ảnh lên
activate UI
UI -> Gateway: POST /api/ai/ocr-prescription (File ảnh)
activate Gateway
Gateway -> AIService: ocrAndExtractPrescription(imageFile)
activate AIService
AIService -> OCR: Gửi ảnh trích xuất Text thô
activate OCR
OCR --> AIService: Trả về đoạn text thô trong ảnh đơn thuốc
deactivate OCR
AIService -> AIService: Dùng NLP bóc tách tên thuốc, biệt dược & liều dùng
AIService -> DB: So khớp danh mục thuốc hiện tại trong DB
DB --> AIService: Trả về danh sách thuốc tương đồng khớp mã hệ thống
AIService --> Gateway: Trả về JSON chứa danh sách gợi ý thuốc kèm liều dùng
deactivate AIService
Gateway --> UI: Hiển thị Popup danh sách thuốc bóc tách thành công
deactivate Gateway
Pharmacist -> UI: Chọn thuốc khớp đơn & bấm "Thêm vào giỏ hàng POS"
UI --> Pharmacist: Giỏ hàng được điền tự động thuốc & liều dùng khuyến nghị
deactivate UI
@enduml
```

#### C. State Diagram: Trạng thái Đề xuất nhập hàng của AI
```plantuml
@startuml
title State Diagram - Đề xuất nhập hàng AI Recommendation (Nam)
[*] --> GENERATED : AI phân tích và đề xuất số lượng nhập
GENERATED --> SELECTED : Thủ kho chọn đề xuất lập đơn PO
GENERATED --> DISMISSED : Thủ kho bỏ qua / Không chấp nhận đề xuất
SELECTED --> PR_CREATED : Đơn yêu cầu mua hàng đã được tạo thành công
PR_CREATED --> [*]
DISMISSED --> [*]
@enduml
```

#### D. Communication Diagram: Luồng xử lý phân tích AI Forecast
```plantuml
@startuml
title Communication Diagram - Luồng xử lý phân tích AI Forecast (Nam)
object "Thủ kho" as Staff
object "Giao diện AI" as UI
object "Gateway" as Gateway
object "AI Service" as AIService
object "LLM Llama" as LLM

Staff -> UI : "1: Chọn kỳ hạn phân tích\n2: Click Tạo dự báo"
UI -> Gateway : "3: GET /api/reports/ai-forecast"
Gateway -> AIService : "4: Chuyển tiếp dataset thống kê tồn kho & doanh số"
AIService -> LLM : "5: Gửi prompt phân tích nhu cầu"
LLM --> AIService : "6: Trả về kết quả phân tích & số lượng đề xuất"
AIService --> Gateway : "7: Trả về JSON đề xuất chuẩn hóa"
Gateway --> UI : "8: Render bảng đề xuất & Banner Insights"
UI --> Staff : "9: Cho phép tích chọn lập PR nhanh"
@enduml
```

---

## 💻 HƯỚNG DẪN CÁCH KẾT XUẤT ẢNH TỪ FILE HƯỚNG DẪN PLANTUML

Các thành viên có thể xuất mã nguồn trên thành hình ảnh sơ đồ `.png` hoặc `.svg` chất lượng cao phục vụ làm Slide hoặc chèn vào file Word báo cáo bằng 2 phương pháp:

### Phương pháp 1: Kết xuất nhanh thông qua Web (PlantText)
1.  Truy cập vào trang web kết xuất: [https://www.planttext.com](https://www.planttext.com)
2.  Sao chép toàn bộ mã nguồn của sơ đồ mình phụ trách (từ dòng `@startuml` cho đến hết dòng `@enduml`).
3.  Dán đoạn mã đã copy vào khung soạn thảo văn bản bên trái.
4.  Nhấp vào nút **Generate** (hoặc phím tắt Ctrl + Enter). Sơ đồ sẽ hiển thị trực quan ở khung bên phải.
5.  Click chuột phải vào ảnh chọn **Save Image As...** để tải file ảnh về máy tính.

### Phương pháp 2: Kết xuất trực tiếp trên VS Code
1.  Mở phần mềm VS Code, truy cập mục Extensions (Ctrl+Shift+X), cài đặt Extension có tên: **PlantUML** (tác giả *jebbs*).
2.  Tải và cài đặt phần mềm phụ thuộc **Graphviz** trên máy tính nếu chưa có (Tải tại: [https://graphviz.org/download/](https://graphviz.org/download/)).
3.  Tạo một file trắng trong VS Code với phần mở rộng là `.puml` (ví dụ: `du-bao-ai.puml`).
4.  Dán mã nguồn PlantUML vào file này.
5.  Nhấn tổ hợp phím `Alt + D` để hiển thị cửa sổ xem trước (Preview) trực tiếp sơ đồ.
6.  Nhấn phím `F1` hoặc nhấn tổ hợp `Ctrl + Shift + P` -> gõ chọn: `PlantUML: Export Current Diagram` để lưu ảnh chất lượng cao vào thư mục dự án của mình.
