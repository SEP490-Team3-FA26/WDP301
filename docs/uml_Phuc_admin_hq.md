# TÀI LIỆU UML - THÀNH VIÊN: PHÚC (ADMIN / DEVELOPER)
**Danh sách UCs đã hoàn thành: UC-05, UC-14, UC-15, UC-31, UC-36, UC-38, UC-48**

Tài liệu này chứa các luồng nghiệp vụ chi tiết và mã nguồn **PlantUML** cho toàn bộ các UCs đã hoàn thành do Phúc chịu trách nhiệm thiết kế.

---

## 1. UC-05: KIỂM TRA TƯƠNG TÁC THUỐC (AI INTERACTION CHECK)

### A. Luồng nghiệp vụ
1. Dược sĩ thêm nhiều sản phẩm thuốc vào giỏ hàng tại quầy POS.
2. Hệ thống gửi danh sách hoạt chất chính của các thuốc trong giỏ hàng sang Medicine Service để kiểm tra tương tác chéo.
3. So khớp chéo danh mục hoạt chất với bảng tương tác thuốc cấm.
4. Trả về kết quả cảnh báo mức độ tương tác (Nguy hiểm / Cảnh báo nhẹ / An toàn) dưới dạng Toast thông báo màu đỏ nếu có xung khắc hoạt chất.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Kiểm tra tương tác thuốc (UC-05) - Phúc
start
:Dược sĩ thêm thuốc vào giỏ hàng POS;
:Hệ thống trích xuất danh sách hoạt chất chính của các thuốc;
:Gửi danh sách sang cơ chế kiểm tra chênh lệch tương tác;
:Truy vấn DB đối chiếu cặp hoạt chất chéo;
if (Phát hiện cặp tương tác nguy hiểm?) then (Có)
  :Hiển thị Banner cảnh báo đỏ trên POS;
  :Hiện thông tin chi tiết: Tác dụng phụ, cơ chế xung khắc;
  :Dược sĩ thay đổi loại thuốc khác cho khách;
else (Không)
  :Giao diện giỏ hàng an toàn;
  :Cho phép tiến hành thanh toán;
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Kiểm tra tương tác thuốc (UC-05) - Phúc
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Giao diện POS" as UI
control "API Gateway" as Gateway
control "Medicine Service" as MedService
database "MongoDB" as DB

Pharmacist -> UI: Thêm thuốc vào giỏ hàng & nhấn nút "Check"
activate UI
UI -> Gateway: POST /api/medicines/check-interaction (cartItems)
activate Gateway
Gateway -> MedService: checkInteractions(items)
activate MedService
MedService -> DB: Truy vấn bảng chéo xung khắc hoạt chất thuốc
DB --> MedService: Phát hiện cặp tương tác cảnh báo
MedService --> Gateway: Trả về kết quả cảnh báo chi tiết
deactivate MedService
Gateway --> UI: Hiển thị Toast cảnh báo tương tác thuốc màu đỏ
deactivate Gateway
UI --> Pharmacist: Cảnh báo cảnh giác mức độ tương tác hoạt chất nguy hiểm
deactivate UI
@enduml
```

---

## 2. UC-14 & UC-15: DUYỆT NHẬP KHO CHỨNG TỪ PO -> PHIẾU NHẬP KHO GRN

### A. Luồng nghiệp vụ
1. Thủ kho dùng thiết bị di động quét mã QR/Barcode trên kiện hàng nhà cung cấp giao đến (`UC-14`).
2. Hệ thống so khớp thông tin sản phẩm quét được với đơn đặt hàng PO gốc.
3. Nhập thông tin số lô, hạn sử dụng thực tế và số lượng đạt chuẩn để lập phiếu kiểm hàng (`UC-15`).
4. Admin duyệt GRN trên trang HQ Approval, hệ thống chính thức tăng tồn kho.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Luồng Nhập kho PO -> GRN (UC-15, UC-14) - Phúc
start
:Thủ kho chọn Đơn mua hàng PO đang giao đến;
:Mở thiết bị quét mã QR/Barcode trên bao bì hộp thuốc;
:Quét mã vạch khớp SKU trong đơn hàng;
:Nhập số lượng thực tế nhận được;
:Nhập Mã Số Lô (batchNo) & Hạn sử dụng (expDate);
:Tạo và hoàn tất Phiên kiểm hàng (Inspection Record);
:Hệ thống sinh Phiếu nhập kho GRN ở trạng thái CHỜ DUYỆT;
:Admin HQ đăng nhập hệ thống, kiểm duyệt sai lệch số lượng;
if (Admin bấm phê duyệt GRN?) then (Có)
  :Cập nhật trạng thái GRN thành COMPLETED;
  :Tự động tạo các Lô thuốc MedicineBatch hoạt động;
  :Cộng số lượng tồn kho thực tế vào Kho tổng trung tâm;
  :Gửi thông báo nhập kho hoàn tất;
else (Không)
  :Từ chối duyệt và trả lại biên bản sai lệch cho NCC;
endif
stop
@enduml
```

### C. State Diagram (Vòng đời PO - UC-15)
```plantuml
@startuml
title State Diagram - Vòng đời Đơn mua hàng PO (UC-15) - Phúc
[*] --> DRAFT : Thủ kho tạo đơn yêu cầu mua hàng nháp
DRAFT --> PENDING_APPROVAL : Gửi yêu cầu mua hàng lên Admin duyệt
PENDING_APPROVAL --> APPROVED : Admin duyệt mua (Thanh toán PAID/CREDIT)
PENDING_APPROVAL --> REJECTED : Admin từ chối duyệt PO
APPROVED --> COMPLETED : NCC giao hàng, kiểm hàng & duyệt GRN nhập kho thành công
REJECTED --> [*]
COMPLETED --> [*]
@enduml
```

---

## 3. UC-36: GỢI Ý THUỐC THAY THẾ KHI HẾT HÀNG TRONG KHO

### A. Luồng nghiệp vụ
1. Dược sĩ tìm kiếm thuốc kê đơn cho khách tại POS nhưng thuốc đó đã hết hàng.
2. Hệ thống tự động truy vấn và gợi ý các thuốc thay thế có cùng hoạt chất và hàm lượng (`UC-36`).
3. Hiển thị danh sách gợi ý thuốc thay thế lên form.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Gợi ý thuốc thay thế khi hết hàng (UC-36) - Phúc
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Giao diện POS Bán Hàng" as UI
control "API Gateway" as Gateway
control "Medicine Service" as MedService
database "MongoDB" as DB

Pharmacist -> UI: Tìm kiếm thuốc X (Hết hàng trong kho)
activate UI
UI -> Gateway: GET /api/medicines/alternatives?id=X
activate Gateway
Gateway -> MedService: getAlternativeMedicines(id)
activate MedService
MedService -> DB: Query medicines có cùng activeIngredients & strength
DB --> MedService: Danh sách thuốc thay thế cùng hoạt chất
MedService --> Gateway: Trả về các SKU thay thế khả dụng
deactivate MedService
Gateway --> UI: Hiển thị danh sách gợi ý thuốc thay thế lên form
deactivate Gateway
@enduml
```

---

## 4. UC-38: CẢNH BÁO TỒN KHO DƯỚI MỨC TỐI THIỂU AN TOÀN (MIN STOCK)

### A. Luồng nghiệp vụ
1. Hệ thống tự động kiểm tra số lượng tồn kho khả dụng của từng loại thuốc tại chi nhánh.
2. Nếu số lượng tồn kho hiện tại nhỏ hơn mức tối thiểu an toàn (`minStock`) đã được cài đặt cho loại thuốc đó, hệ thống sẽ kích hoạt cảnh báo hết hàng dạng Banner/Notification.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Cảnh báo tồn kho dưới mức tối thiểu (UC-38) - Phúc
start
:Hệ thống chạy tác vụ ngầm kiểm tra tồn kho định kỳ;
:Đọc số lượng tồn khả dụng (AvailableStock) của từng SKU;
:Đọc ngưỡng tồn kho tối thiểu an toàn (MinStockThreshold) của SKU đó;
if (AvailableStock <= MinStockThreshold?) then (Có)
  :Gửi thông báo cảnh báo "Sắp hết hàng" lên Dashboard;
  :Đánh dấu đỏ dòng thuốc trong danh mục quản lý kho;
  :Đề xuất tự động tạo phiếu Requisition cấp hàng bổ sung;
else (Không)
  :Giữ trạng thái tồn kho an toàn (Màu xanh);
endif
stop
@enduml
```

---

## 5. UC-48: CẤU HÌNH BẢNG GIÁ BÁN LẺ / SỈ THEO TỪNG CHI NHÁNH

### A. Luồng nghiệp vụ
1. Admin điều chỉnh giá bán lẻ / bán sỉ riêng biệt cho từng chi nhánh tùy thuộc vào thị trường khu vực.

### B. Communication Diagram (PlantUML)
```plantuml
@startuml
title Communication Diagram - Cấu hình giá bán lẻ/sỉ theo chi nhánh (UC-48) - Phúc
object "Admin" as Owner
object "Giao diện Admin" as UI
object "Gateway" as Gateway
object "Medicine Service" as MedService
object "Database MongoDB" as DB

Owner -> UI : "1: Chọn thuốc cần chỉnh giá\n2: Nhập đơn giá bán riêng của chi nhánh X"
UI -> Gateway : "3: PATCH /api/medicines/:id/branch-price"
Gateway -> MedService : "4: updateBranchPrice(id, branchCode, price)"
MedService -> DB : "5: Ghi nhận đơn giá riêng cho chi nhánh vào bảng giá"
DB --> MedService : "6: Lưu DB thành công"
MedService --> Gateway : "7: Trả về bảng giá chi nhánh cập nhật"
Gateway --> UI : "8: Báo cấu hình giá chi nhánh hoàn tất"
@enduml
```

---

## 6. UC-31: THÔNG BÁO REALTIME SỰ KIỆN QUAN TRỌNG TOÀN CHUỖI

### A. Luồng nghiệp vụ
1. Các sự kiện lớn (ví dụ: tạo PR hỏa tốc, đơn hàng bị từ chối, thuốc bị hết hạn) được hệ thống bắn thông báo tức thời thông qua WebSocket/SSE lên tất cả các client đang online của nhân viên.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Thông báo realtime sự kiện quan trọng (UC-31) - Phúc
autonumber
actor "Người gửi (Thủ kho/Chi nhánh)" as Sender
boundary "Giao diện Client" as UI1
control "API Gateway / Server" as Gateway
control "Notification Service" as NotiService
boundary "Giao diện Web/App Nhận" as UI2
actor "Người nhận (Admin/Quản lý)" as Receiver

Sender -> UI1: Thực hiện hành động (Ví dụ: Tạo PR hỏa tốc)
activate UI1
UI1 -> Gateway: POST /api/purchase-requisitions (Urgent = True)
activate Gateway
Gateway -> Gateway: Lưu DB thành công
Gateway -> NotiService: pushRealtimeNotification(urgent_pr_event)
activate NotiService
NotiService -> NotiService: Phát thông điệp qua WebSocket channel 'admin-notifications'
NotiService --> UI2: Gửi gói tin socket trực tiếp đến kết nối đang mở
activate UI2
UI2 -> UI2: Phát âm thanh cảnh báo & Hiển thị popup thông báo đỏ
UI2 --> Receiver: Đọc thông báo hỏa tốc tức thì
NotiService --> Gateway: Hoàn tất
deactivate NotiService
Gateway --> UI1: HTTP 201 Created
deactivate Gateway
deactivate UI1
deactivate UI2
@enduml
```

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
