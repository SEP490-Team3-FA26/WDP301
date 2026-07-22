# TÀI LIỆU UML - THÀNH VIÊN: THÀNH (THỦ KHO KHO TỔNG / DEVELOPER)
**Danh sách UCs đã hoàn thành: UC-01, UC-02, UC-19, UC-24, UC-25, UC-39, UC-47, UC-59, Mobile-Login**

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

## 6. UC-25: DASHBOARD TỔNG – XEM DOANH THU & TỒN KHO TOÀN CHUỖI

### A. Luồng nghiệp vụ
1. Admin hoặc Quản lý chi nhánh truy cập trang Báo cáo.
2. Hệ thống giải mã token JWT để xác định phân quyền (Role) của người dùng:
   - Admin/HQ: Có thể xem dữ liệu toàn chuỗi hoặc lọc dữ liệu theo từng chi nhánh.
   - Quản lý chi nhánh (Branch Manager): Chỉ có thể xem dữ liệu của chi nhánh mình.
   - Dược sĩ (Pharmacist): Chỉ được xem một số chỉ số doanh thu bán lẻ cơ bản tại quầy của chi nhánh đó, các tab BI chuyên sâu sẽ bị ẩn.
3. Client thực hiện gọi API `GET /api/reports/dashboard/summary` qua Gateway để lấy dữ liệu tổng quan.
4. Gateway định tuyến và gửi song song qua Kafka/gọi HTTP (sử dụng `Promise.all` để tối ưu hóa hiệu năng) tới:
   - **Orders Service**: Tổng hợp và tính toán Doanh thu thuần (Net Revenue = Doanh thu gộp - Tiền trả hàng + Chênh lệch đổi hàng).
   - **Inventory Service**: Tính toán Tổng giá trị tồn kho, Cảnh báo thuốc sắp hết hạn (Expired), và số lượng thuốc dưới mức an toàn (Reorder Point).
5. Frontend hiển thị nhanh các KPI Cards. Các tab phân tích sâu (BI Analytics, Hiệu suất kho) được thiết lập Lazy loading (`React.lazy`) và chỉ load code + gọi API chi tiết khi người dùng click chọn tab.

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Dashboard tổng (UC-25) - Thành
start
:Admin/Quản lý truy cập trang Báo cáo;
:Hệ thống giải mã JWT và xác định vai trò (Role);
if (Vai trò là Admin/HQ?) then (Có)
  :Cho phép lọc xem "Tất cả chi nhánh" hoặc từng chi nhánh cụ thể;
else (Không)
  :Chỉ cho phép xem dữ liệu của chi nhánh hiện tại (branchId);
endif
:Gọi API GET /api/reports/dashboard/summary;
:Backend truy vấn Orders Service (Doanh thu thuần) & Inventory Service (Tồn kho) song song (Promise.all);
:Hiển thị nhanh các thẻ KPI (Doanh thu thuần, Tổng giá trị tồn kho, Cảnh báo);
if (Người dùng chuyển sang tab BI/Kho?) then (Có)
  :Lazy load component tương ứng;
  :Gọi API chi tiết để vẽ biểu đồ doanh số/hiệu suất;
else (Không)
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Dashboard tổng (UC-25) - Thành
autonumber
actor "Admin / Quản lý" as User
boundary "Giao diện Reports" as UI
control "API Gateway" as Gateway
control "Orders Service" as Orders
control "Inventory Service" as InvService
database "MongoDB" as DB

User -> UI: Truy cập trang Báo cáo
activate UI
UI -> Gateway: GET /api/reports/dashboard/summary?branchId=...
activate Gateway
Gateway -> Gateway: Validate JWT Token & Check Role Guard
alt Hợp lệ (Admin hoặc đúng branchId)
  Gateway -> Orders: Gọi lấy dữ liệu doanh thu (Kafka / HTTP)
  activate Orders
  Orders -> DB: Aggregate đơn hàng & doanh thu thuần
  DB --> Orders: Kết quả doanh thu
  Orders --> Gateway: Trả về doanh thu gộp & thuần
  deactivate Orders

  Gateway -> InvService: Gọi lấy dữ liệu tồn kho (Kafka / HTTP)
  activate InvService
  InvService -> DB: Tính tổng tồn kho & cảnh báo ROP
  DB --> InvService: Kết quả tồn kho
  InvService --> Gateway: Trả về thông tin tồn kho
  deactivate InvService

  Gateway --> UI: 200 OK (JSON tổng hợp KPI)
  UI --> User: Hiển thị các thẻ chỉ số KPI nhanh
else Không hợp lệ (Truy cập chéo chi nhánh)
  Gateway --> UI: 403 Forbidden
  UI --> User: Hiển thị thông báo từ chối truy cập
end
deactivate Gateway
deactivate UI
@enduml
```

---

## 7. UC-39: PHÂN TÍCH XU HƯỚNG BÁN HÀNG THEO MÙA / DỊCH BỆNH (AI INSIGHTS)

### A. Luồng nghiệp vụ
1. Người dùng (Admin hoặc Quản lý chi nhánh) truy cập Tab **Xu hướng mùa & dịch bệnh (AI)** trên trang Báo cáo.
2. Hệ thống kiểm tra trong Redis cache key `reports:seasonal-analysis:{branchId}:{currentMonth}` (Cơ chế Cache-Aside).
   - Nếu có cache (Cache Hit): Trả về ngay kết quả phân tích trong vòng vài mili-giây để tối ưu trải nghiệm.
   - Nếu không có cache (Cache Miss): Hệ thống kích hoạt quy trình phân tích lai (Hybrid AI).
3. **Quy trình phân tích lai (Hybrid AI):**
   - **Bước 1 (Tính toán định lượng):** Backend truy vấn lịch sử bán hàng 12 tháng gần nhất, đồng thời truy vấn Lead Time và MOQ của nhà cung cấp liên đới.
   - **Bước 2 (Giải thuật dự báo):** Gửi dữ liệu thô sang Python AI Service. Nếu số điểm dữ liệu lịch sử >= 4, sử dụng **Hồi quy tuyến tính (Linear Regression)** để xác định đường xu hướng và dự phòng 3 tháng tiếp theo. Nếu < 4, sử dụng **Trung bình trượt (Moving Average)**. Tính toán khoảng tin cậy 95% (Confidence Interval) và sai số để cho ra điểm số **Forecast Confidence**.
   - **Bước 3 (Lập luận AI & Guardrails):** Dữ liệu được đưa qua Groq LLM (Llama-3.3) để phân tích yếu tố vùng miền khí hậu Việt Nam & các mùa dịch tễ học đặc trưng. Áp dụng Epidemic Guardrails nghiêm ngặt (ví dụ: chỉ cảnh báo nguy cơ sốt xuất huyết khi nhóm thuốc chỉ báo gồm Paracetamol + Oresol + Thuốc xịt muỗi cùng tăng). LLM tự đánh giá **Explainability Confidence**.
   - **Bước 4 (Caching):** Lưu kết quả vào Redis Cache với TTL 24 giờ.
4. **Vô hiệu hóa cache tự động (Cache Eviction):** Khi có đơn bán hàng mới (`createSalesOrder`) hoặc phiếu nhập kho hoàn tất (`approveGoodsReceiptNote`), hệ thống tự động xóa cache của chi nhánh để đảm bảo tính thời gian thực ở lần tải tiếp theo. Người dùng cũng có thể bấm nút "Làm mới phân tích" để xóa cache thủ công.
5. **Tạo đơn PR điền sẵn thông tin (Prefill PR):** Tại bảng khuyến nghị tăng tồn kho, người dùng có thể bấm nút **"Nhập hàng"**. Hệ thống sẽ chuyển hướng sang trang tạo Yêu cầu mua hàng (PR - đối với Chi nhánh) hoặc Đơn đặt hàng (PO - đối với HQ) với các thông tin được điền sẵn từ AI: ID thuốc, số lượng đề xuất, và lý do AI đề xuất làm chứng cứ lưu vết (`isAiGenerated: true`, `aiConfidence`, `aiReason`, `aiAnalysisVersion`).

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Dự báo xu hướng & AI Insights (UC-39) - Thành
start
:Admin/Quản lý vào tab "Xu hướng mùa & dịch bệnh (AI)";
:Hệ thống kiểm tra cache Redis cho chi nhánh đã chọn;
if (Tìm thấy cache (Cache Hit)?) then (Có)
  :Lấy dữ liệu từ Redis và trả về ngay;
else (Không (Cache Miss))
  :Truy vấn lịch sử bán hàng 12 tháng từ DB;
  :Python AI Service chạy mô hình dự phóng;
  if (Số điểm dữ liệu lịch sử >= 4?) then (Có)
    :Chạy giải thuật Hồi quy tuyến tính (Linear Regression);
  else (Không)
    :Chạy giải thuật Trung bình trượt (Moving Average);
  endif
  :Tính khoảng tin cậy 95% (CI) & Forecast Confidence;
  :Gửi dữ liệu qua Groq LLM (Llama-3.3) kèm Epidemiological Guardrails;
  :LLM sinh phân tích, chỉ số giải thích & khuyến nghị tồn kho;
  :Lưu kết quả phân tích vào Redis Cache (TTL 24h);
endif
:Hiển thị Dashboard: Biểu đồ xu hướng, Cảnh báo dịch bệnh, Khuyến nghị;
if (Người dùng click "Nhập hàng" tại bảng khuyến nghị?) then (Có)
  :Tự động chuyển sang form PR/PO;
  :Điền sẵn thông tin thuốc, số lượng đề xuất, lý do AI gợi ý;
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Dự báo xu hướng & AI Insights (UC-39) - Thành
autonumber
actor "Quản lý / Admin" as User
boundary "Seasonal Analysis UI" as UI
control "API Gateway" as Gateway
database "Redis Cache" as Redis
control "Inventory Service" as InvService
control "AI Service (FastAPI)" as AIService
entity "Groq LLM (Llama-3.3)" as LLM

User -> UI: Chọn tab "Xu hướng mùa & dịch bệnh (AI)"
activate UI
UI -> Gateway: GET /api/reports/seasonal-analysis?branchId=...
activate Gateway
Gateway -> Redis: Check cache: reports:seasonal-analysis:...
activate Redis
alt Cache Hit
  Redis --> Gateway: Trả về kết quả phân tích đã lưu
else Cache Miss
  Redis --> Gateway: null
  deactivate Redis
  Gateway -> InvService: Lấy lịch sử doanh số 12 tháng & thông tin nhà cung cấp
  activate InvService
  InvService --> Gateway: Dữ liệu doanh số & nhà cung cấp (JSON)
  deactivate InvService
  
  Gateway -> AIService: POST /analyze-trends (sales history)
  activate AIService
  AIService -> AIService: Chạy dự báo (Linear Regression / Moving Avg) & tính 95% CI
  AIService -> LLM: Gửi dữ liệu & Prompt lập luận dịch tễ học
  activate LLM
  LLM --> AIService: Chuỗi lập luận giải thích & khuyến nghị nhập hàng
  deactivate LLM
  AIService --> Gateway: Kết quả tích hợp (Math Forecast + LLM Insights)
  deactivate AIService

  Gateway -> Redis: Lưu kết quả phân tích (TTL 24h)
end

Gateway --> UI: 200 OK (JSON phân tích xu hướng)
UI --> User: Render biểu đồ đường 95% CI, cảnh báo Outbreaks & khuyến nghị
deactivate Gateway
deactivate UI
@enduml
```

---

## 8. MOBILE: ĐĂNG NHẬP GOOGLE TRÊN DI ĐỘNG

### A. Luồng nghiệp vụ
1. Người dùng mở ứng dụng di động trên điện thoại, tại màn hình Login chọn "Đăng nhập bằng Google".
2. Hệ thống mở một màn hình `GoogleWebViewScreen` để tải trang đăng nhập OAuth 2.0 chính thức của Google.
3. Người dùng nhập email và mật khẩu Google, sau đó xác nhận cấp quyền truy cập.
4. Google thực hiện xác thực và redirect về Callback URL cấu hình sẵn kèm mã ủy quyền Authorization Code.
5. Ứng dụng Mobile lắng nghe sự thay đổi của WebView, trích xuất mã code từ URL và gửi nó lên Backend (`POST /api/auth/google-login`).
6. Backend (Auth Service) dùng mã code này để trao đổi với Google API lấy User Profile (Email, Họ tên).
7. Hệ thống tìm kiếm User theo Email trong MongoDB. Nếu chưa tồn tại, tự động tạo mới tài khoản với vai trò (Role) mặc định.
8. Backend trả về JWT Access Token cho ứng dụng Mobile.
9. Mobile lưu trữ token vào bộ nhớ an toàn (Secure Storage) và chuyển hướng người dùng vào màn hình chính của Thủ kho (`WarehouseScreen`) hoặc Dược sĩ (`PharmacistScreen`).

### B. Activity Diagram (PlantUML)
```plantuml
@startuml
title Activity Diagram - Mobile Google Login - Thành
start
:Người dùng mở Mobile App;
:Nhấn nút "Đăng nhập bằng Google";
:Hệ thống mở Webview tích hợp Google OAuth;
:Người dùng nhập tài khoản & mật khẩu Google;
:Google xác thực tài khoản;
if (Xác thực thành công?) then (Có)
  :Google redirect kèm Authorization Code/Token;
  :Mobile App trích xuất code và gửi lên API Gateway;
  :Backend gọi Auth Service để verify Google Token;
  if (Tài khoản đã tồn tại trong hệ thống?) then (Có)
    :Lấy thông tin User;
  else (Không)
    :Tạo tài khoản User mới trong DB với Email Google;
  endif
  :Backend tạo và trả về JWT Access Token;
  :Mobile App lưu trữ JWT an toàn;
  :Chuyển hướng vào màn hình chính (Thủ kho / Dược sĩ);
else (Không)
  :Hiển thị thông báo "Đăng nhập Google thất bại";
endif
stop
@enduml
```

### C. Sequence Diagram (PlantUML)
```plantuml
@startuml
title Sequence Diagram - Mobile Google Login - Thành
autonumber
actor "Người dùng Mobile" as User
boundary "Mobile App (LoginScreen)" as Mobile
boundary "Google WebView" as WebView
control "Google OAuth Provider" as Google
control "API Gateway / Auth Service" as Auth
database "MongoDB" as DB

User -> Mobile: Click "Đăng nhập bằng Google"
activate Mobile
Mobile -> WebView: Mở Webview hiển thị Google Sign-In Page
activate WebView
WebView -> Google: Yêu cầu trang đăng nhập OAuth
Google --> WebView: Hiển thị giao diện đăng nhập
User -> WebView: Nhập thông tin tài khoản Google
WebView -> Google: Xác thực thông tin credentials
Google --> WebView: Trả về Redirect URL kèm Authorization Code
WebView --> Mobile: Callback URL (Auth Code)
deactivate WebView

Mobile -> Auth: POST /api/auth/google-login { code }
activate Auth
Auth -> Google: Verify Authorization Code
Google --> Auth: Trả về User Profile (Email, Name)
Auth -> DB: Tìm kiếm User theo email
activate DB
alt User chưa tồn tại
  Auth -> DB: Tạo User mới (Role mặc định)
end
DB --> Auth: Thông tin User
deactivate DB
Auth -> Auth: Sinh JWT Access Token
Auth --> Mobile: Trả về JWT Token & Thông tin User
deactivate Auth
Mobile -> Mobile: Lưu JWT vào Secure Storage
Mobile --> User: Chuyển hướng tới Warehouse / Pharmacist Screen
deactivate Mobile
@enduml
```

---

## 9. 📝 KỊCH BẢN DEMO & TEST LIỀN MẠCH THEO LUỒNG NGHIỆP VỤ (DÀNH CHO GIÁO VIÊN)

Để buổi Demo đạt hiệu quả cao nhất và thuyết phục người chấm, kịch bản dưới đây được thiết kế theo **Luồng nghiệp vụ thực tế (User Journey)** thay vì liệt kê rời rạc theo số thứ tự UC. 

Sự sắp xếp này giúp bạn **kể một câu chuyện vận hành khép kín** (từ lúc Cấu hình -> Bán lẻ -> Kiểm kho -> Xem báo cáo & AI gợi ý -> Kiểm tra nhật ký bảo mật) giúp tiết kiệm thời gian chuyển đổi tài khoản và thiết bị.

---

### PHẦN 1: CẤU HÌNH HỆ THỐNG BAN ĐẦU (ADMIN WEB)
*Mục tiêu: Đăng nhập quyền cao nhất để thiết lập mạng lưới chi nhánh và chương trình khuyến mãi chuẩn bị cho hoạt động kinh doanh.*

| Bước Demo | Chức năng (UC) | Vai trò | Giao diện & Thao tác | Kết quả mong đợi (Bằng chứng chứng minh) |
| :--- | :--- | :--- | :--- | :--- |
| **Bước 1** | **UC-24: Quản lý chi nhánh** | `admin` | - Vào trang **Quản lý chi nhánh** (`/admin/branches`).<br>- Click **"Thêm chi nhánh"** -> Điền thông tin chi nhánh mới.<br>- Click nút thay đổi trạng thái hoạt động (ví dụ: Active -> Suspended -> Closed). | - Chi nhánh mới được hiển thị ngay lập tức trong bảng dữ liệu.<br>- Trạng thái hoạt động thay đổi màu sắc trực quan (Suspended - cam, Closed - đỏ, Active - xanh). |
| **Bước 2** | **UC-47: Tạo Voucher** | `admin` | - Vào trang **Quản lý Voucher** (`/admin/vouchers`).<br>- Click **"Tạo chương trình mới"**.<br>- Tạo một mã Voucher mới: ví dụ `DEMO20` (Giảm 20% cho đơn tối thiểu từ 100k, kích hoạt trạng thái `ACTIVE`). | - Voucher mới xuất hiện trong danh sách với trạng thái `ACTIVE` (đồng bộ trực tiếp trong MongoDB). |

---

### PHẦN 2: BÁN LẺ TẠI QUẦY & ÁP DỤNG KHUYẾN MÃI (PHARMACIST POS)
*Mục tiêu: Thực hiện bán thuốc cho khách hàng, chứng minh tính năng tìm kiếm, giỏ hàng, cảnh báo tồn kho và cơ chế trừ tiền của Voucher vừa tạo ở Phần 1.*

| Bước Demo | Chức năng (UC) | Vai trò | Giao diện & Thao tác | Kết quả mong đợi (Bằng chứng chứng minh) |
| :--- | :--- | :--- | :--- | :--- |
| **Bước 3** | **UC-01: Bán lẻ & Giỏ hàng POS** | `pharmacist` / Khách hàng | - Vào màn hình POS bán lẻ tại quầy hoặc Shop Khách hàng.<br>- Tìm kiếm thuốc bằng từ khóa (ví dụ: `Paracetamol`).<br>- Chọn thuốc, nhập số lượng cần bán và bấm **"Thêm vào giỏ"**.<br>- **Test Cảnh báo:** Nhập số lượng lớn vượt quá số tồn kho khả dụng hiện tại. | - Giỏ hàng cập nhật tức thì: hiển thị tên thuốc, số lượng, đơn giá, tổng tạm tính.<br>- Hệ thống hiển thị Toast cảnh báo đỏ *"Không đủ hàng tồn kho"* khi nhập quá số lượng khả dụng. |
| **Bước 4** | **UC-02: Áp dụng Voucher tại POS** | `pharmacist` | - Tại giỏ hàng POS (đơn hàng đạt trên 100k), nhập mã Voucher `DEMO20` (được tạo ở Bước 2) và click áp dụng.<br>- Nhấn thanh toán để hoàn tất đơn hàng. | - Hệ thống tự động kiểm tra điều kiện áp dụng, giảm trừ 20% trên tổng giá trị hóa đơn.<br>- Màn hình POS hiển thị chi tiết số tiền được chiết khấu và tổng số tiền khách cần trả sau giảm giá. |

---

### PHẦN 3: VẬN HÀNH KHO & ĐỒNG BỘ DI ĐỘNG (MOBILE APP)
*Mục tiêu: Chuyển sang thiết bị di động, chứng minh tính năng đăng nhập không mật khẩu bằng Google và tiến hành kiểm kê thực tế bằng quét Barcode/QR Code.*

| Bước Demo | Chức năng (UC) | Vai trò | Giao diện & Thao tác | Kết quả mong đợi (Bằng chứng chứng minh) |
| :--- | :--- | :--- | :--- | :--- |
| **Bước 5** | **Đăng nhập Google trên Mobile** | Thủ kho (`warehouse`) | - Mở ứng dụng di động.<br>- Tại màn hình đăng nhập, bấm chọn **"Đăng nhập bằng Google"**.<br>- Tiến hành nhập tài khoản Gmail trên giao diện WebView Google OAuth. | - Xác thực thành công, hệ thống tự động nhận diện tài khoản, lấy JWT Token lưu vào secure storage và dẫn thẳng vào màn hình chức năng của Thủ kho. |
| **Bước 6** | **UC-19: Kiểm kê kho bằng Barcode** | Thủ kho (`warehouse`) | - Trên Mobile App, vào màn hình **Kiểm kê kho (Stocktake)**.<br>- Kích hoạt camera quét mã vạch/QR trên hộp thuốc thực tế trên kệ. | - Camera nhận diện mã vạch cực nhanh, tự động tăng số lượng đếm thực tế lên +1 sau mỗi lần quét.<br>- Màn hình hiển thị đối chiếu trực quan chênh lệch Lệch thừa / Lệch thiếu so với tồn kho lý thuyết trên hệ thống để thủ kho xác nhận và lưu. |

---

### PHẦN 4: BÁO CÁO DOANH THU, DỰ BÁO AI & GIÁM SÁT REAL-TIME (ADMIN WEB)
*Mục tiêu: Đăng nhập lại Admin để xem bức tranh tổng thể sau giao dịch bán hàng, xem dự báo xu hướng mùa của AI và chứng minh tính minh bạch của toàn bộ hệ thống thông qua Audit Log.*

| Bước Demo | Chức năng (UC) | Vai trò | Giao diện & Thao tác | Kết quả mong đợi (Bằng chứng chứng minh) |
| :--- | :--- | :--- | :--- | :--- |
| **Bước 7** | **UC-25: Dashboard tổng toàn chuỗi** | `admin` | - Vào trang **Báo cáo & Dashboard** (`/admin/reports`).<br>- Xem các thẻ KPI Doanh thu thuần, Tổng giá trị tồn kho.<br>- Chuyển đổi dropdown chi nhánh để xem lọc số liệu.<br>- Click tab **Phân tích doanh thu (BI)**. | - Doanh thu thuần cập nhật tăng thêm ngay lập tức sau đơn hàng ở Bước 4.<br>- **Chứng minh Lazy loading:** Bật Tab Network trong DevTools để chứng minh bundle JS của các tab BI chỉ được tải xuống máy khách khi người dùng click chọn tab. |
| **Bước 8** | **UC-39: Dự báo xu hướng AI & PR Prefill** | `admin` / `branch` | - Tại trang Báo cáo, chọn tab **Xu hướng mùa & dịch bệnh (AI)**.<br>- Xem biểu đồ dự báo 95% Confidence Interval (Toán học) và cảnh báo bùng phát dịch bệnh (Groq LLM).<br>- Nhấn nút **"Làm mới phân tích"** để xóa cache và ép AI chạy lại từ đầu.<br>- Tại bảng đề xuất của AI, bấm **"Nhập hàng"** cạnh dòng thuốc được đề xuất. | - Lần tải 2 báo *Cache Hit (Redis)*. Khi bấm "Làm mới phân tích", màn hình hiển thị loading tính toán mới (Cache Miss).<br>- Khi bấm "Nhập hàng", hệ thống tự động chuyển sang form tạo PR (hoặc PO) với các thông tin đã được điền sẵn: Thuốc, Số lượng đề xuất, Lý do AI đề xuất làm chứng cứ lưu vết. |
| **Bước 9** | **UC-59: Nhật ký Audit Log Real-time** | `admin` | - Mở song song trang **Nhật ký hệ thống** (`/admin/audit-logs`).<br>- Bạn có thể thực hiện một hành động nhanh khác (Ví dụ: tạo thêm voucher hoặc duyệt PO). | - Giao diện hiển thị trực quan nhật ký hành động dạng real-time (sử dụng Websocket): các dòng log tự động đẩy lên đầu danh sách mà không cần tải lại trang, hiển thị rõ: *Ai thực hiện, hành động gì (APPROVE_PO, CREATE_VOUCHER...), thời gian và thiết bị nào*. |

---

## 💻 HƯỚNG DẪN XUẤT ẢNH BẰNG PLANTTEXT
1. Truy cập [https://www.planttext.com](https://www.planttext.com)
2. Copy đoạn mã từ `@startuml` đến `@enduml` dán vào khung bên trái.
3. Bấm **Generate** để kết xuất ảnh PNG chất lượng cao.
