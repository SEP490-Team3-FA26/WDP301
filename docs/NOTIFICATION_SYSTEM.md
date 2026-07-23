# Hệ Thống Notification (Real-time & Persistence) - WDP301

Tài liệu này tổng hợp cấu trúc, luồng hoạt động và hướng dẫn kiểm thử (test guide) cho hệ thống Notification, giúp AI/Developer dễ dàng kế thừa, debug và bảo trì sau này.

## 1. Cấu Trúc Hệ Thống (Architecture)

Hệ thống Notification bao gồm 3 thành phần chính:

1. **WebSocket Gateway (`AppWebsocketGateway`)**:
   - Khởi tạo kết nối Socket.IO tại port `4000` (cùng port với API Gateway).
   - Quản lý các "room" để gửi thông báo nhắm mục tiêu (targeted notifications):
     - `admin`: Nhận thông báo chung cho HQ (ví dụ: Tạo PO).
     - `warehouse`: Nhận thông báo từ kho (ví dụ: Tạo PR mới, PO về kho).
     - `branch-{branchId}`: Nhận thông báo riêng cho từng chi nhánh (ví dụ: PR được phê duyệt/từ chối).

2. **Notification Service & Schema (`NotificationModule`)**:
   - Schema Mongoose (`notification.schema.ts`): Lưu trữ lịch sử thông báo vào MongoDB.
   - Hỗ trợ đánh dấu "Đã đọc" (readBy) và tự động xóa sau 90 ngày (TTL index).
   - CRUD cơ bản: `create`, `findAllForRoom`, `markAsRead`, `getUnreadCount`.

3. **Tích hợp vào Controllers**:
   - `PurchaseRequisitionController`: Bắn thông báo qua websocket và lưu vào DB khi PR được tạo (gửi `warehouse`), được Approve/Reject (gửi `branch-{branchId}`).
   - `PurchaseOrderController`: Bắn thông báo khi PO được tự động tạo (gửi `admin`).

## 2. Các Loại Thông Báo (Notification Types)

Hiện tại hệ thống hỗ trợ các loại sự kiện sau:

- `NEW_PR`: Chi nhánh tạo PR mới → Gửi cho Room `warehouse`.
- `PR_APPROVED`: Admin duyệt PR → Gửi cho Room `branch-{branchId}`.
- `PR_REJECTED`: Admin từ chối PR → Gửi cho Room `branch-{branchId}`.
- `NEW_PO`: PO tự động được tạo từ PR → Gửi cho Room `admin`.
- `GRN_COMPLETED`: Nhập kho (PO thành công) → Gửi cho Room `admin` & `branch-{branchId}`.

## 3. Hướng Dẫn Test Hệ Thống (Test Guide)

Dưới đây là các bước để bạn có thể kiểm thử toàn bộ hệ thống notification một cách hoàn chỉnh nhất.

### Cách 1: Test qua Giao diện Web (Mô phỏng 3 user)

Để test luồng hoàn chỉnh, bạn mở 3 tab ẩn danh (hoặc 3 trình duyệt khác nhau), đăng nhập vào 3 role tương ứng:

1. **Tab 1 - Chi nhánh (Role: Branch / Pharmacist)**:
   - Đăng nhập tài khoản của một chi nhánh (Ví dụ: `BR-001`).
   - Vào màn hình tạo **Yêu cầu mua hàng (Purchase Requisition - PR)**.
   - Nhấn tạo PR mới.

2. **Tab 2 - Kho (Role: Warehouse)**:
   - Đăng nhập tài khoản quản lý Kho.
   - Ngay khi Tab 1 tạo PR, **Tab 2 phải nhận được thông báo (Toast/Bell Icon)** báo có `NEW_PR`.
   - Vào danh sách PR, thực hiện **Gộp PR (Consolidate)** và Gửi lên Admin duyệt.

3. **Tab 3 - Admin (Role: Admin / HQ)**:
   - Đăng nhập tài khoản Admin.
   - Vào danh sách PR đang chờ duyệt. Bấm **Phê duyệt (Approve)** hoặc **Từ chối (Reject)**.
   - Ngay khi duyệt, **Tab 1 (Chi nhánh)** phải nhận được thông báo `PR_APPROVED` / `PR_REJECTED`.
   - Nếu được Approve và hệ thống tự động sinh PO, **Tab 3 (Admin)** sẽ nhận được thông báo `NEW_PO`.

### Cách 2: Test bằng cURL hoặc API Platform (Postman/Insomnia)

Bạn có thể bắn API RESTful thẳng vào API Gateway. Các websocket sẽ tự động phát sóng.

**1. Tạo PR (Chi nhánh gửi - Gửi tới Warehouse)**
```bash
curl -X POST http://localhost:4000/api/purchase-requisitions \
  -H "Authorization: Bearer <TOKEN_CHI_NHANH>" \
  -H "Content-Type: application/json" \
  -d '{"branchId": "BR-001", "branchName": "Chi nhánh 1", "items": [{"medicineId": "med1", "requestedQuantity": 100}]}'
```
*Kết quả:* Sẽ có event socket `new_pr_notification` bắn tới room `warehouse`.

**2. Approve PR (Admin duyệt - Gửi tới Branch)**
```bash
curl -X PATCH http://localhost:4000/api/purchase-requisitions/60c72b2f9b1d8b3a4c8e1a12/status \
  -H "Authorization: Bearer <TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED", "approvedBy": "AdminHQ"}'
```
*Kết quả:* Sẽ có event socket `pr_approved_notification` bắn tới room `branch-BR-001`.

### Cách 3: Test WebSockets độc lập bằng tool

Nếu chỉ muốn xem socket có phát không, dùng `wscat` hoặc **Postman (chọn WebSocket Request)**.

- URL kết nối: `ws://localhost:4000`
- Trong Postman, kết nối tới WebSocket URI, sau đó gửi message tham gia room:
  - Gửi event: `join_room`, Payload: `"warehouse"`
  - Gọi API Tạo PR như Cách 2. Bạn sẽ thấy Postman nhận được thông báo trực tiếp qua luồng socket.

## 4. Công Cụ Hỗ Trợ Mô Phỏng / Test (Automation Tools)

Nếu bạn muốn tạo môi trường test TỰ ĐỘNG, hoặc script để mô phỏng 100 users, có thể dùng các tool sau:

1. **Cypress / Playwright (Khuyên dùng cho Frontend E2E)**:
   - Đây là các tool automation browser mạnh mẽ. Bạn viết code Javascript cho phép trình duyệt tự bật lên, đăng nhập account 1, ấn nút tạo PR. Mở cửa sổ thứ 2, kiểm tra xem có bell thông báo hiện lên không.
   
2. **K6 (Load Testing & WebSocket Testing)**:
   - Nếu bạn muốn mô phỏng 1000 chi nhánh cùng tạo PR để xem hệ thống Socket có bị sập không, hãy dùng **Grafana K6**. K6 hỗ trợ tạo kết nối Websocket và gọi API giả lập tải.

3. **Socket.IO-client Script (NodeJS)**:
   - Tự viết một file test ngắn bằng Node.js:
     ```javascript
     const { io } = require("socket.io-client");
     const socket = io("http://localhost:4000");
     
     socket.emit('join_room', 'warehouse');
     socket.on('new_pr_notification', (data) => {
       console.log("WAREHOUSE NHẬN ĐƯỢC:", data);
     });
     ```

---
*Tài liệu này được sinh tự động sau quá trình hoàn thiện Notification Module. Hãy giữ lại làm reference cho tương lai.*
