
# Tiêu chuẩn Code Backend (Microservices)

Dự án WDP301 sử dụng kiến trúc Microservices. Để code gọn gàng, dễ bảo trì và không bị biến thành "nồi lẩu thập cẩm", mọi người tuân thủ các quy tắc cốt lõi sau:

## 1. Quy tắc Database độc lập (Database Per Service)

Mỗi Microservice phải tự quản lý Database của riêng mình.

* **KHÔNG tạo Khóa ngoại (Foreign Key) chéo:** Tuyệt đối **KHÔNG** dùng các decorator như `@ManyToOne` hay `@OneToMany` giữa các bảng thuộc 2 service khác nhau.
  * *Cách làm đúng:* Chỉ lưu ID dưới dạng một cột bình thường (VD: `userId: number` trong bảng `orders`). Bảng `orders` sẽ không có khóa ngoại nối thực sự sang bảng `users`.
* **KHÔNG Query chéo:** Tuyệt đối không được viết câu lệnh truy vấn (SQL/ORM) chọc thẳng vào Database của một service khác. Nếu cần dữ liệu, hãy gọi qua API của service đó.

## 2. Tổ chức thư mục theo Tính năng (Package by Feature)

Thay vì chia thư mục theo kỹ thuật, hãy gom tất cả các file liên quan đến 1 tính năng vào chung một chỗ.
Ví dụ cấu trúc thư mục của một tính năng `stock` (Quản lý tồn kho):

```text
src/modules/stock/
├── stock.controller.ts   # Nhận request, trả response (KHÔNG viết logic ở đây)
├── stock.service.ts      # Chứa logic nghiệp vụ (tính toán, xử lý luồng)
├── stock.repository.ts   # Gọi xuống Database (thêm, sửa, xóa, tìm kiếm)
├── stock.model.ts        # Định nghĩa bảng/schema database
└── stock.dto.ts          # Định nghĩa dữ liệu đầu vào/đầu ra
```

## 3. Luồng dữ liệu 1 chiều (Data Flow)

Mọi Request đi vào hệ thống phải đi theo luồng chuẩn:
**Client** ➔ **Controller** ➔ **Service** ➔ **Repository** ➔ **Database**

## 4. Quy tắc đặt tên (Naming Convention)

* **Thư mục và File:** Dùng chữ thường, cách nhau bằng gạch ngang (`kebab-case`).
  * *Ví dụ:* `order-history`, `stock.controller.ts`
* **Tên Class:** Viết hoa chữ cái đầu (`PascalCase`).
  * *Ví dụ:* `StockController`, `OrderService`
* **Tên hàm (Function) & Biến:** Viết thường chữ đầu (`camelCase`).
  * *Ví dụ:* `createOrder()`, `totalPrice`
