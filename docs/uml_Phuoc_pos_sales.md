# TÀI LIỆU UML - THÀNH VIÊN: PHƯỚC (DEVELOPER)
**Danh sách UCs đã hoàn thành: UC-10, UC-17, UC-28, UC-40, UC-41, UC-50, UC-56, UC-58**

Tài liệu này chứa các luồng nghiệp vụ chi tiết và mã nguồn **PlantUML** cho toàn bộ các UCs đã hoàn thành do Phước chịu trách nhiệm thiết kế.

---

## 1. UC-40 & UC-41: QUẢN LÝ DANH MỤC THUỐC SKU, NHÓM THUỐC & HOẠT CHẤT

### A. Luồng nghiệp vụ
1. Admin truy cập trang Quản lý Sản phẩm (Catalog Management).
2. Tạo mới hoặc chỉnh sửa SKU thuốc: nhập tên thương mại, nhóm thuốc, hoạt chất chính (`activeIngredients`), hàm lượng, đơn vị quy đổi, và liên kết nhà cung cấp mặc định.
3. Hệ thống lưu trữ và đồng bộ hóa thông tin danh mục SKU thuốc.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - CRUD danh mục SKU & hoạt chất (UC-40, UC-41) - Phước
start
:Admin chọn "Thêm thuốc mới" hoặc "Sửa SKU";
:Nhập thông tin SKU: Tên thuốc, Quy cách, Biệt dược;
:Chọn Nhóm điều trị & Hoạt chất chính (activeIngredients);
:Cấu hình Đơn vị quy đổi (Hộp, Vỉ, Viên);
:Nhấn nút "Lưu SKU";
if (Mã SKU bị trùng hoặc thiếu trường bắt buộc?) then (Có)
  :Hiển thị thông báo lỗi kiểm tra trường dữ liệu;
else (Không)
  :Ghi thông tin SKU thuốc vào Database MongoDB;
  :Đồng bộ hóa trạng thái SKU lên catalog bán lẻ;
  :Thông báo "Lưu SKU thuốc thành công";
endif
stop
@enduml
```

### C. State Diagram (Vòng đời SKU thuốc - UC-40)
```plantuml
@startuml
title State Diagram - Trạng thái danh mục SKU thuốc (UC-40) - Phước
[*] --> PENDING_INFO : Admin tạo nháp SKU thuốc mới
PENDING_INFO --> ACTIVE : Bổ sung đầy đủ thông tin thuốc & duyệt
ACTIVE --> PENDING_INFO : Tạm ẩn sản phẩm để cập nhật lại nhãn hiệu
ACTIVE --> DISCONTINUED : Dừng nhập & kinh doanh sản phẩm vĩnh viễn
PENDING_INFO --> DISCONTINUED
DISCONTINUED --> [*]
@enduml
```

---

## 2. UC-58: QUẢN LÝ TÀI KHOẢN NGƯỜI DÙNG & PHÂN QUYỀN RBAC

### A. Luồng nghiệp vụ
1. Admin quản lý thông tin các tài khoản nhân sự (Admin, Thủ kho, Dược sĩ, Quản lý chi nhánh).
2. Gán các quyền thao tác tương thích (Create, Read, Update, Delete) trên từng API endpoint.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Quản lý phân quyền RBAC (UC-58) - Phước
start
:Admin truy cập trang Cấu hình RBAC;
:Chọn tài khoản nhân viên hoặc vai trò cần chỉnh sửa;
:Hệ thống truy vấn danh sách quyền hiện tại;
:Admin tích chọn hoặc loại bỏ các quyền hạn truy cập chức năng;
if (Admin bấm nút "Lưu thay đổi"?) then (Có)
  :Gửi yêu cầu PATCH /api/users/:id/roles;
  :Hệ thống cập nhật danh sách quyền mới vào MongoDB;
  :Xóa token session cũ của tài khoản đó (bắt đăng nhập lại);
  :Thông báo "Phân quyền nhân viên thành công";
else (Không)
  :Hủy bỏ thao tác;
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Kiểm tra quyền truy cập API (UC-58) - Phước
autonumber
actor "Nhân viên (Vai trò bất kỳ)" as User
boundary "Giao diện Hệ thống" as UI
control "API Gateway Guard" as Guard
control "Business Service" as Service
database "MongoDB" as DB

User -> UI: Click vào chức năng chỉnh sửa bảng giá
activate UI
UI -> Guard: Gửi Request PATCH /api/medicines/:id/price (Bearer Token)
activate Guard
Guard -> DB: Query Role & Permissions của User
DB --> Guard: Trả về danh sách Quyền của User
Guard -> Guard: Đối chiếu quyền có chứa "UPDATE_PRICE" ?
alt Quyền không hợp lệ
  Guard --> UI: HTTP 403 Forbidden (Từ chối truy cập)
  UI --> User: Hiển thị Toast đỏ "Bạn không có quyền thực hiện hành động này!"
else Quyền hợp lệ
  Guard -> Service: Chuyển tiếp Request xử lý
  activate Service
  Service -> DB: Cập nhật giá sản phẩm
  DB --> Service: Thành công
  Service --> Guard: Cập nhật thành công
  deactivate Service
  Guard --> UI: HTTP 200 OK (Cập nhật thành công)
  UI --> User: Thông báo "Đã thay đổi giá bán thành công"
end
deactivate Guard
deactivate UI
@enduml
```

---

## 3. UC-10: TÍCH ĐIỂM & QUY ĐỔI KHÁCH HÀNG THÂN THIẾT

### A. Luồng nghiệp vụ
1. Dược sĩ nhập số điện thoại khách hàng khi lập hóa đơn tại POS.
2. Hệ thống truy vấn điểm hiện có, cho phép quy đổi điểm ra tiền giảm trừ hóa đơn.
3. Khi hoàn tất hóa đơn, tích lũy điểm mới dựa trên tổng giá trị thanh toán thực tế của khách hàng.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tích điểm & Quy đổi điểm thành viên (UC-10) - Phước
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Giao diện POS Bán Hàng" as UI
control "API Gateway" as Gateway
control "Customer Service" as CustService
database "MongoDB" as DB

Pharmacist -> UI: Nhập SĐT khách hàng thân thiết
activate UI
UI -> Gateway: GET /api/customers/lookup?phone=...
activate Gateway
Gateway -> CustService: lookupCustomer(phone)
activate CustService
CustService -> DB: Query Customer profile
DB --> CustService: Thông tin khách hàng & số điểm hiện có
CustService --> Gateway: Trả về Profile khách hàng
deactivate CustService
Gateway --> UI: Hiển thị tên & số điểm tích lũy của khách
deactivate Gateway

Pharmacist -> UI: Nhập số điểm khách muốn quy đổi & xác nhận thanh toán đơn
UI -> Gateway: POST /api/sales/checkout (Gửi kèm customerId & redeemPoints)
activate Gateway
Gateway -> CustService: processLoyaltyPoints(id, spentPoints, orderValue)
activate CustService
CustService -> DB: Khấu trừ số điểm spentPoints & cộng điểm mới tích lũy
DB --> CustService: Cập nhật thành công
CustService --> Gateway: Trả về trạng thái tích điểm hoàn tất
deactivate CustService
Gateway --> UI: HTTP 200 OK (Thanh toán & cập nhật điểm thành công)
deactivate Gateway
UI --> Pharmacist: In hóa đơn hiển thị điểm cũ, điểm đổi, điểm tích mới
deactivate UI
@enduml
```

---

## 4. UC-17: TẠO PHIẾU XUẤT NỘI BỘ (KHÔNG BÁN)

### A. Luồng nghiệp vụ
1. Chi nhánh tạo phiếu xuất kho nội bộ phục vụ mục đích luân chuyển hàng hoặc làm hàng tặng, kiểm nghiệm nội bộ doanh nghiệp.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tạo phiếu xuất nội bộ (UC-17) - Phước
autonumber
actor "Quản lý Chi nhánh" as Manager
boundary "Màn hình Xuất Kho" as UI
control "API Gateway" as Gateway
control "Inventory Service" as InvService
database "MongoDB" as DB

Manager -> UI: Chọn loại xuất nội bộ & danh sách thuốc cần xuất
activate UI
UI -> Gateway: POST /api/inventory/internal-dispatch (dispatchData)
activate Gateway
Gateway -> InvService: createInternalDispatch(data)
activate InvService
InvService -> DB: Tạo tài liệu xuất kho, trừ tồn kho chi nhánh theo FIFO
DB --> InvService: Lưu thành công
InvService --> Gateway: Trả về kết quả xuất kho nội bộ
deactivate InvService
Gateway --> UI: HTTP 201 Created (Phiếu xuất kho nội bộ thành công)
deactivate Gateway
UI --> Manager: Hiển thị thông báo hoàn tất & cho phép in phiếu xuất
deactivate UI
@enduml
```

---

## 5. UC-28: ĐỒNG BỘ DANH MỤC & GIÁ BÁN TOÀN CHUỖI

### A. Luồng nghiệp vụ
1. Admin thay đổi giá bán gốc của một SKU thuốc hoặc cập nhật danh mục hoạt chất.
2. Hệ thống gửi thông điệp đồng bộ hóa thông tin giá bán mới xuống cơ sở dữ liệu của tất cả các chi nhánh nhà thuốc trong chuỗi thời gian thực.

### B. Communication Diagram (PlantUML)
```plantuml
@startuml
title Communication Diagram - Đồng bộ giá bán toàn chuỗi (UC-28) - Phước
object "Admin" as Owner
object "Giao diện Catalog" as UI
object "Gateway" as Gateway
object "Medicine Service" as MedService
object "Database MongoDB" as DB

Owner -> UI : "1: Chỉnh sửa giá bán lẻ gốc của thuốc"
UI -> Gateway : "2: PATCH /api/medicines/:id/price"
Gateway -> MedService : "3: updateMedicinePrice(id, price)"
MedService -> DB : "4: Cập nhật giá bán lẻ gốc của SKU thuốc"
DB --> MedService : "5: Đã cập nhật thành công"
MedService -> DB : "6: Tự động cập nhật bảng giá của các chi nhánh trực thuộc"
DB --> MedService : "7: Đồng bộ hoàn tất"
MedService --> Gateway : "8: Phản hồi thông báo cập nhật thành công"
Gateway --> UI : "9: Hiển thị Toast "Bảng giá toàn chuỗi đã được đồng bộ""
@enduml
```

---

## 6. UC-50 & UC-56: BÁO CÁO DOANH THU & XUẤT DỮ LIỆU EXCEL / PDF

### A. Luồng nghiệp vụ
1. Admin / Quản lý chọn thời gian và bấm kết xuất báo cáo doanh số chi tiết.
2. Hệ thống tổng hợp dữ liệu giao dịch hóa đơn bán hàng và cho phép tải xuống file báo cáo định dạng Excel / PDF.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Báo cáo doanh thu & Xuất file (UC-50, UC-56) - Phước
autonumber
actor "Admin / Quản lý" as User
boundary "Màn hình Báo cáo" as UI
control "API Gateway" as Gateway
control "Report Service" as ReportService
database "MongoDB" as DB

User -> UI: Chọn kỳ báo cáo (Tháng/Quý) & Click "Xem báo cáo"
activate UI
UI -> Gateway: GET /api/reports/revenue?period=...
activate Gateway
Gateway -> ReportService: generateRevenueReport(period)
activate ReportService
ReportService -> DB: Query tổng hợp SalesOrders & Doanh thu
DB --> ReportService: Tập dữ liệu doanh thu chi tiết
ReportService --> Gateway: Trả về kết quả tổng hợp
deactivate ReportService
Gateway --> UI: Hiển thị biểu đồ và bảng số liệu doanh thu
deactivate Gateway

User -> UI: Click "Xuất báo cáo Excel / PDF"
activate UI
UI -> Gateway: GET /api/reports/revenue/export?format=excel
activate Gateway
Gateway -> ReportService: exportRevenueToExcel(period)
activate ReportService
ReportService -> ReportService: Biên dịch tập dữ liệu thành cấu trúc file Excel (.xlsx)
ReportService --> Gateway: Trả về luồng file nhị phân (Binary Stream)
deactivate ReportService
Gateway --> UI: Tải xuống file báo cáo (Download File)
deactivate Gateway
UI --> User: Tải về file Excel doanh thu thành công
deactivate UI
@enduml
```

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
