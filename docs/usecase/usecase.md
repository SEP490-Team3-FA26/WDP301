| STT | Nhóm Module        | Mã UC | Tên Chức Năng                                          | QL Chi nhánh | NV Bán hàng | Thủ kho | Khách hàng | Admin Tổng | Microservice                               | Giai đoạn   |
| -----| --------------------| -------| --------------------------------------------------------| --------------| -------------| ---------| ------------| ------------| --------------------------------------------| -------------|
| 1   | Bán hàng           | UC-01 | Bán lẻ – tìm kiếm & thêm thuốc vào giỏ hàng            | ✓            | ✓           | -       | -          | ✓          | Order Service                              | Giai đoạn 3 |
| 2   | Bán hàng           | UC-02 | Bán lẻ – áp dụng khuyến mãi / mã giảm giá              | ✓            | ✓           | -       | -          | ✓          | Promotion & Pricing Service                | Giai đoạn 3 |
| 3   | Bán hàng           | UC-03 | Bán lẻ – xác nhận thanh toán & in hóa đơn              | ✓            | ✓           | -       | -          | ✓          | Payment & Billing Service                  | Giai đoạn 3 |
| 4   | Bán hàng           | UC-04 | Bán theo đơn thuốc – quét QR đơn điện tử               | ✓            | ✓           | -       | -          | ✓          | Order Service                              | Giai đoạn 3 |
| 5   | Bán hàng           | UC-05 | Bán theo đơn thuốc – kiểm tra tương tác thuốc          | ✓            | ✓           | -       | -          | ✓          | AI Clinical & Recommendation Service       | Giai đoạn 5 |
| 6   | Bán hàng           | UC-06 | Bán sỉ – lập hóa đơn sỉ & áp giá bậc thang             | ✓            | ✓           | -       | -          | ✓          | Order Service                              | Giai đoạn 3 |
| 7   | Bán hàng           | UC-07 | Bán sỉ – quản lý hạn mức công nợ đại lý                | ✓            | -           | -       | -          | ✓          | Payment & Billing Service                  | Giai đoạn 3 |
| 8   | Bán hàng           | UC-08 | Hoàn trả – xử lý đổi / trả hàng                        | ✓            | ✓           | -       | -          | ✓          | Order Service                              | Giai đoạn 3 |
| 9   | Bán hàng           | UC-09 | Hoàn trả – hoàn tiền & cập nhật tồn kho                | ✓            | ✓           | -       | -          | ✓          | Payment & Billing Service                  | Giai đoạn 3 |
| 10  | Bán hàng           | UC-10 | Tích điểm & quy đổi điểm khách hàng thân thiết         | ✓            | ✓           | -       | ✓          | ✓          | Loyalty Service                            | Giai đoạn 4 |
| 11  | Bán hàng           | UC-11 | Tạm giữ đơn hàng (Hold order) chờ dược sĩ xác nhận     | ✓            | ✓           | -       | -          | ✓          | Order Service                              | Giai đoạn 3 |
| 12  | Bán hàng           | UC-12 | Gửi hóa đơn điện tử qua email / Zalo OA                | ✓            | ✓           | -       | -          | ✓          | Notification Service                       | Giai đoạn 4 |
| 13  | Kho thông minh     | UC-13 | Nhập kho – tạo phiếu nhập & chọn nhà cung cấp          | ✓            | -           | ✓       | -          | ✓          | Warehouse Operation Service                | Giai đoạn 2 |
| 14  | Kho thông minh     | UC-14 | Nhập kho – scan QR/Barcode bằng Mobile                 | ✓            | -           | ✓       | -          | ✓          | Warehouse Operation Service                | Giai đoạn 2 |
| 15  | Kho thông minh     | UC-15 | Nhập kho – nhập thông tin lô / HSD / số lô             | ✓            | -           | ✓       | -          | ✓          | Inventory Service                          | Giai đoạn 2 |
| 16  | Kho thông minh     | UC-16 | Xuất kho – xuất theo FIFO & cảnh báo gần HSD           | ✓            | -           | ✓       | -          | ✓          | Inventory Service                          | Giai đoạn 2 |
| 17  | Kho thông minh     | UC-17 | Xuất kho – tạo phiếu xuất nội bộ (không bán)           | ✓            | -           | ✓       | -          | ✓          | Warehouse Operation Service                | Giai đoạn 2 |
| 18  | Kho thông minh     | UC-18 | Kiểm kê – tạo phiên kiểm kê theo khu vực / toàn bộ     | ✓            | -           | ✓       | -          | ✓          | Stocktaking Service                        | Giai đoạn 2 |
| 19  | Kho thông minh     | UC-19 | Kiểm kê – scan & đối chiếu số lượng thực tế            | ✓            | -           | ✓       | -          | ✓          | Stocktaking Service                        | Giai đoạn 2 |
| 20  | Kho thông minh     | UC-20 | Kiểm kê – lưu biên bản & điều chỉnh tồn kho            | ✓            | -           | ✓       | -          | ✓          | Stocktaking Service                        | Giai đoạn 2 |
| 21  | Kho thông minh     | UC-21 | Chuyển kho – tạo phiếu điều chuyển giữa chi nhánh      | ✓            | -           | -       | -          | ✓          | Transfer & Logistics Service               | Giai đoạn 2 |
| 22  | Kho thông minh     | UC-22 | Chuyển kho – xác nhận xuất / nhận hàng bằng QR         | ✓            | -           | ✓       | -          | ✓          | Transfer & Logistics Service               | Giai đoạn 2 |
| 23  | Kho thông minh     | UC-23 | Truy xuất nguồn gốc lô thuốc (Lot Tracking)            | ✓            | -           | ✓       | -          | ✓          | Inventory Service                          | Giai đoạn 2 |
| 24  | Chuỗi Chi nhánh    | UC-24 | Quản lý chi nhánh – thêm / sửa / xóa chi nhánh         | -            | -           | -       | -          | ✓          | Branch Management Service                  | Giai đoạn 1 |
| 25  | Chuỗi Chi nhánh    | UC-25 | Dashboard tổng – xem doanh thu & tồn kho toàn chuỗi    | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 26  | Chuỗi Chi nhánh    | UC-26 | So sánh hiệu suất kinh doanh giữa các chi nhánh        | -            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 27  | Chuỗi Chi nhánh    | UC-27 | Phân bổ hạn mức nhập hàng cho từng chi nhánh           | -            | -           | -       | -          | ✓          | Branch Management Service                  | Giai đoạn 2 |
| 28  | Chuỗi Chi nhánh    | UC-28 | Đồng bộ danh mục thuốc & giá bán toàn chuỗi            | ✓            | -           | -       | -          | ✓          | Branch Management Service                  | Giai đoạn 1 |
| 29  | Chuỗi Chi nhánh    | UC-29 | Gợi ý điều phối hàng tự động giữa chi nhánh            | ✓            | -           | -       | -          | ✓          | Branch Management Service                  | Giai đoạn 2 |
| 30  | Chuỗi Chi nhánh    | UC-30 | Xem tồn kho thời gian thực của toàn chuỗi              | ✓            | -           | -       | -          | ✓          | Inventory Service                          | Giai đoạn 2 |
| 31  | Chuỗi Chi nhánh    | UC-31 | Thông báo realtime sự kiện quan trọng toàn chuỗi       | ✓            | ✓           | ✓       | -          | ✓          | Notification Service                       | Giai đoạn 4 |
| 32  | Tính năng AI       | UC-32 | Cảnh báo thuốc sắp hết hạn (phân cấp đỏ/vàng/xanh)     | ✓            | -           | ✓       | -          | ✓          | AI Inventory Alert Service                 | Giai đoạn 5 |
| 33  | Tính năng AI       | UC-33 | Đề xuất xử lý thuốc sắp hết hạn (giảm giá / trả NCC)   | ✓            | -           | -       | -          | ✓          | AI Inventory Alert Service                 | Giai đoạn 5 |
| 34  | Tính năng AI       | UC-34 | Dự báo nhu cầu nhập hàng theo kỳ (AI Forecast)         | ✓            | -           | -       | -          | ✓          | AI Forecasting Service                     | Giai đoạn 5 |
| 35  | Tính năng AI       | UC-35 | Tự động tạo đơn đặt hàng từ kết quả dự báo             | ✓            | -           | -       | -          | ✓          | AI Forecasting Service                     | Giai đoạn 5 |
| 36  | Tính năng AI       | UC-36 | Gợi ý thuốc thay thế khi hết hàng (cùng hoạt chất)     | ✓            | ✓           | -       | -          | ✓          | AI Clinical & Recommendation Service       | Giai đoạn 5 |
| 37  | Tính năng AI       | UC-37 | Phát hiện bất thường tồn kho (mất hàng, sai số lớn)    | ✓            | -           | ✓       | -          | ✓          | AI Inventory Alert Service                 | Giai đoạn 5 |
| 38  | Tính năng AI       | UC-38 | Cảnh báo tồn kho dưới mức tối thiểu an toàn            | ✓            | -           | ✓       | -          | ✓          | AI Inventory Alert Service                 | Giai đoạn 5 |
| 39  | Tính năng AI       | UC-39 | Phân tích xu hướng bán hàng theo mùa / dịch bệnh       | ✓            | -           | -       | -          | ✓          | AI Forecasting Service                     | Giai đoạn 5 |
| 40  | Quản lý Thông tin  | UC-40 | Quản lý danh mục thuốc – thêm / sửa / xóa SKU          | ✓            | -           | -       | -          | ✓          | Product Catalog Service                    | Giai đoạn 1 |
| 41  | Quản lý Thông tin  | UC-41 | Quản lý thuốc – nhóm thuốc & hoạt chất                 | ✓            | -           | -       | -          | ✓          | Product Catalog Service                    | Giai đoạn 1 |
| 42  | Quản lý Thông tin  | UC-42 | Quản lý thuốc – liên kết mã QR/Barcode với SKU         | ✓            | -           | ✓       | -          | ✓          | Product Catalog Service                    | Giai đoạn 1 |
| 43  | Quản lý Thông tin  | UC-43 | Quản lý hồ sơ khách hàng & lịch sử mua                 | ✓            | ✓           | -       | ✓          | ✓          | Customer Service                           | Giai đoạn 3 |
| 44  | Quản lý Thông tin  | UC-44 | Khách hàng tự tra cứu lịch sử đơn hàng                 | -            | -           | -       | ✓          | -          | Customer Service                           | Giai đoạn 3 |
| 45  | Quản lý Thông tin  | UC-45 | Nhắc tái khám & thông báo đơn thuốc sắp hết            | ✓            | -           | -       | ✓          | ✓          | Notification Service                       | Giai đoạn 4 |
| 46  | Quản lý Thông tin  | UC-46 | Quản lý nhà cung cấp – thêm / sửa / đánh giá NCC       | ✓            | -           | -       | -          | ✓          | Supplier Service                           | Giai đoạn 1 |
| 47  | Quản lý Thông tin  | UC-47 | Quản lý chương trình khuyến mãi & giá theo nhóm        | ✓            | -           | -       | -          | ✓          | Promotion & Pricing Service                | Giai đoạn 3 |
| 48  | Quản lý Thông tin  | UC-48 | Quản lý bảng giá bán lẻ / sỉ theo từng chi nhánh       | ✓            | -           | -       | -          | ✓          | Promotion & Pricing Service                | Giai đoạn 3 |
| 49  | Quản lý Thông tin  | UC-49 | Tra cứu thông tin thuốc (hướng dẫn sử dụng, tương tác) | ✓            | ✓           | ✓       | ✓          | ✓          | Product Catalog Service                    | Giai đoạn 1 |
| 50  | Báo cáo & Thống kê | UC-50 | Báo cáo doanh thu theo ngày / tuần / tháng / quý       | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 51  | Báo cáo & Thống kê | UC-51 | Báo cáo doanh thu theo chi nhánh & nhân viên           | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 52  | Báo cáo & Thống kê | UC-52 | Báo cáo tồn kho – nhập / xuất / tồn hiện tại           | ✓            | -           | ✓       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 53  | Báo cáo & Thống kê | UC-53 | Báo cáo lợi nhuận & biên lợi nhuận gộp                 | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 54  | Báo cáo & Thống kê | UC-54 | Báo cáo hàng bán chạy & hàng chậm luân chuyển          | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 55  | Báo cáo & Thống kê | UC-55 | Báo cáo công nợ đại lý / nhà cung cấp                  | ✓            | -           | -       | -          | ✓          | Analytics & Dashboard Service              | Giai đoạn 4 |
| 56  | Báo cáo & Thống kê | UC-56 | Xuất báo cáo ra Excel / PDF                            | ✓            | -           | -       | -          | ✓          | Report Generation Service                  | Giai đoạn 4 |
| 57  | Báo cáo & Thống kê | UC-57 | Lập lịch gửi báo cáo tự động qua email                 | ✓            | -           | -       | -          | ✓          | Report Generation Service                  | Giai đoạn 4 |
| 58  | Quản lý Hệ thống   | UC-58 | Quản lý tài khoản người dùng & phân quyền RBAC         | -            | -           | -       | -          | ✓          | Identity & Access Management (IAM) Service | Giai đoạn 1 |
| 59  | Quản lý Hệ thống   | UC-59 | Ghi nhận Audit Log – ai làm gì, lúc nào                | -            | -           | -       | -          | ✓          | System Configuration & Audit Service       | Giai đoạn 1 |
| 60  | Quản lý Hệ thống   | UC-60 | Cấu hình hệ thống: AI, thông báo, backup, ngưỡng       | -            | -           | -       | -          | ✓          | System Configuration & Audit Service       | Giai đoạn 1 |

---

## Chi tiết danh sách Use Case theo từng Giai đoạn

### Giai đoạn 1: Xây dựng nền tảng và Dữ liệu gốc
Tạo nền móng cho hệ thống như quản lý tài khoản, thiết lập chi nhánh và nhập danh sách các loại thuốc, nhà cung cấp.
*   **Quản lý người dùng & phân quyền**: UC-58
*   **Cấu hình hệ thống & Lịch sử hoạt động**: UC-59, UC-60
*   **Quản lý chi nhánh**: UC-24, UC-28
*   **Danh mục thuốc**: UC-40, UC-41, UC-42, UC-49
*   **Quản lý nhà cung cấp**: UC-46

### Giai đoạn 2: Quản lý Kho thông minh
Các nghiệp vụ liên quan đến nhập hàng, xuất hàng, kiểm đếm và luân chuyển thuốc giữa các chi nhánh.
*   **Nghiệp vụ nhập/xuất kho**: UC-13, UC-14, UC-17
*   **Quản lý tồn kho**: UC-15, UC-16, UC-23, UC-30
*   **Kiểm kê kho**: UC-18, UC-19, UC-20
*   **Luân chuyển hàng hóa**: UC-21, UC-22
*   **Điều phối hàng cho chi nhánh**: UC-27, UC-29

### Giai đoạn 3: Bán hàng và Thanh toán (Ra mắt phiên bản đầu tiên)
Bao gồm các thao tác bán hàng, tính tiền, áp dụng khuyến mãi và quản lý thông tin khách mua.
*   **Chăm sóc khách hàng**: UC-43, UC-44
*   **Xử lý đơn hàng**: UC-01, UC-04, UC-06, UC-08, UC-11
*   **Thanh toán và Công nợ**: UC-03, UC-07, UC-09
*   **Khuyến mãi và Giá bán**: UC-02, UC-47, UC-48       

### Giai đoạn 4: Tính năng nâng cao và Báo cáo thống kê
Thêm các tính năng như tích điểm, gửi thông báo tự động và các báo cáo doanh thu, tồn kho.
*   **Tích điểm khách hàng thân thiết**: UC-10
*   **Thông báo & Nhắc nhở**: UC-12, UC-31, UC-45
*   **Xuất & Gửi báo cáo**: UC-56, UC-57
*   **Báo cáo tổng quan (Dashboard)**: UC-25, UC-26, UC-50, UC-51, UC-52, UC-53, UC-54, UC-55

### Giai đoạn 5: Trí tuệ nhân tạo (AI) và Tự động hóa
Áp dụng AI để cảnh báo thuốc sắp hết hạn, dự báo nhu cầu nhập hàng và kiểm tra tương tác thuốc.
*   **AI Cảnh báo tồn kho**: UC-32, UC-33, UC-37, UC-38
*   **AI Dự báo nhu cầu**: UC-34, UC-35, UC-39
*   **AI Gợi ý thuốc lâm sàng**: UC-05, UC-36
