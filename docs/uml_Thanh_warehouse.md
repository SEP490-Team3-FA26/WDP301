# TÀI LIỆU UML - THÀNH VIÊN: THÀNH (THỦ KHO KHO TỔNG / DEVELOPER)
**Danh sách UCs đã hoàn thành: UC-01, UC-02, UC-19, UC-24, UC-47, UC-59**

Tài liệu này chứa các luồng nghiệp vụ chi tiết và mã nguồn **PlantUML** cho toàn bộ các UCs đã hoàn thành do Thành chịu trách nhiệm.

---

## 1. UC-01: TÌM KIẾM & THÊM THUỐC VÀO GIỎ HÀNG

### A. Luồng nghiệp vụ
1. Dược sĩ nhập tên thuốc, hoạt chất hoặc quét barcode thuốc tại màn hình POS bán lẻ.
2. Hệ thống kiểm tra số lượng tồn kho khả dụng của chi nhánh hiện tại.
3. Nếu thuốc còn tồn kho, dược sĩ nhập số lượng cần mua và click "Thêm vào giỏ".
4. Giỏ hàng cập nhật danh sách thuốc, đơn giá và tính tổng tiền tạm tính.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Tìm kiếm & Thêm thuốc vào giỏ (UC-01) - Thành
start
:Dược sĩ nhập từ khóa tìm kiếm (tên thuốc/hoạt chất);
:Hệ thống truy vấn danh sách thuốc tương thích trong DB;
if (Tìm thấy thuốc?) then (Không)
  :Hiển thị thông báo "Không tìm thấy sản phẩm";
  stop
else (Có)
  :Hiển thị danh sách kết quả kèm số lượng tồn kho;
  :Dược sĩ chọn thuốc và nhập số lượng cần bán;
  if (Số lượng bán <= Số lượng tồn khả dụng?) then (Có)
    :Thêm thuốc vào giỏ hàng POS;
    :Cập nhật tổng tiền tạm tính;
  else (Không)
    :Hiển thị Toast cảnh báo "Không đủ hàng tồn kho";
  endif
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Tìm kiếm & thêm thuốc vào giỏ (UC-01) - Thành
autonumber
actor "Dược sĩ" as Pharmacist
boundary "Giao diện Bán hàng POS" as UI
control "API Gateway" as Gateway
control "Medicine Service" as MedService
database "MongoDB" as DB

Pharmacist -> UI: Nhập tên thuốc / hoạt chất tìm kiếm
activate UI
UI -> Gateway: GET /api/medicines?search=...
activate Gateway
Gateway -> MedService: searchMedicines(query)
activate MedService
MedService -> DB: Tìm kiếm SKU & Tồn kho khả dụng
DB --> MedService: Danh sách thuốc tìm thấy
MedService --> Gateway: Trả về kết quả thuốc & tồn kho
deactivate MedService
Gateway --> UI: Hiển thị kết quả lên màn hình POS
deactivate Gateway

Pharmacist -> UI: Chọn số lượng & Click "Thêm vào giỏ"
UI -> UI: Kiểm tra số lượng tồn kho khả dụng
alt Đủ hàng trong kho
  UI -> UI: Cập nhật danh sách giỏ hàng & tính tổng tiền tạm tính
else Hết hàng / Không đủ
  UI --> Pharmacist: Cảnh báo "Không đủ số lượng tồn kho"
end
deactivate UI
@enduml
```

---

## 2. UC-02 & UC-47: QUẢN LÝ VÀ ÁP DỤNG CHƯƠNG TRÌNH KHUYẾN MÃI (VOUCHER)

### A. Luồng nghiệp vụ
1. **Tạo chương trình khuyến mãi (UC-47):** Admin thiết lập chiến dịch khuyến mãi mới (mã giảm giá, chiết khấu phần trăm, điều kiện áp dụng, hạn dùng).
2. **Áp dụng mã giảm giá tại quầy POS (UC-02):** Dược sĩ nhập mã voucher vào giỏ hàng, hệ thống kiểm tra tính hợp lệ và tự động giảm trừ tổng hóa đơn.

### B. Activity Diagram (Tạo Voucher - UC-47)
```plantuml
@startuml
title Activity Diagram - Tạo chương trình khuyến mãi (UC-47) - Thành
start
:Admin truy cập trang Quản lý Khuyến mãi;
:Nhấp "Tạo chương trình mới";
:Nhập thông tin: Mã Voucher, % Giảm giá, Giá trị giảm tối đa, Ngày bắt đầu & hết hạn, Điều kiện đơn hàng tối thiểu;
:Nhấn "Kích hoạt chiến dịch";
if (Thông tin hợp lệ?) then (Có)
  :Lưu Voucher vào Database ở trạng thái ACTIVE;
  :Thông báo "Tạo chương trình khuyến mãi thành công";
else (Không)
  :Hiển thị lỗi và yêu cầu sửa lại dữ liệu đầu vào;
endif
stop
@enduml
```

### C. State Diagram (Vòng đời Voucher - UC-47)
```plantuml
@startuml
title State Diagram - Vòng đời Voucher (UC-47) - Thành
[*] --> DRAFT : Admin tạo mới chiến dịch khuyến mãi nháp
DRAFT --> ACTIVE : Kích hoạt voucher cho phép áp dụng trên toàn chuỗi
ACTIVE --> SUSPENDED : Admin tạm dừng chiến dịch khuyến mãi
SUSPENDED --> ACTIVE : Mở khóa cho hoạt động lại
ACTIVE --> EXPIRED : Quá ngày hết hạn của voucher (Expired)
ACTIVE --> OUT_OF_STOCK : Voucher hết số lượng phát hành tối đa
EXPIRED --> [*]
OUT_OF_STOCK --> [*]
@enduml
```

### D. Communication Diagram (Áp dụng Voucher tại POS - UC-02)
```plantuml
@startuml
title Communication Diagram - Áp dụng voucher tại quầy POS (UC-02) - Thành
object "Dược sĩ" as Cashier
object "Giao diện POS" as POS
object "Gateway" as Gateway
object "Promotion Service" as PromoService
object "Database MongoDB" as DB

Cashier -> POS : "1: Nhập mã Voucher"
POS -> Gateway : "2: POST /api/promotions/validate"
Gateway -> PromoService : "3: validateVoucher(code, cartItems)"
PromoService -> DB : "4: Kiểm tra điều kiện áp dụng & hạn dùng"
DB --> PromoService : "5: Trả về thông tin voucher"
PromoService --> Gateway : "6: Trả về số tiền được chiết khấu"
Gateway --> POS : "7: Cập nhật tổng số tiền cần trả của hóa đơn"
@enduml
```

---

## 3. UC-19: SCAN BARCODE & ĐỐI CHIẾU SỐ LƯỢNG THỰC TẾ KHI KIỂM KÊ

### A. Luồng nghiệp vụ
1. Thủ kho mở camera trên ứng dụng Mobile tại màn hình kiểm kê kho (`StocktakeScreen`).
2. Tiến hành quét mã Barcode/QR Code của từng hộp/thùng thuốc trên kệ.
3. Hệ thống tự động nhận diện mã thuốc và tăng số lượng đếm thực tế lên +1 mỗi lần quét.
4. Hiển thị đối chiếu trực tiếp giữa Số lượng thực tế đếm được và Số lượng tồn kho lý thuyết trên hệ thống.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Đối chiếu số lượng thực tế (UC-19) - Thành
start
:Thủ kho mở App Mobile kiểm kê kho;
:Chọn phiên kiểm kê cần thực hiện;
:Kích hoạt camera quét mã vạch / QR;
repeat
  :Hướng camera vào mã vạch/QR của hộp thuốc;
  :Hệ thống quét nhận diện SKU thuốc thành công;
  :Số lượng đếm thực tế tự động cộng 1 (+1);
  :Hiển thị thông tin thuốc và số lượng đã đếm lên màn hình;
backward: Di chuyển đến hộp thuốc tiếp theo;
repeat while (Tiếp tục quét đếm?) is (Có)
:Hoàn tất quét đếm;
:Hệ thống đối chiếu chênh lệch tự động:
- Lệch thừa (Thực tế > Hệ thống)
- Lệch thiếu (Thực tế < Hệ thống);
:Thủ kho xác nhận lưu kết quả kiểm kê;
stop
@enduml
```

---

## 4. UC-24: QUẢN LÝ CHI NHÁNH (ADD / EDIT / DELETE)

### A. Luồng nghiệp vụ
1. Admin truy cập màn hình quản trị chi nhánh để tạo mới, chỉnh sửa thông tin hoặc tạm đóng cửa một chi nhánh trong chuỗi nhà thuốc.

### B. State Diagram (Trạng thái chi nhánh - UC-24)
```plantuml
@startuml
title State Diagram - Trạng thái hoạt động Chi nhánh (UC-24) - Thành
[*] --> DRAFT : Admin tạo thông tin chi nhánh mới
DRAFT --> ACTIVE : Kích hoạt chi nhánh đi vào hoạt động
ACTIVE --> SUSPENDED : Tạm ngừng hoạt động (Sửa chữa/Kiểm kho)
SUSPENDED --> ACTIVE : Mở cửa hoạt động trở lại
ACTIVE --> CLOSED : Đóng cửa chi nhánh vĩnh viễn
SUSPENDED --> CLOSED
CLOSED --> [*]
@enduml
```

---

## 5. UC-59: GHI NHẬN NHẬT KÝ HỆ THỐNG (AUDIT LOG)

### A. Luồng nghiệp vụ
1. Bất kỳ người dùng nào thực hiện hành động làm biến động dữ liệu quan trọng (Bán hàng, duyệt PO, nhập kho, sửa bảng giá, điều chỉnh quyền).
2. Hệ thống tự động ghi lại bản ghi Audit Log: Ai làm, làm gì, trên tài nguyên nào, thời gian nào và lưu vào MongoDB.

### B. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Ghi nhận nhật ký hệ thống (UC-59) - Thành
autonumber
actor "Người dùng (Mọi Role)" as User
boundary "Giao diện Hệ thống" as UI
control "API Gateway / Service" as Gateway
control "Log Service" as LogService
database "MongoDB Log DB" as DB

User -> UI: Thực hiện hành động nhạy cảm (Ví dụ: Duyệt PO)
activate UI
UI -> Gateway: POST /api/purchase-orders/:id/approve
activate Gateway
Gateway -> Gateway: Xử lý nghiệp vụ duyệt thành công
Gateway -> LogService: Gửi event ghi nhận log (userId, action="APPROVE_PO", targetId=id, timestamp)
activate LogService
LogService -> DB: Insert Audit Log document
DB --> LogService: Lưu thành công
LogService --> Gateway: Xác nhận log thành công
deactivate LogService
Gateway --> UI: Phản hồi kết quả duyệt thành công lên màn hình
deactivate Gateway
UI --> User: Giao diện cập nhật trạng thái mới
deactivate UI
@enduml
```

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
