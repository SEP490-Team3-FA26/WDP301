# 🔔 Hướng dẫn Test Hệ Thống Thông Báo Real-time

## Tính năng đã implement

✅ **WebSocket với JWT Authentication**
- Client tự động gửi JWT token khi kết nối
- Server verify token và join room theo role

✅ **Room-based Messaging**
- `admin` room: Admin và Head Branch
- `warehouse` room: Quản lý kho
- `branch-{branchId}` room: Từng chi nhánh
- `user-{userId}` room: Personal notifications

✅ **Notification Events**
- `new_pr_notification`: Branch tạo PR → Admin nhận thông báo
- `pr_approved_notification`: Admin approve PR → Branch nhận thông báo
- `pr_rejected_notification`: Admin reject PR → Branch nhận thông báo

✅ **Frontend Features**
- NotificationBell component trong Header
- Badge hiển thị số thông báo chưa đọc
- Dropdown list notifications với actions
- Click notification → navigate to relevant page
- Browser push notifications
- Relative timestamp (vừa xong, 5 phút trước...)

---

## 🧪 Cách Test

### **Setup**

1. **Start Backend Services**:
   ```bash
   cd backend
   npm install --legacy-peer-deps
   npm run dev:all
   ```
   
2. **Start Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Verify WebSocket Connection**:
   - Mở Chrome DevTools → Console
   - Sau khi login, xem log: `✅ Socket connected to root`

---

### **Test Case 1: Branch tạo PR → Admin nhận thông báo**

#### Steps:

1. **Login as Admin** (Tab 1):
   ```
   Email: admin@vinapharmacy.com
   Password: 123456
   ```
   - Vào `/admin/approvals`
   - Quan sát NotificationBell ở Header (ban đầu không có badge)

2. **Login as Branch** (Tab 2 - Incognito):
   ```
   Email: manager@vinapharmacy.com
   Password: 123456
   ```
   - Vào `/branch/requisitions`
   - Click "Tạo yêu cầu mới"
   - Chọn thuốc, nhập số lượng
   - Click "Gửi yêu cầu"

3. **Verify Admin nhận thông báo** (Tab 1):
   - NotificationBell badge hiện số `1`
   - Console log: `🔔 New PR notification received: { prCode, branchName... }`
   - Browser notification popup (nếu đã cho phép)
   - Click Bell → xem dropdown
   - Thông báo hiển thị: "Chi nhánh X vừa tạo yêu cầu nhập hàng PR-XXXX"

4. **Test Navigation**:
   - Click vào notification
   - Tự động navigate về `/admin/approvals`
   - Thông báo được đánh dấu đã đọc (badge giảm)

---

### **Test Case 2: Multiple Notifications**

1. **Tạo nhiều PR từ Branch** (Tab 2):
   - Tạo 3-4 PR liên tiếp
   
2. **Verify Admin** (Tab 1):
   - Badge hiện số lượng đúng
   - Dropdown list hiển thị tất cả notifications
   - Notifications mới nhất ở trên cùng
   - Unread có background xanh nhạt

3. **Test Actions**:
   - Click "Đánh dấu tất cả là đã đọc" → Badge = 0
   - Click nút X để xóa từng notification
   - Click nút Trash để xóa tất cả

---

### **Test Case 3: Browser Notifications**

1. **Enable browser notifications**:
   - Khi login lần đầu, browser sẽ hỏi permission
   - Click "Allow"

2. **Test**:
   - Mở tab khác (không focus vào app)
   - Branch tạo PR
   - Browser notification popup hiện lên
   - Click notification → focus vào tab app

---

### **Test Case 4: Real-time Updates**

1. **Verify Socket Connection**:
   ```javascript
   // Trong Console (Admin tab):
   console.log('Socket connected:', !!window.socket)
   ```

2. **Test Reconnection**:
   - Dừng backend (Ctrl+C)
   - Console log: `❌ Socket disconnected`
   - NotificationBell badge có thể nhấp nháy
   - Start lại backend
   - Console log: `✅ Socket connected`

---

## 🐛 Troubleshooting

### **Không nhận được thông báo?**

1. **Check Backend Console**:
   ```
   [AppWebsocketGateway] 👤 Admin connected: admin@... (socket-id)
   [WebsocketController] 🔔 New PR notification: PR-20260710-0001 from Chi nhánh A
   ```

2. **Check Frontend Console**:
   ```
   ✅ Socket connected to root
   🔔 New PR notification received: {...}
   ```

3. **Verify JWT Token**:
   ```javascript
   localStorage.getItem('token') // Phải có giá trị
   ```

4. **Check Room Membership**:
   - Backend console phải show: `👤 Admin connected`
   - Nếu không → JWT token invalid hoặc role không đúng

### **NotificationBell không hiển thị?**

1. Check import trong `Header.tsx`:
   ```typescript
   import { NotificationBell } from "./NotificationBell";
   ```

2. Check NotificationProvider wrap App:
   ```typescript
   <BrowserRouter>
     <NotificationProvider>
       <Routes>...</Routes>
     </NotificationProvider>
   </BrowserRouter>
   ```

---

## 📊 Expected Console Output

### **Backend (khi Branch tạo PR)**:
```
[PurchaseRequisitionController] POST /api/purchase-requisitions
[AppWebsocketGateway] 🔔 Emitting new_pr_notification to admin room
```

### **Frontend Admin**:
```
✅ Socket connected to root
🔔 New PR notification received: {
  type: "NEW_PR",
  prCode: "PR-20260710-0001",
  branchName: "Chi nhánh Đống Đa",
  message: "Chi nhánh Đống Đa vừa tạo yêu cầu nhập hàng PR-20260710-0001"
}
```

---

## 🔍 Debug Tips

1. **Socket Connection Issues**:
   ```javascript
   // Frontend Console
   const { isConnected, socket } = useSocket();
   console.log('Connected:', isConnected);
   console.log('Socket ID:', socket?.id);
   ```

2. **Room Membership**:
   ```javascript
   // Backend: Log current rooms
   console.log('Rooms:', this.server.sockets.adapter.rooms);
   ```

3. **Event Listeners**:
   ```javascript
   // Frontend: Check registered listeners
   socket?.listeners('new_pr_notification');
   ```

---

## ✅ Success Criteria

- [ ] Admin login → Socket connected log
- [ ] Branch tạo PR → Admin notification badge +1
- [ ] Click bell → Dropdown mở ra
- [ ] Notification hiển thị đầy đủ thông tin
- [ ] Click notification → Navigate đúng page
- [ ] Mark as read → Badge giảm
- [ ] Browser notification hiện (nếu allowed)
- [ ] Multiple tabs → Tất cả nhận notification

---

## 🚀 Next Steps (Mở rộng)

- [ ] Notification persistence (lưu vào database)
- [ ] Email notification backup
- [ ] Notification history page
- [ ] Filter notifications by type
- [ ] Sound alert khi có notification mới
- [ ] Mark notification priority (urgent, normal, low)
- [ ] Group notifications by category
