# UC-48: Quản lý bảng giá bán lẻ / sỉ theo chi nhánh

## Mô tả

Hiện tại, hệ thống sử dụng **một giá duy nhất** (`Medicine.price`) cho tất cả chi nhánh và tất cả loại bán hàng (retail/wholesale). UC-48 yêu cầu xây dựng tính năng **quản lý bảng giá bán lẻ / sỉ riêng cho từng chi nhánh**, cho phép:

- Mỗi chi nhánh có thể có bảng giá riêng (override giá gốc)
- Phân biệt giá **bán lẻ (RETAIL)** và giá **bán sỉ (WHOLESALE)**
- Hỗ trợ giá sỉ theo **bậc thang** (quantity tiers): mua càng nhiều → giảm giá nhiều hơn
- Khi chi nhánh không có bảng giá riêng → **fallback về giá mặc định** (`Medicine.price`)

---

## User Review Required

> [!IMPORTANT]
> **Thiết kế giá sỉ bậc thang**: Plan hiện tại dùng mô hình `wholesaleTiers` (ví dụ: mua 10-49 → giảm 5%, 50-99 → giảm 10%, 100+ → giảm 15%). Bạn có muốn dùng mô hình nào khác không (ví dụ: giá cố định theo tier thay vì phần trăm)?

> [!IMPORTANT]
> **Scope hiển thị**: Plan chỉ thêm route cho **Admin** (`/admin/pricing`). Bạn có muốn **Branch Manager** (`/branch/pricing`) cũng xem được bảng giá chi nhánh mình không? (Chỉ xem, không sửa)

> [!WARNING]
> **Impact tới Sales flow**: Khi tạo Sales Order, hệ thống sẽ resolve giá theo `branchId + type (RETAIL/WHOLESALE)` thay vì dùng `medicine.price` trực tiếp. Điều này sẽ **thay đổi logic** trong [sales.service.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/inventory-service/src/sales/sales.service.ts). Bạn có đồng ý không?

---

## Open Questions

1. **Giá sỉ bậc thang** — Giảm giá theo % hay giá tuyệt đối (VNĐ) cho mỗi bậc?
2. **Ai được phép quản lý bảng giá?** — Chỉ `admin` / `head_branch`, hay `branch` manager cũng có quyền tự set giá?
3. **Lịch sử thay đổi giá** — Có cần audit log mỗi khi thay đổi giá không?
4. **Effective date** — Có cần hỗ trợ "giá có hiệu lực từ ngày X" không? (Plan hiện tại dùng giá ngay lập tức, không schedule)

---

## Proposed Changes

### Database — New Schema `BranchPriceList`

#### [NEW] branch-price-list.schema.ts
Path: `backend/apps/inventory-service/src/pricing/schemas/branch-price-list.schema.ts`

Tạo collection mới `branchpricelists` trong MongoDB:

```typescript
{
  branchId: string,          // Ref tới branches._id
  medicineId: string,        // Ref tới medicines._id
  retailPrice: number,       // Giá bán lẻ tại chi nhánh này (nullable → fallback medicine.price)
  wholesalePrice: number,    // Giá sỉ cơ bản
  wholesaleTiers: [{         // Bậc thang giá sỉ
    minQuantity: number,     // Số lượng tối thiểu
    price: number,           // Giá áp dụng cho bậc này
  }],
  isActive: boolean,         // Bật/tắt bảng giá
  updatedBy: string,         // User ID thực hiện thay đổi
  timestamps: true
}
```

Compound unique index: `{ branchId: 1, medicineId: 1 }` — mỗi thuốc chỉ có 1 entry giá/chi nhánh.

---

### Backend — Inventory Service: Pricing Module

#### [NEW] pricing.module.ts
Path: `backend/apps/inventory-service/src/pricing/pricing.module.ts`

Module mới trong inventory-service, import `MongooseModule.forFeature([BranchPriceList])` + `MedicineModule`.

#### [NEW] pricing.service.ts
Path: `backend/apps/inventory-service/src/pricing/pricing.service.ts`

Business logic:

| Method | Mô tả |
|--------|--------|
| `getPriceListByBranch(branchId, query)` | Lấy bảng giá của 1 chi nhánh (có pagination, search) |
| `upsertPrice(branchId, medicineId, data)` | Tạo/cập nhật giá retail + wholesale cho 1 thuốc tại 1 chi nhánh |
| `bulkUpsertPrices(branchId, items[])` | Import hàng loạt giá cho chi nhánh |
| `deletePrice(branchId, medicineId)` | Xóa override giá → chi nhánh sẽ dùng giá mặc định |
| `resolvePrice(branchId, medicineId, type, quantity)` | **Core logic**: Resolve giá cuối cùng dựa vào chi nhánh + loại bán + số lượng |
| `copyPriceList(fromBranchId, toBranchId)` | Sao chép bảng giá giữa các chi nhánh |
| `getAllBranchPriceSummary()` | Tổng hợp thống kê bảng giá tất cả chi nhánh |

**`resolvePrice` logic**:
1. Tìm `BranchPriceList` theo `{ branchId, medicineId, isActive: true }`
2. Nếu **tìm thấy**:
   - `RETAIL` → trả `retailPrice`
   - `WHOLESALE` → so `quantity` với `wholesaleTiers` (sắp xếp giảm dần `minQuantity`), chọn tier phù hợp. Nếu không match tier nào → trả `wholesalePrice` cơ bản
3. Nếu **không tìm thấy** → fallback về `Medicine.price`

#### [NEW] pricing.controller.ts
Path: `backend/apps/inventory-service/src/pricing/pricing.controller.ts`

Kafka message handlers:

| Pattern | Payload | Response |
|---------|---------|----------|
| `inventory.pricing.list` | `{ branchId, page, limit, search }` | Danh sách giá paginated |
| `inventory.pricing.upsert` | `{ branchId, medicineId, retailPrice, wholesalePrice, wholesaleTiers }` | Updated price entry |
| `inventory.pricing.bulk_upsert` | `{ branchId, items: [...] }` | Bulk result |
| `inventory.pricing.delete` | `{ branchId, medicineId }` | Deleted confirmation |
| `inventory.pricing.resolve` | `{ branchId, medicineId, type, quantity }` | Final resolved price |
| `inventory.pricing.copy` | `{ fromBranchId, toBranchId }` | Copy result |
| `inventory.pricing.summary` | `{}` | All branches price summary |

---

### Backend — Inventory Service Module Update

#### [MODIFY] [inventory-service.module.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/inventory-service/src/inventory-service.module.ts)

Thêm `PricingModule` vào `imports`:

```diff
 import { MedicineModule } from './medicine/medicine.module';
 import { PurchaseModule } from './purchase/purchase.module';
 import { SalesModule } from './sales/sales.module';
+import { PricingModule } from './pricing/pricing.module';

 @Module({
   imports: [
     ...
     MedicineModule,
     PurchaseModule,
     SalesModule,
+    PricingModule,
   ],
 })
```

---

### Backend — Sales Service Update (Price Resolution)

#### [MODIFY] [sales.service.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/inventory-service/src/sales/sales.service.ts)

Thay đổi logic tính giá trong `createSalesOrder()`:

```diff
- const itemPrice = medicine.price || 50000;
+ // Resolve giá theo chi nhánh và loại bán hàng
+ const itemPrice = await this.pricingService.resolvePrice(
+   data.branchId,
+   item.medicineId,
+   data.type, // 'RETAIL' | 'WHOLESALE'
+   item.quantity
+ );
```

Cần inject `PricingService` vào `SalesService` và cập nhật `SalesModule` imports.

#### [MODIFY] [sales.module.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/inventory-service/src/sales/sales.module.ts)

Thêm import `PricingModule` để `SalesService` có thể inject `PricingService`.

---

### Backend — API Gateway: Pricing Controller

#### [NEW] pricing.controller.ts
Path: `backend/apps/api-gateway/src/controllers/pricing.controller.ts`

REST endpoints qua `INVENTORY_SERVICE` Kafka client:

| HTTP Method | Path | Kafka Topic | Mô tả |
|-------------|------|-------------|--------|
| `GET` | `/api/pricing/:branchId` | `inventory.pricing.list` | Lấy bảng giá chi nhánh |
| `PUT` | `/api/pricing/:branchId/:medicineId` | `inventory.pricing.upsert` | Cập nhật giá 1 thuốc |
| `POST` | `/api/pricing/:branchId/bulk` | `inventory.pricing.bulk_upsert` | Import hàng loạt |
| `DELETE` | `/api/pricing/:branchId/:medicineId` | `inventory.pricing.delete` | Xóa override giá |
| `GET` | `/api/pricing/resolve` | `inventory.pricing.resolve` | Resolve giá (query params) |
| `POST` | `/api/pricing/copy` | `inventory.pricing.copy` | Copy bảng giá |
| `GET` | `/api/pricing/summary` | `inventory.pricing.summary` | Tổng hợp |

#### [MODIFY] [app.module.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/api-gateway/src/app.module.ts)

Thêm `PricingController` vào `controllers` array.

---

### Frontend — Trang quản lý bảng giá

#### [NEW] PriceManagement.tsx
Path: `frontend/src/pages/admin/PriceManagement.tsx`

Trang quản lý bảng giá với các tính năng:

1. **Header**: Tiêu đề + nút chọn chi nhánh (dropdown)
2. **Bảng giá**: DataTable hiển thị danh sách thuốc với cột:
   - Tên thuốc, SKU
   - Giá gốc (từ `Medicine.price`)
   - Giá bán lẻ chi nhánh (editable)
   - Giá bán sỉ cơ bản (editable)
   - Số bậc thang sỉ
   - Trạng thái (Active/Inactive)
   - Actions (Edit, Delete)
3. **Modal chỉnh sửa giá**: Form để set giá retail + wholesale + tiers
4. **Bulk import**: Cho phép chọn nhiều thuốc và set giá hàng loạt
5. **Copy bảng giá**: Nút copy bảng giá từ chi nhánh khác
6. **Search + Filter**: Tìm kiếm thuốc, lọc theo trạng thái

UI sử dụng Tailwind CSS + `motion/react` + `lucide-react` — theo pattern của [Products.tsx](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/frontend/src/pages/master-data/Products.tsx).

#### [MODIFY] [App.tsx](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/frontend/src/App.tsx)

Thêm route mới cho Admin:

```diff
 <Route path="master-data/suppliers" element={<Suppliers />} />
+<Route path="pricing" element={<PriceManagement />} />
```

#### [MODIFY] Sidebar / AdminLayout

Thêm menu item "Bảng giá" vào sidebar admin (nếu sidebar render menu items dynamically).

---

## Tóm tắt file changes

| Action | File | Component |
|--------|------|-----------|
| **NEW** | `inventory-service/src/pricing/schemas/branch-price-list.schema.ts` | Backend Schema |
| **NEW** | `inventory-service/src/pricing/pricing.module.ts` | Backend Module |
| **NEW** | `inventory-service/src/pricing/pricing.service.ts` | Backend Service |
| **NEW** | `inventory-service/src/pricing/pricing.controller.ts` | Backend Kafka Handler |
| **MODIFY** | `inventory-service/src/inventory-service.module.ts` | Import PricingModule |
| **MODIFY** | `inventory-service/src/sales/sales.service.ts` | Resolve price from pricing |
| **MODIFY** | `inventory-service/src/sales/sales.module.ts` | Import PricingModule |
| **NEW** | `api-gateway/src/controllers/pricing.controller.ts` | Gateway REST API |
| **MODIFY** | `api-gateway/src/app.module.ts` | Register PricingController |
| **NEW** | `frontend/src/pages/admin/PriceManagement.tsx` | Frontend Page |
| **MODIFY** | `frontend/src/App.tsx` | Add route |
| **MODIFY** | `frontend/src/layouts/AdminLayout.tsx` | Sidebar menu item |

---

## Verification Plan

### Automated Tests

Không có test framework cài sẵn trong project, sẽ verify thủ công.

### Manual Verification

1. **Khởi động stack**: `docker compose up -d` rồi `npm run dev:all`
2. **Seed data**: Tạo một vài entry bảng giá qua Swagger (`/api/docs`)
3. **Kiểm tra CRUD**:
   - `PUT /api/pricing/{branchId}/{medicineId}` — tạo/update giá
   - `GET /api/pricing/{branchId}` — xem bảng giá
   - `DELETE /api/pricing/{branchId}/{medicineId}` — xóa
4. **Kiểm tra resolve giá**:
   - Gọi `GET /api/pricing/resolve?branchId=X&medicineId=Y&type=RETAIL` → trả giá retail chi nhánh
   - Gọi với chi nhánh không có override → trả `medicine.price` (fallback)
   - Gọi `type=WHOLESALE&quantity=100` → trả giá tier phù hợp
5. **Kiểm tra Sales flow**:
   - Tạo Sales Order bán lẻ với chi nhánh có bảng giá → verify giá đúng
   - Tạo Sales Order bán sỉ 50 hộp → verify giá tier đúng
6. **Frontend**: Truy cập `/admin/pricing`, chọn chi nhánh, xem bảng giá, thêm/sửa/xóa giá
