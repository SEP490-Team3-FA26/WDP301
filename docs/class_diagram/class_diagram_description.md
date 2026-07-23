# WDP301 System Class Diagram Documentation

## 📌 Executive Summary
This document presents the **Object-Oriented Domain Model & Class Diagram Architecture** for the **WDP301 Pharmacy Chain & AI Management System**. The domain model is structured into **4 core subsystems / microservice packages**:
1. **User & Identity Management Subsystem**
2. **Medicine Catalog & Inventory Control Subsystem**
3. **Procurement & Supply Chain Management Subsystem**
4. **Sales, POS Counter & E-Commerce Order Subsystem**

---

## 📐 Architecture Overview Diagram

The complete interactive Draw.io diagram and high-resolution rendered visual asset are available in this directory:
- 🎨 **Draw.io Editable Diagram:** [`WDP301_System_Class_Diagram.drawio`](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/class_diagram/WDP301_System_Class_Diagram.drawio)
- 🖼️ **PNG Visual Image:** [`WDP301_System_Class_Diagram.drawio.png`](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/class_diagram/WDP301_System_Class_Diagram.drawio.png)

---

## 🗂️ Subsystems & Domain Class Detailed Specifications

### 1. User & Identity Subsystem (`user-service` / `auth-service`)

#### 1.1 `User`
Representing system actors (Customers, Pharmacists, Inventory Managers, Branch Managers, HQ Admin).
- **Attributes:**
  - `id: String` (Primary Key)
  - `phone: String` (Unique Index, Login Identifier)
  - `passwordHash: String` (Bcrypt Hash)
  - `fullName: String`
  - `email: String`
  - `role: UserRoleEnum` (`CUSTOMER`, `PHARMACIST`, `INVENTORY_MANAGER`, `BRANCH_MANAGER`, `HQ_ADMIN`)
  - `branchId: String` (Foreign Key to `Branch`)
  - `points: Number` (Active loyalty points)
  - `tier: CustomerTierEnum` (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`)
- **Methods:**
  - `createAccount()`: Registers a new user with default role.
  - `updateProfile()`: Updates personal & contact details.
  - `addLoyaltyPoints(delta)`: Accumulates points from POS/Online sales.

#### 1.2 `Branch`
Represents physical pharmacy branches across the chain network.
- **Attributes:**
  - `id: String`
  - `branchCode: String`
  - `name: String`
  - `address: String`
  - `phone: String`
  - `managerId: String` (Assigned Branch Manager ID)
  - `status: BranchStatusEnum` (`ACTIVE`, `INACTIVE`)
- **Methods:**
  - `createBranch()`: Registers a new store location.
  - `updateInfo()`: Modifies address or manager assignment.

#### 1.3 `AuditLog`
Tracking security-critical operations for regulatory compliance.
- **Attributes:**
  - `id: String`
  - `action: String` (`CREATE_USER`, `ADJUST_STOCK`, `EXCHANGE_SALE`, `UPDATE_ROLE`)
  - `performedBy: String`
  - `resource: String`
  - `entityId: String`
  - `details: Object`
  - `timestamp: Date`

---

### 2. Medicine Catalog & Inventory Subsystem (`inventory-service`)

#### 2.1 `Medicine`
Central catalog entity defining drug properties, packaging, and regulatory status.
- **Attributes:**
  - `id: String`
  - `medicineCode: String`
  - `sku: String`
  - `name: String`
  - `activeIngredient: String`
  - `category: String`
  - `unit: String`
  - `basePrice: Number`
  - `isPrescriptionRequired: Boolean`
  - `minStockLevel: Number`
- **Methods:**
  - `addMedicine()`: Registers a new pharmaceutical item.
  - `checkQuota()`: Verifies if item is restricted by monthly branch quota.

#### 2.2 `MedicineBatch`
Tracks physical batch inventory per branch using FEFO (First Expired, First Out).
- **Attributes:**
  - `id: String`
  - `batchNo: String`
  - `medicineId: String`
  - `branchId: String`
  - `supplierId: String`
  - `quantity: Number`
  - `importPrice: Number`
  - `manufacturingDate: Date`
  - `expiryDate: Date`
  - `status: BatchStatusEnum` (`AVAILABLE`, `NEAR_EXPIRY`, `EXPIRED`, `QUARANTINED`)
- **Methods:**
  - `deductFEFO(qty)`: Auto-selects earliest expiry batch for retail sales.
  - `checkExpiry()`: Triggers near-expiry color alerts (< 3 months).

#### 2.3 `InventoryCheck`
Conducts physical stock audits via mobile AI scan or manual count.
- **Attributes:**
  - `id: String`
  - `checkCode: String`
  - `branchId: String`
  - `inventoryManagerId: String`
  - `scope: CheckScopeEnum` (`SECTION`, `FULL`)
  - `items: Array<CheckItem>`
  - `status: CheckStatusEnum` (`DRAFT`, `IN_PROGRESS`, `COMPLETED`, `ADJUSTED`)

#### 2.4 `MedicineQuota`
Enforces maximum monthly distribution limits on controlled medicines per branch.
- **Attributes:**
  - `id: String`
  - `medicineId: String`
  - `branchId: String`
  - `monthlyQuota: Number`
  - `usedQuantity: Number`
  - `period: String` (YYYY-MM)

---

### 3. Procurement & Supply Chain Subsystem (`supplier-service` / `inventory-service`)

#### 3.1 `Supplier`
Stores pharmaceutical distributor profiles and credit terms.
- **Attributes:** `id`, `supplierCode`, `name`, `taxCode`, `gdpLicense`, `phone`, `reliabilityRating`.

#### 3.2 `PurchaseRequisition` (PR)
Internal branch requests sent to warehouse before issuing formal POs.
- **Attributes:** `id`, `prCode`, `branchId`, `requestedBy`, `items`, `status` (`PENDING`, `APPROVED`, `REJECTED`).

#### 3.3 `PurchaseOrder` (PO)
Official purchase orders issued to suppliers (supports AI EOQ auto-generation).
- **Attributes:** `id`, `poCode`, `supplierId`, `items`, `totalAmount`, `paymentStatus`, `status`.

#### 3.4 `GoodsReceiptNote` (GRN)
Receiving inspection records (integrates Gemini AI Box Count Verification).
- **Attributes:** `id`, `grnCode`, `poCode`, `supplierId`, `items`, `inspectedByAI`, `status`.

#### 3.5 `StockTransfer`
Inter-branch inventory transfer slips to balance regional stock.
- **Attributes:** `id`, `transferCode`, `fromBranchId`, `toBranchId`, `items`, `status`.

---

### 4. Sales, POS & E-Commerce Subsystem (`orders-service` / `inventory-service`)

#### 4.1 `SalesOrder`
Over-the-counter POS retail, wholesale, return, and product exchange invoices.
- **Attributes:** `id`, `orderCode`, `branchId`, `pharmacistId`, `customerId`, `invoiceType` (`RETAIL`, `WHOLESALE`, `RETURN`, `EXCHANGE`), `items`, `discountAmount`, `finalAmount`, `paymentMethod` (`CASH`, `BANK_TRANSFER`, `PAYOS`).

#### 4.2 `OnlineOrder`
Customer e-commerce orders placed via Mobile/Web app with PayOS payment integration.
- **Attributes:** `id`, `orderCode`, `customerId`, `items`, `shippingAddress`, `deliveryFee`, `totalAmount`, `payosTransactionId`, `deliveryStatus`.

#### 4.3 `Cart` & `Voucher`
Shopping cart state management and discount voucher application.

#### 4.4 `Prescription`
Stores prescription images scanned via Gemini 2.5 Flash AI to auto-populate cart items.

---

## 🔗 Domain Relationships & Multiplicities Summary

| Source Class | Multiplicity | Target Class | Multiplicity | Relationship Type | Description |
| :--- | :---: | :--- | :---: | :--- | :--- |
| `User` | `1` | `Branch` | `0..*` | Association | A user belongs to a specific branch (if staff). |
| `User` | `1` | `AuditLog` | `0..*` | Association | A user action is logged in audit logs. |
| `Medicine` | `1` | `MedicineBatch` | `0..*` | Composition | A medicine has multiple physical inventory batches. |
| `Branch` | `1` | `MedicineBatch` | `0..*` | Aggregation | A branch holds physical medicine batches in stock. |
| `Supplier` | `1` | `PurchaseOrder` | `0..*` | Association | A supplier receives Purchase Orders. |
| `PurchaseOrder` | `1` | `GoodsReceiptNote` | `0..*` | Dependency | GRN is created upon PO fulfillment. |
| `User` | `1` | `SalesOrder` | `0..*` | Association | Pharmacist issues POS sales order. |
| `Prescription` | `1` | `Cart` | `0..1` | Dependency | AI prescription scan auto-populates shopping cart. |
