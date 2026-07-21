# TÀI LIỆU UML - THÀNH VIÊN: NAM (DEVELOPER / AI)
**Danh sách UCs đã hoàn thành: UC-03, UC-04, UC-06, UC-08, UC-09, UC-16, UC-18, UC-21, UC-23, UC-34, UC-49**

Tài liệu này chứa các luồng nghiệp vụ chi tiết và mã nguồn **PlantUML** cho toàn bộ các UCs đã hoàn thành do Nam chịu trách nhiệm thiết kế.

---

## 1. UC-03: XÁC NHẬN THANH TOÁN & IN HÓA ĐƠN

### A. Luồng nghiệp vụ
1. Dược sĩ nhấn nút "Thanh toán" tại màn hình POS.
2. Chọn phương thức thanh toán: Tiền mặt hoặc Chuyển khoản qua cổng QR (ví dụ: PayOS).
3. Hệ thống tạo hóa đơn, kiểm tra trạng thái thanh toán và in hóa đơn (Bill).

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Xác nhận thanh toán & in hóa đơn (UC-03) - Nam
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Màn hình POS Bán Hàng" as UI
control "API Gateway" as Gateway
control "Order Service" as OrderService
control "Payment Service" as PayService
database "MongoDB" as DB

Pharmacist -> UI: Nhấn nút "Thanh toán" (Chọn Chuyển khoản QR)
activate UI
UI -> Gateway: POST /api/sales/checkout (Đơn hàng & hình thức thanh toán)
activate Gateway
Gateway -> OrderService: createSalesOrder(data)
activate OrderService
OrderService -> DB: Lưu hóa đơn ở trạng thái PENDING
DB --> OrderService: Thành công
OrderService -> PayService: generatePaymentQR(orderId, amount)
activate PayService
PayService --> OrderService: Trả về link QR PayOS / Momo
deactivate PayService
OrderService --> Gateway: Trả về thông tin hóa đơn & QR link
deactivate OrderService
Gateway --> UI: Hiển thị QR Code lên màn hình khách hàng quét
deactivate Gateway

loop Chờ webhook hoặc kiểm tra trạng thái thanh toán
  PayService -> OrderService: Webhook thanh toán thành công (PAYMENT_RECEIVED)
  activate OrderService
  OrderService -> DB: Đổi trạng thái đơn thành COMPLETED
  OrderService --> UI: Thông báo "Thanh toán thành công"
  deactivate OrderService
end

UI -> UI: Kích hoạt máy in bill hóa đơn giấy
UI --> Pharmacist: Hoàn tất in Bill hóa đơn giao cho khách hàng
deactivate UI
@enduml
```

---

## 2. UC-04: BÁN THEO ĐƠN THUỐC – QUÉT MÃ QR ĐIỆN TỬ

### A. Luồng nghiệp vụ
1. Khách hàng mang đơn thuốc điện tử có chứa mã QR Code từ phòng khám đến nhà thuốc.
2. Dược sĩ quét mã QR đơn thuốc bằng camera thiết bị.
3. Hệ thống giải mã QR để lấy ID đơn thuốc y khoa điện tử, tự động truy vấn thông tin đơn từ cơ sở dữ liệu y tế và đổ các thuốc chỉ định vào giỏ hàng POS kèm theo liều lượng được điền sẵn.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Bán theo đơn thuốc quét QR (UC-04) - Nam
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Màn hình POS" as UI
control "API Gateway" as Gateway
control "AI / Prescription Service" as PresService
database "MongoDB / Health DB" as DB

Pharmacist -> UI: Quét mã QR đơn thuốc y khoa của khách
activate UI
UI -> Gateway: POST /api/prescriptions/scan-qr (qrData)
activate Gateway
Gateway -> PresService: fetchPrescriptionByQR(qrData)
activate PresService
PresService -> DB: Truy vấn đơn thuốc bằng mã giải mã
DB --> PresService: Dữ liệu đơn thuốc (Tên thuốc, liều dùng, bác sĩ chỉ định)
PresService --> Gateway: Trả về chi tiết đơn thuốc
deactivate PresService
Gateway --> UI: HTTP 200 OK (Chi tiết đơn thuốc)
deactivate Gateway
UI -> UI: Tự động thêm các thuốc được chỉ định vào giỏ hàng POS
UI -> UI: Điền sẵn liều dùng (Dose) vào cột ghi chú của từng dòng sản phẩm
UI --> Pharmacist: Form bán lẻ đã điền sẵn danh sách thuốc theo đơn bác sĩ
deactivate UI
@enduml
```

---

## 3. UC-06: BÁN SỈ – LẬP HÓA ĐƠN & BẢNG GIÁ BẬC THANG

### A. Luồng nghiệp vụ
1. Dược sĩ chọn khách hàng là Đại lý / Nhà thuốc liên kết.
2. Chọn thuốc và nhập số lượng lớn để mua sỉ.
3. Hệ thống tự động áp dụng bảng giá bậc thang (Mua càng nhiều chiết khấu càng cao) theo chính sách giá sỉ của doanh nghiệp.
4. Xuất hóa đơn bán sỉ và ghi nhận công nợ đại lý.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Luồng bán sỉ áp dụng giá bậc thang (UC-06) - Nam
start
:Dược sĩ chọn khách hàng Đại lý;
:Nhập thuốc và số lượng sỉ cần mua;
:Hệ thống truy vấn chính sách giá sỉ bậc thang của SKU thuốc;
if (Số lượng >= Ngưỡng bậc 3 (Ví dụ: > 100 hộp)?) then (Có)
  :Áp dụng Đơn giá bậc 3 (Giảm 15%);
else if (Số lượng >= Ngưỡng bậc 2 (Ví dụ: > 50 hộp)?) then (Có)
  :Áp dụng Đơn giá bậc 2 (Giảm 10%);
else
  :Áp dụng Đơn giá bậc 1 (Bán sỉ tiêu chuẩn - Giảm 5%);
endif
:Tính tổng tiền hóa đơn sỉ;
:Hệ thống kiểm tra công nợ đại lý;
:Hoàn tất hóa đơn sỉ ghi nợ hoặc thanh toán;
stop
@enduml
```

---

## 4. UC-08 & UC-09: XỬ LÝ ĐỔI / TRẢ HÀNG VÀ CẬP NHẬT LẠI TỒN KHO

### A. Luồng nghiệp vụ
1. Khách hàng mang thuốc bị lỗi đến đổi trả. Dược sĩ nhập mã hóa đơn gốc.
2. Chọn sản phẩm đổi trả, nhập lý do.
3. Hệ thống hoàn tiền cho khách, đồng thời cập nhật tăng tồn kho tại chi nhánh đó.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Quy trình đổi trả hàng & hoàn tiền (UC-08, UC-09) - Nam
start
:Nhập mã hóa đơn gốc cần đổi trả;
:Hệ thống hiển thị danh sách thuốc đã mua;
:Dược sĩ chọn thuốc khách muốn trả lại;
:Nhập số lượng trả & lý do đổi trả;
:Xác nhận hoàn tiền;
fork
  :Ghi nhận giao dịch hoàn tiền (Refund Transaction);
fork separator
  :Hệ thống tự động cộng lại số lượng thuốc vào tồn kho chi nhánh;
  :Ghi nhận giao dịch kho loại INBOUND_REFUND;
end fork
:In phiếu đổi trả hàng và đưa tiền hoàn cho khách;
stop
@enduml
```

---

## 5. UC-16: XUẤT KHO THEO NGUYÊN TẮC FIFO & CẢNH BÁO GẦN HẠN SỬ DỤNG

### A. Luồng nghiệp vụ
1. Khi có yêu cầu xuất kho (bán hàng hoặc chuyển kho), hệ thống tự động chọn xuất các lô thuốc có ngày nhập trước hoặc ngày hết hạn gần nhất (First In, First Out).

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Tự động chọn lô theo FIFO (UC-16) - Nam
start
:Nhận yêu cầu xuất thuốc X số lượng N;
:Truy vấn danh sách các lô (Batches) hiện có của thuốc X trong kho;
:Sắp xếp các lô theo ngày hết hạn tăng dần (Lô gần hạn nhất lên đầu);
repeat
  :Chọn lô đầu tiên trong danh sách sắp xếp;
  if (Số lượng cần xuất N <= Số lượng tồn của lô này?) then (Có)
    :Xuất N sản phẩm từ lô hiện tại;
    :Giảm số lượng cần xuất N = 0;
  else (Không)
    :Xuất toàn bộ số lượng tồn kho của lô hiện tại;
    :Trừ số lượng cần xuất còn lại N = N - Lượng tồn lô;
  endif
backward: Chọn lô tiếp theo;
repeat while (Số lượng cần xuất N > 0?) is (Có)
:Cập nhật số lượng tồn kho của các lô tương ứng vào DB;
:Xuất kho thành công;
stop
@enduml
```

---

## 6. UC-18 & UC-20: TẠO PHIÊN KIỂM KÊ KHO VÀ ĐIỀU CHỈNH TỒN KHO THỰC TẾ

### A. Luồng nghiệp vụ
1. Thủ kho tạo phiên kiểm kê theo khu vực (`UC-18`).
2. Tiến hành đếm thực tế, đối chiếu chênh lệch và cập nhật số lượng điều chỉnh kho (`UC-20`).

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Kiểm kê & điều chỉnh tồn thực tế (UC-18, UC-20) - Nam
autonumber
actor "Thủ kho" as Staff
boundary "Giao diện Kiểm Kê" as UI
control "API Gateway" as Gateway
control "Inventory Service" as InvService
database "MongoDB" as DB

Staff -> UI: Click "Tạo phiên kiểm kê mới" (Chọn danh mục thuốc)
activate UI
UI -> Gateway: POST /api/inventory/stocktake (sessionData)
activate Gateway
Gateway -> InvService: createStocktakeSession(data)
activate InvService
InvService -> DB: Lưu phiên kiểm kê (status = ACTIVE)
DB --> InvService: Lưu thành công
InvService --> Gateway: Trả về phiên kiểm kê ACTIVE
deactivate InvService
Gateway --> UI: Hiển thị giao diện nhập số liệu kiểm kê
deactivate Gateway

Staff -> UI: Nhập số lượng thực tế đếm được & Click "Hoàn tất"
activate UI
UI -> Gateway: POST /api/inventory/stocktake/:id/reconcile (actualCounts)
activate Gateway
Gateway -> InvService: reconcileStocktake(id, actualCounts)
activate InvService
InvService -> DB: So sánh số lượng thực tế vs hệ thống, tính toán chênh lệch
InvService -> DB: Cập nhật số lượng tồn kho chính xác theo thực tế
InvService -> DB: Đổi trạng thái phiên kiểm kê thành ADJUSTED
DB --> InvService: Thành công
InvService --> Gateway: Kết quả điều chỉnh kho thành công
deactivate InvService
Gateway --> UI: Thông báo "Điều chỉnh tồn kho thực tế hoàn tất"
deactivate Gateway
deactivate UI
@enduml
```

---

## 7. UC-21: TẠO PHIẾU ĐIỀU CHUYỂN GIỮA CÁC CHI NHÁNH

### A. Luồng nghiệp vụ
1. Quản lý chi nhánh gửi yêu cầu chuyển hàng từ chi nhánh khác sang chi nhánh mình khi hết hàng.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Điều chuyển kho chi nhánh (UC-21) - Nam
autonumber
actor "Quản lý Chi nhánh" as Manager
boundary "Màn hình Điều chuyển" as UI
control "API Gateway" as Gateway
control "Inventory Service" as InvService
database "MongoDB" as DB

Manager -> UI: Chọn chi nhánh nguồn & Nhập danh sách thuốc cần điều chuyển
activate UI
UI -> Gateway: POST /api/inventory/transfers (transferData)
activate Gateway
Gateway -> InvService: createInterBranchTransfer(data)
activate InvService
InvService -> DB: Lưu phiếu điều chuyển ở trạng thái PENDING
DB --> InvService: Thành công
InvService --> Gateway: Phiếu điều chuyển khởi tạo thành công
deactivate InvService
Gateway --> UI: Hiển thị phiếu điều chuyển chờ chuyển đi
deactivate Gateway
deactivate UI
@enduml
```

---

## 8. UC-34: DỰ BÁO NHU CẦU NHẬP HÀNG THEO KỲ (AI FORECAST)

### A. Luồng nghiệp vụ
1. Gửi request phân tích AI Forecast -> AI Service FastAPI -> LLM Llama-3 -> Đề xuất kế hoạch nhập kho.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tiến trình Dự báo nhu cầu AI Forecast (UC-34) - Nam
autonumber
actor "Thủ Kho / Admin" as User
boundary "Giao diện Web/Mobile" as UI
control "API Gateway" as Gateway
control "Inventory Service" as InvService
control "AI Service (FastAPI)" as AIService
database "MongoDB" as DB
entity "LLM (Llama-3)" as LLM

User -> UI: Chọn kỳ dự báo (Ví dụ: 30 ngày)
activate UI
UI -> Gateway: GET /api/reports/ai-forecast?periodDays=30
activate Gateway
Gateway -> InvService: Gọi Kafka topic: forecast_dataset
activate InvService
InvService -> DB: Truy vấn SalesOrder, PurchaseOrder, Medicine
DB --> InvService: Dữ liệu thô bán hàng & tồn kho
InvService -> InvService: Tính toán lượng bán, avg Daily Sales, hàng sắp về
InvService --> Gateway: Trả về Dataset thô của các thuốc
deactivate InvService

Gateway -> AIService: POST /api/ai/forecast (Gửi Dataset thô)
activate Gateway
AIService -> AIService: Xây dựng Prompt phân tích chi tiết
AIService -> LLM: Gửi request prompt phân tích nhu cầu
activate LLM
LLM --> AIService: Trả về kết quả phân tích & JSON đề xuất
deactivate LLM
AIService --> Gateway: Trả về JSON khuyến nghị đã chuẩn hóa
deactivate AIService

Gateway --> UI: HTTP 200 OK (Insights + Recommendations)
deactivate Gateway
UI -> UI: Render danh sách thuốc cần nhập & banner AI
User -> UI: Tích chọn các dòng thuốc & nhấn "Tạo đơn nhập hàng"
UI -> UI: Chuyển hướng sang /warehouse/inventory/import với prefill params
deactivate UI
@enduml
```

---

## 9. UC-49: TRA CỨU THÔNG TIN THUỐC (HƯỚNG DẪN, LIỀU DÙNG, TƯƠNG TÁC)

### A. Luồng nghiệp vụ
1. Người dùng (Khách/Dược sĩ) chọn xem chi tiết SKU thuốc.
2. Hệ thống tải thông số hướng dẫn sử dụng, chỉ định y khoa và các hoạt chất tương tác xung khắc.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tra cứu thông tin thuốc chi tiết (UC-49) - Nam
autonumber
actor "Người dùng" as User
boundary "Giao diện Chi tiết Thuốc" as UI
control "API Gateway" as Gateway
control "Medicine Service" as MedService
database "MongoDB" as DB

User -> UI: Nhấp chọn một sản phẩm thuốc
activate UI
UI -> Gateway: GET /api/medicines/:id
activate Gateway
Gateway -> MedService: getMedicineDetail(id)
activate MedService
MedService -> DB: Query Medicine document details & instructions
DB --> MedService: Tài liệu thông số thuốc đầy đủ
MedService --> Gateway: Trả về thông tin chi tiết thuốc
deactivate MedService
Gateway --> UI: HTTP 200 OK (Medicine data JSON)
deactivate Gateway
UI --> User: Hiển thị: Cách dùng, chống chỉ định, hoạt chất chính & cảnh báo tương tác
deactivate UI
@enduml
```

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
