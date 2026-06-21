# WDP301 — Hệ Thống Quản Lý Chuỗi Nhà Thuốc

> **Tài liệu tổng hợp toàn bộ ngữ cảnh dự án**
> Ngày tạo: 2026-06-20
> Phạm vi: Toàn bộ dự án trừ thư mục `docs/`

> Update file này mỗi khi có thay đổi.
---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Backend (NestJS Monorepo + Python AI)](#3-backend)
4. [Database Schema](#4-database-schema)
5. [Frontend (React + Vite + Tailwind)](#5-frontend)
6. [Mobile (Flutter)](#6-mobile)
7. [Infrastructure (AWS + Terraform)](#7-infrastructure)
8. [Kubernetes & Helm Charts](#8-kubernetes--helm-charts)
9. [Docker & Containerization](#9-docker--containerization)
10. [CI/CD](#10-cicd)
11. [Scripts & Utilities](#11-scripts--utilities)
12. [Cách chạy dự án](#12-cách-chạy-dự-án)
13. [Biến môi trường](#13-biến-môi-trường)
14. [Tài khoản test mặc định](#14-tài-khoản-test-mặc-định)

---

## 1. Tổng quan

**WDP301** là hệ thống quản lý chuỗi nhà thuốc (pharmacy chain management) — một nền tảng enterprise đầy đủ bao gồm:

| Thành phần | Công nghệ |
|-----------|----------|
| **Backend** | NestJS monorepo (Node.js 20, TypeScript) — kiến trúc microservice qua Kafka |
| **AI Service** | Python FastAPI + Groq LLM + Qdrant Vector DB + Cohere Embeddings |
| **Frontend** | React 19 + Vite 6 + Tailwind CSS 4 |
| **Mobile** | Flutter 3.x (Dart) |
| **Database** | MongoDB (qua Mongoose) + Supabase PostgreSQL |
| **Message Broker** | Apache Kafka (KRaft mode) |
| **Cache** | Redis 7 |
| **Cloud** | AWS (EC2, ECR, S3, SQS, SES, Lambda) |
| **Orchestration** | Kubernetes (Minikube/K3s) + Helm + ArgoCD |
| **CI/CD** | GitHub Actions + Jenkins |

### Tính năng chính

1. **Quản lý người dùng & phân quyền** — 6 roles: admin, head_branch, warehouse, branch, pharmacist, user
2. **Quản lý kho & thuốc** — CRUD medicines, batches, expiry tracking, inventory transactions
3. **Quy trình mua hàng** — Purchase Requisition → Consolidation → Approval → Purchase Order → Goods Receipt
4. **Bán hàng (POS)** — Bán lẻ, bán theo đơn, bán sỉ, xử lý đổi/trả
5. **Kê đơn điện tử** — Quét đơn thuốc, quản lý prescription
6. **AI Consultant** — Speech-to-text (Groq Whisper) → RAG → LLM kê đơn → Kiểm tra tồn kho
7. **AI Drug Interactions** — Phân tích tương tác thuốc
8. **Tài chính & Báo cáo** — Dashboard, reports, finance tracking
9. **Quản lý chi nhánh** — Multi-branch với approval workflow từ HQ
10. **Customer Portal** — Giỏ hàng, checkout, AI tư vấn

---

## 2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│               http://localhost:3000 (dev)                    │
│         Deploy: Vercel (production)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP REST (/api/*)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY (NestJS + Express)                  │
│               http://localhost:4000                          │
│  - JWT Auth Guard                                            │
│  - Swagger Docs: /api/docs                                   │
│  - Health: /health                                           │
│  - Redis Cache (Cache-Aside)                                 │
└──────┬──────┬──────┬──────┬──────┬──────┬───────────────────┘
       │      │      │      │      │      │
       │Kafka │Kafka │Kafka │Kafka │Kafka │ HTTP
       ▼      ▼      ▼      ▼      ▼      ▼
┌────────┐┌──────┐┌──────┐┌────────┐┌──────────┐┌─────────────┐
│ Auth   ││ User ││Invent││Supplier││Kafka     ││ AI Service   │
│Service ││Svc   ││Svc   ││Svc     ││(generic) ││ (Python)     │
│        ││      ││      ││        ││          ││ FastAPI:8000 │
│MongoDB ││Mongo ││Mongo ││MongoDB ││          ││ + Qdrant     │
└────────┘└──────┘└──────┘└────────┘└──────────┘└─────────────┘
       │      │      │      │      │
       └──────┴──────┴──────┴──────┘
                      │
                      ▼
              ┌──────────────┐
              │   MongoDB    │
              │  (shared)    │
              └──────────────┘
```

### Pattern giao tiếp

- **API Gateway ↔ Microservices**: Request-Reply qua Kafka (`client.send()`)
- **API Gateway → AI Service**: HTTP REST trực tiếp
- **Microservice ↔ Microservice**: Qua Kafka (ví dụ: User Service → Inventory Service)
- **Auth**: JWT token được verify tại Gateway qua `JwtStrategy` (có thể gọi Auth Service qua Kafka)

### Kafka Topics (tự động tạo)

Dựa trên `@MessagePattern` decorators:

| Service | Pattern | Chức năng |
|---------|---------|-----------|
| Auth | `auth.login` | Đăng nhập |
| Auth | `auth.register` | Đăng ký |
| Auth | `auth.validate.token` | Xác thực JWT |
| Auth | `auth.google.login` | Google OAuth |
| Auth | `auth.forgot.password` | Quên mật khẩu |
| Auth | `auth.reset.password` | Đặt lại mật khẩu |
| Auth | `auth.verify.email` | Xác thực email |
| Auth | `auth.resend.verification` | Gửi lại OTP |
| Auth | `auth.2fa.*` | Two-Factor Authentication |
| Auth | `auth.get.user.by.id` | Lấy thông tin user |
| User | `user.*` | CRUD users, branches, carts |
| Inventory | `medicine.*`, `inventory.*`, `purchase.*`, `sales.*` | CRUD medicines, inventory, purchase orders, sales |
| Inventory | `inventory.pricing.*` | Bảng giá bán lẻ/sỉ theo chi nhánh (UC-48) |
| Supplier | `supplier.*` | CRUD suppliers |

---

## 3. Backend

### 3.1 Cấu trúc thư mục

```
backend/
├── apps/
│   ├── api-gateway/       # HTTP REST API Gateway (main entry point)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── controllers/  # 12 controllers
│   │       │   ├── auth.controller.ts
│   │       │   ├── user.controller.ts
│   │       │   ├── medicine.controller.ts
│   │       │   ├── supplier.controller.ts
│   │       │   ├── purchase-order.controller.ts
│   │       │   ├── purchase-requisition.controller.ts
│   │       │   ├── goods-receipt.controller.ts
│   │       │   ├── inventory-transaction.controller.ts
│   │       │   ├── prescription.controller.ts
│   │       │   ├── sales.controller.ts
│   │       │   ├── branch.controller.ts
│   │       │   └── storage/media.controller.ts
│   │       ├── guards/       # JwtAuthGuard
│   │       ├── strategies/   # JwtStrategy, GoogleStrategy
│   │       └── storage/      # S3StorageService
│   │
│   ├── auth-service/      # Auth microservice (Kafka + MongoDB)
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── auth/
│   │           ├── auth-ms.module.ts
│   │           ├── auth-ms.controller.ts  # Kafka message handlers
│   │           ├── auth.service.ts        # Business logic
│   │           ├── user.schema.ts         # User entity
│   │           └── dto/                   # login.dto.ts, register.dto.ts
│   │
│   ├── user-service/      # User management microservice
│   │   └── src/
│   │       ├── main.ts
│   │       ├── user-service.module.ts
│   │       ├── user-service.controller.ts
│   │       ├── user-service.service.ts
│   │       ├── branch.service.ts
│   │       └── schemas/
│   │           ├── branch.schema.ts
│   │           ├── cart.schema.ts
│   │           └── (imports User schema from auth-service)
│   │
│   ├── inventory-service/ # Inventory & sales microservice
│   │   └── src/
│   │       ├── main.ts
│   │       ├── inventory-service.module.ts
│   │       ├── medicine/      # Medicine CRUD + batches
│   │       │   ├── medicine.module.ts
│   │       │   ├── medicine.controller.ts
│   │       │   ├── medicine.service.ts
│   │       │   └── schemas/
│   │       │       ├── medicine.schema.ts
│   │       │       └── medicine-batch.schema.ts
│   │       ├── purchase/      # Purchase workflow
│   │       │   ├── purchase.module.ts
│   │       │   ├── purchase.controller.ts
│   │       │   ├── purchase.service.ts
│   │       │   └── schemas/
│   │       │       ├── purchase-order.schema.ts
│   │       │       ├── purchase-requisition.schema.ts
│   │       │       ├── goods-receipt-note.schema.ts
│   │       │       └── inventory-transaction.schema.ts
│   │       └── sales/         # Sales & prescriptions
│   │           ├── sales.module.ts
│   │           ├── sales.controller.ts
│   │           ├── sales.service.ts
│   │           └── schemas/
│   │               ├── sales-order.schema.ts
│   │               └── prescription.schema.ts
│   │
│   ├── supplier-service/  # Supplier management microservice
│   │   └── src/
│   │       ├── main.ts
│   │       ├── supplier-service.module.ts
│   │       ├── supplier-service.controller.ts
│   │       ├── supplier-service.service.ts
│   │       └── supplier.schema.ts
│   │
│   └── ai-service/        # Python AI service (FastAPI)
│       ├── main.py
│       ├── Dockerfile
│       ├── requirements.txt
│       ├── routers/
│       │   └── prescription.py    # /api/prescription, /api/ai/medicines
│       └── services/
│           ├── stt_service.py     # Groq Whisper speech-to-text
│           ├── llm_service.py     # Groq Llama-3.3-70B prescription + drug interactions
│           ├── rag_service.py     # Qdrant vector search + Cohere embeddings
│           └── db_service.py      # MongoDB inventory validation
│
├── docker/                # Dockerfiles
│   ├── backend.Dockerfile
│   ├── frontend.Dockerfile
│   ├── jenkins.Dockerfile
│   ├── nginx.conf
│   └── nginx.frontend.conf
│
├── scripts/               # Database seed & utility scripts
│   ├── seed-suppliers.ts
│   ├── seed-prescriptions.ts
│   ├── seed-purchase-orders.ts
│   ├── clean-medicines.ts
│   ├── generate-medical-data.ts
│   ├── import_csv_to_db.ts
│   ├── link-medicines-suppliers.ts
│   ├── link-medicines-to-suppliers.ts
│   ├── inspect-db.ts
│   ├── test-fetch.ts
│   └── migrate-barcodes.js
│
├── supabase/
│   └── functions/
│       └── recommend-prescription/
│           └── index.ts   # Supabase Edge Function (Deno)
│
├── package.json           # NestJS monorepo config
├── tsconfig.json
├── nest-cli.json
└── Jenkinsfile
```

### 3.2 API Gateway — Chi tiết

**Công nghệ**: NestJS + Express, port 4000

**Middleware/Guards**:
- `ValidationPipe` — validate toàn bộ DTO với class-validator
- `JwtAuthGuard` — bảo vệ endpoint yêu cầu authentication
- `JwtStrategy` — verify JWT token; có thể gọi `auth.validate.token` qua Kafka
- `GoogleStrategy` — Google OAuth2
- CORS enabled (wildcard)

**Cache**: Redis Cache-Aside strategy (memory store cho dev, Redis store cho production)

**Swagger**: Có sẵn tại `/api/docs` với Bearer Auth

**Health Check**: `GET /health` — dùng cho Kubernetes liveness/readiness probes

### 3.3 AI Service — Chi tiết

**Công nghệ**: Python 3.11, FastAPI, port 8000

**Pipeline xử lý đơn thuốc** (`POST /api/prescription`):
1. **STT** (Speech-to-Text): Groq Whisper-large-v3 — chuyển audio → text
2. **RAG** (Retrieval-Augmented Generation):
   - Cohere `embed-multilingual-light-v3.0` (384 dimensions) → embeddings
   - Qdrant vector search trên collection `medical_knowledge`
   - Score threshold ≥ 0.5
3. **LLM** (Kê đơn): Groq Llama-3.3-70B-versatile — sinh prescription JSON
   - System prompt yêu cầu chỉ kê thuốc có trong CSDL RAG context
   - Response format: `json_object`
4. **DB Validation**: Kiểm tra tồn kho thực tế từ MongoDB

**Drug Interactions** (`POST /api/drug-interactions`): Kiểm tra tương tác thuốc qua LLM

**Medicine Search** (`GET /api/ai/medicines`):
- Semantic search qua Qdrant (khi có search query)
- Fallback MongoDB text search (regex) khi Cohere API không khả dụng
- Pagination support

### 3.4 Environment Variables (Backend)

```
# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=wdp301-consumers

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wdp301-dev

# JWT
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=3600s

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AWS
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_IMAGES_BUCKET=
S3_LOGS_BUCKET=
SQS_EMAIL_QUEUE_URL=
SES_FROM_EMAIL=

# AI Service
GROQ_API_KEY=
COHERE_API_KEY=
QDRANT_HOST=localhost

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## 4. Database Schema

### 4.1 MongoDB Collections

Tất cả service dùng chung một MongoDB instance. Mỗi service kết nối độc lập.

#### Users (`collection: users`)
```
{
  email: string (unique, required),
  passwordHash: string (required),
  fullName: string (required),
  role: enum ['admin', 'head_branch', 'warehouse', 'branch', 'pharmacist', 'user'],
  isActive: boolean (default: true),
  isEmailVerified: boolean (default: false),
  avatarUrl?: string,
  googleId?: string,
  branchId?: string,
  isTwoFactorEnabled: boolean (default: false),
  timestamps: true
}
```

#### Medicines (`collection: medicines`)
```
{
  name: string,
  category: string,
  image: string,
  images: string[],
  cong_dung: string,           // Công dụng
  cach_dung: string,           // Cách dùng
  tac_dung_phu: string,        // Tác dụng phụ
  thong_tin_chi_tiet: object,  // Chi tiết (Thành phần, Giá bán, Danh mục...)
  price: number (default: 0),
  drug_classification: string (default: 'COMMON_SUPPLEMENT'),
  active_ingredient: string,
  registration_number: string,
  manufacturer: string,
  dosage_form: string,
  supplierId: string,
  status: string,
  unit: string,
  expiry_date?: string,
  sku?: string (sparse index),
  barcode?: string (sparse index)
}
```

#### MedicineBatches (`collection: medicinebatches`)
```
{
  medicineId: string (required),
  batchNo: string (required),
  expDate: Date (required),
  stock: number (default: 0, min: 0),
  status: enum ['ACTIVE', 'EXPIRED'] (default: 'ACTIVE'),
  timestamps: true
}
```

#### Suppliers (`collection: suppliers`)
```
{
  name: string (required),
  contact_info: string,
  business_registration_number: string,
  gdp_certificate_number: string (required),   // Chứng nhận GDP
  gdp_expiry_date: Date (required),
  status: enum ['ACTIVE', 'INACTIVE', 'SUSPENDED'] (default: 'ACTIVE'),
  timestamps: true
}
```

#### Branches (`collection: branches`)
```
{
  branchCode: string (unique, required),  // BR-001, BR-002...
  name: string (required),
  address: string (required),
  image: string (required),
  status: enum ['active', 'maintenance'] (default: 'active'),
  manager: string (required),
  contact: string (required),
  stats: {
    employees: number,
    totalStock: number,
    lowStock: number,
    expiring: number
  },
  alerts: [{
    id: number,
    type: enum ['low_stock', 'expiring'],
    item: string,
    current?: number,
    min?: number,
    expiryDate?: string,
    time: string
  }],
  timestamps: true
}
```

#### Carts (`collection: carts`)
```
{
  userId: string (unique, required),
  items: [{
    medicineId: string (required),
    quantity: number (required, min: 1),
    addedPrice: number (required)   // Giá lúc thêm vào giỏ
  }],
  timestamps: true
}
```

#### PurchaseRequisitions (`collection: purchaserequisitions`)
```
{
  prCode: string (unique, required),      // PR-YYYYMMDD-XXXX
  branchId: string (required),
  branchName: string (required),
  items: [{
    medicineId: string (required),
    medicineName: string,
    requestedQuantity: number (required, min: 1),
    unit: string
  }],
  reason: string,
  notes: string,
  status: enum ['DRAFT', 'SUBMITTED', 'CONSOLIDATED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  createdBy: string,
  consolidatedBy: string,
  approvedBy: string,
  rejectionReason: string,
  approvedAt: Date,
  linkedPoId: string,
  timestamps: true
}
```

#### PurchaseOrders (`collection: purchaseorders`)
```
{
  supplierId: string (required),
  items: [{
    medicineId: string (required),
    quantity: number (required, min: 1),
    receivedQuantity: number (default: 0),   // Cho partial delivery
    unitPrice: number (required, min: 0)
  }],
  totalAmount: number (required, min: 0),
  status: enum ['PENDING', 'PARTIAL_RECEIVED', 'COMPLETED', 'CANCELLED'],
  createdBy: string,
  linkedPrId: string,           // Link đến PR gốc
  expectedIncoming: number (default: 0),
  timestamps: true
}
```

#### GoodsReceiptNotes (`collection: goodsreceiptnotes`)
```
{
  poId: string (required),
  items: [{
    medicineId: string (required),
    batchNo: string (required),
    expDate: Date (required),
    quantity: number (required, min: 1),
    unitPrice: number (required, min: 0)
  }],
  totalAmount: number (required, min: 0),
  status: enum ['COMPLETED', 'CANCELLED'],
  receivedBy: string,
  timestamps: true
}
```

#### SalesOrders (`collection: salesorders`)
```
{
  prescriptionId?: string,
  prescriptionCode?: string,
  items: [{
    medicineId: string (required),
    name: string (required),
    quantity: number (required, min: 1),
    price: number (required, min: 0),
    unit: string (required),
    batches: [{
      batchNo: string (required),
      quantity: number (required)
    }]
  }],
  totalAmount: number (required, min: 0),
  paymentMethod: enum ['CASH', 'CARD', 'QR_PAY'] (default: 'CASH'),
  type: enum ['RETAIL', 'PRESCRIPTION', 'WHOLESALE'] (default: 'RETAIL'),
  patientName: string,
  patientPhone: string,
  soldBy: string,
  timestamps: true
}
```

#### Prescriptions (`collection: prescriptions`)
```
{
  prescriptionCode: string (unique, required),
  patientName: string (required),
  patientAge: number (required),
  patientGender: string (required),
  patientPhone: string (required),
  doctorName: string (required),
  doctorSpecialty: string (required),
  hospitalName: string (required),
  hospitalCode: string (required),
  items: [{
    medicineId: string (required),
    quantity: number (required),
    dosage: string (required)
  }],
  status: enum ['PENDING', 'FILLED'] (default: 'PENDING'),
  timestamps: true
}
```

#### InventoryTransactions (`collection: inventorytransactions`)
```
{
  type: enum ['GRN_IMPORT', 'SALE_EXPORT', 'DISPOSE', 'TRANSFER', 'ADJUSTMENT'] (required),
  medicineId: string (required),
  medicineName: string,
  batchNo: string,
  quantityChange: number (required),    // Dương = nhập, Âm = xuất
  stockBefore: number (default: 0),
  stockAfter: number (default: 0),
  referenceId: string,                  // ID chứng từ liên quan
  referenceType: string,                // 'GRN', 'PO', 'SALE'...
  performedBy: string,
  notes: string,
  timestamps: true
}
```

#### BranchPriceLists (`collection: branchpricelists`) — UC-48
```
{
  branchId: string (required),          // Ref tới branches._id
  medicineId: string (required),        // Ref tới medicines._id
  retailPrice: number (nullable),       // Giá bán lẻ tại chi nhánh (null → fallback medicine.price)
  wholesalePrice: number (nullable),    // Giá bán sỉ cơ bản
  wholesaleTiers: [{                    // Bậc thang giá sỉ
    minQuantity: number (required),
    price: number (required)
  }],
  isActive: boolean (default: true),
  updatedBy: string,
  timestamps: true
}
// Compound unique index: { branchId: 1, medicineId: 1 }
```

---

## 5. Frontend

### 5.1 Công nghệ

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.0.1 | UI framework |
| Vite | 6.2.3 | Build tool |
| TypeScript | 5.8 | Type safety |
| Tailwind CSS | 4.1.14 | Utility-first CSS |
| React Router DOM | 7.15.1 | Client-side routing |
| Recharts | 3.8.1 | Charts (dashboard, finance) |
| Lucide React | 0.546.0 | Icons |
| GSAP | 3.15.0 | Animations |
| Motion | 12.23.24 | React animations |
| Google GenAI | 2.4.0 | AI Studio integration |

### 5.2 Cấu trúc thư mục

```
frontend/src/
├── main.tsx                    # Entry point
├── App.tsx                     # Router + route definitions
├── components/
│   ├── ProtectedRoute.tsx      # Role-based route guard
│   └── ui/
│       ├── Header.tsx          # Top navigation bar
│       ├── Sidebar.tsx         # Side navigation
│       └── Logo.tsx            # Logo component
├── layouts/
│   ├── AuthLayout.tsx          # Layout for login/register
│   ├── BaseDashboardLayout.tsx # Base layout with sidebar+header
│   ├── AdminLayout.tsx         # Admin/HQ dashboard
│   ├── WarehouseLayout.tsx     # Warehouse dashboard
│   ├── BranchLayout.tsx        # Branch dashboard
│   ├── PharmacistLayout.tsx    # Pharmacist/POS dashboard
│   └── CustomerLayout.tsx      # Customer shop
├── pages/
│   ├── auth/                   # Login, Register, ForgotPassword, ResetPassword, VerifyEmail
│   ├── common/                 # Landing, Dashboard, Profile, Settings, AIInsights
│   ├── admin/                  # Branches, HQApproval, Finance, Reports
│   ├── warehouse/              # Inventory, InventoryHistory, PurchaseOrderCreate, PurchaseRequisition
│   ├── branch/                 # BranchRequisition
│   ├── pharmacist/             # Sales (POS), DrugInteractions
│   ├── customer/               # CustomerShop, CustomerCart, CustomerCheckout, AIConsultant
│   └── master-data/            # Products, Suppliers
├── services/
│   └── auth.service.ts         # Auth API calls
├── lib/
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
└── styles/
    └── index.css               # Global styles (Tailwind)
```

### 5.3 Routing & Role-Based Access

```
Public:
  /                         → Landing page
  /interactions             → Drug Interactions (public tool)

Auth (AuthLayout):
  /auth/login               → Login
  /auth/register            → Register
  /auth/forgot-password     → Forgot password
  /auth/reset-password      → Reset password
  /auth/verify-email        → Email verification

Customer (role: user):
  /customer/shop            → Browse medicines
  /customer/cart            → Shopping cart
  /customer/checkout        → Checkout
  /customer/ai-consult      → AI voice consultant

Admin/HQ (roles: admin, head_branch):
  /admin                    → Dashboard
  /admin/branches           → Quản lý chi nhánh
  /admin/approvals          → Phê duyệt PR
  /admin/finance            → Tài chính
  /admin/reports            → Báo cáo
  /admin/pricing            → Bảng giá bán lẻ/sỉ theo chi nhánh (UC-48)
  /admin/ai-insights        → AI Insights
  /admin/inventory/*        → Quản lý kho (import/export/dispose)
  /admin/master-data/*       → Sản phẩm, Nhà cung cấp

Warehouse (role: warehouse):
  /warehouse                → Dashboard
  /warehouse/inventory/*    → Inventory, Requisitions, Import/Export
  /warehouse/master-data/*   → Products, Suppliers

Branch (role: branch):
  /branch                   → Dashboard
  /branch/sales             → Bán hàng
  /branch/requisitions      → Yêu cầu nhập hàng
  /branch/finance           → Tài chính chi nhánh
  /branch/reports           → Báo cáo

Pharmacist (role: pharmacist):
  /pharmacist               → Dashboard POS
  /pharmacist/sales         → Bán hàng (4 tabs: Retail, Prescription, Wholesale, Returns)
```

### 5.4 Auth Flow

1. **Login**: `auth.service.login()` → `POST /api/auth/login` → nhận JWT token
2. **Token storage**: `localStorage.setItem("token", ...)`, `localStorage.setItem("userRole", ...)`
3. **Route protection**: `ProtectedRoute` component kiểm tra `token` + `role` trong localStorage
4. **Role redirect**: Nếu role không match → redirect về dashboard tương ứng
5. **Logout**: Xóa `token` và `userRole` khỏi localStorage → redirect `/auth/login`

---

## 6. Mobile

### 6.1 Công nghệ

- **Framework**: Flutter 3.x, Dart SDK ^3.11.5
- **Networking**: `http` package
- **Platforms**: Android, iOS, Web, Linux, macOS, Windows

### 6.2 Cấu trúc

```
mobile/lib/
├── main.dart                # Entry point (MaterialApp)
├── models/                  # Data models
├── screens/                 # UI screens
└── services/                # API service calls
```

### 6.3 Ghi chú

- Mobile app hiện ở giai đoạn scaffold cơ bản
- Sử dụng `http` package để gọi REST API từ backend
- Chưa có state management phức tạp (có thể thêm Provider/Riverpod sau)

---

## 7. Infrastructure

### 7.1 AWS Architecture (Terraform)

```
Provider: AWS ap-southeast-1 (Singapore)

Resources:
├── ECR (Container Registry)
│   ├── wdp301-backend
│   └── wdp301-frontend
│
├── S3
│   ├── images bucket (private, presigned URLs)
│   └── logs bucket (auto-delete after 30 days)
│
├── SQS
│   ├── email queue
│   └── email DLQ (Dead Letter Queue)
│
├── SES (Simple Email Service)
│   ├── Verified identities (email + optional domain)
│   └── DKIM + domain verification
│
├── Lambda
│   └── email-sender (Node.js) — consume SQS → send via SES
│
├── IAM
│   └── EC2 instance profile (ECR pull + S3 RW + SQS send)
│
├── Security Group
│   ├── SSH (22)
│   ├── HTTP (80)
│   ├── HTTPS (443)
│   └── App ports (3000, 4000)
│
└── EC2
    ├── t3a.large (ARM-based)
    ├── Ubuntu 22.04
    ├── Docker + docker-compose
    └── Runs: Redis, Kafka, Backend (from ECR)
```

### 7.2 Terraform Modules

| Module | Source | Purpose |
|--------|--------|---------|
| `ecr` | `./modules/ecr` | Container registry repositories |
| `s3-bucket` | `./modules/s3-bucket` | S3 buckets with CORS, versioning, lifecycle |
| `sqs` | `./modules/sqs` | SQS queue + DLQ |
| `ses` | `./modules/ses` | Email identities verification |
| `lambda` | `./modules/lambda` | Lambda function (email sender) |
| `iam-ec2` | `./modules/iam-ec2` | IAM role + instance profile |
| `security-group` | `./modules/security-group` | Security group rules |
| `ec2` | `./modules/ec2` | EC2 instance |

---

## 8. Kubernetes & Helm Charts

### 8.1 Helm Chart (`gitops/charts/app/`)

Deploy toàn bộ stack lên Kubernetes:

```
Release: wdp301-app (namespace: wdp301)
Services:
├── frontend (port 3000, ClusterIP)
├── gateway (port 4000, ClusterIP) — API Gateway
├── auth (Kafka microservice)
├── user (Kafka microservice)
├── inventory (Kafka microservice)
├── supplier (Kafka microservice)
└── mongodb (port 27017, with PVC 5Gi)
```

### 8.2 Environments

| Environment | Values File | Ingress Host | DB URI |
|-------------|-------------|--------------|--------|
| **dev** | `overlays/dev/values-override.yaml` | `dev.wdp301.local` | `mongodb://mongodb-svc:27017/wdp301-dev` |
| **prod** | `overlays/prod/values-override.yaml` | (production domain) | (production MongoDB) |

### 8.3 Kafka on K8s

Hai phiên bản cấu hình:
- `gitops/base/kafka.yaml` — confluentinc/cp-kafka:7.4.0 với StatefulSet + PVC
- `backend/kafka-arm64.yaml` — confluentinc/confluent-local:7.5.0 cho ARM64 (Apple Silicon)

### 8.4 ArgoCD

```yaml
# gitops/argocd/application-dev.yaml
# gitops/argocd/application-prod.yaml
```
ArgoCD tự động sync từ GitOps repo để deploy lên Kubernetes cluster.

### 8.5 Deploy lên K3s/VPS

Script `scripts/deploy-vps.sh`:
1. Build Docker images (backend + frontend)
2. Import vào K3s containerd
3. Deploy Kafka infrastructure
4. Helm upgrade/install app
5. Wait for all pods ready
6. Hiển thị IP truy cập

---

## 9. Docker & Containerization

### 9.1 Docker Compose Files

| File | Purpose | Services |
|------|---------|----------|
| `docker-compose.yml` | **Development** (local) | redis, kafka, backend (live reload), frontend (live reload), ai-service, qdrant |
| `docker-compose.prod.yml` | **Production** (EC2) | redis, kafka, backend (from ECR image) |
| `docker-compose.ci.yml` | **CI** (Jenkins) | jenkins |

### 9.2 Dockerfiles

| File | Base Image | Purpose |
|------|-----------|---------|
| `backend/docker/backend.Dockerfile` | node:20-alpine | Multi-stage: deps → runner, runs `npm run dev:all` |
| `backend/docker/frontend.Dockerfile` | node:20-alpine | Frontend build |
| `backend/docker/jenkins.Dockerfile` | jenkins/jenkins:lts | Jenkins + Docker CLI |
| `backend/apps/ai-service/Dockerfile` | python:3.11-slim | Python AI service |
| `backend/apps/auth-service/Dockerfile` | node:20-alpine | Auth microservice |
| `backend/apps/inventory-service/Dockerfile` | node:20-alpine | Inventory microservice |
| `backend/apps/supplier-service/Dockerfile` | node:20-alpine | Supplier microservice |

### 9.3 Networking

- Tất cả service trong `docker-compose.yml` dùng chung network `wdp301-network` (bridge)
- Kafka internal: `kafka:29092`, external: `localhost:9092`
- Backend gọi AI service qua HTTP: `http://ai-service:8000`

---

## 10. CI/CD

### 10.1 GitHub Actions (`.github/workflows/deploy.yml`)

**Triggers**:
- `push` lên `dev` → job `build-and-test` (lint + test + Docker build verify)
- `push` lên `main` → job `build-and-test` + job `deploy`

**Deploy flow (main)**:
1. Build backend Docker image
2. Push lên AWS ECR (tag: git SHA + `latest`)
3. SCP `docker-compose.prod.yml` lên EC2
4. SSH vào EC2: pull image → `docker compose up -d`

**Secrets required**:
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `EC2_HOST` (IP/DNS)
- `EC2_SSH_KEY` (private key .pem)

### 10.2 Jenkins (`backend/Jenkinsfile`)

Pipeline 6 stages:
1. **Checkout** — git clone
2. **Test** — parallel: frontend + backend (lint + test)
3. **Build Docker Images** — parallel: frontend + backend
4. **Security Scan** — Trivy scan (HIGH, CRITICAL)
5. **Push to Docker Hub** — push with tags
6. **Update GitOps Repo** — commit image tag → trigger ArgoCD sync

Branch-based: `main` → `prod`, others → `dev`

---

## 11. Scripts & Utilities

### 11.1 Root Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy-vps.sh` | Deploy toàn bộ stack lên K3s/VPS |
| `scripts/k8s-logs.sh` | Xem logs các pod trong namespace |
| `scripts/setup-argocd.sh` | Cài đặt ArgoCD trên K8s |
| `scripts/setup-ec2-https.sh` | Cấu hình HTTPS (Let's Encrypt) cho EC2 |
| `scripts/setup-vps-k8s.sh` | Cài đặt K3s + tools trên VPS |
| `scripts/ship-logs-to-s3.sh` | Đẩy application logs lên S3 |
| `scripts/start-all.sh` | Khởi động toàn bộ stack |

### 11.2 Backend Scripts (npm run)

| Command | File | Purpose |
|---------|------|---------|
| `npm run dev:all` | - | Chạy tất cả 5 microservices + gateway |
| `npm run start:gateway` | `apps/api-gateway/src/main.ts` | API Gateway |
| `npm run start:auth` | `apps/auth-service/src/main.ts` | Auth microservice |
| `npm run start:user` | `apps/user-service/src/main.ts` | User microservice |
| `npm run start:inventory` | `apps/inventory-service/src/main.ts` | Inventory microservice |
| `npm run start:supplier` | `apps/supplier-service/src/main.ts` | Supplier microservice |
| `npm run inspect` | `scripts/inspect-db.ts` | Kiểm tra database |
| `npm run db:clean-medicines` | `scripts/clean-medicines.ts` | Làm sạch dữ liệu thuốc |
| `npm run db:seed-prescriptions` | `scripts/seed-prescriptions.ts` | Seed đơn thuốc mẫu |

### 11.3 Database Seed Scripts

| Script | Purpose |
|--------|---------|
| `seed-suppliers.ts` | Tạo 15+ nhà cung cấp dược phẩm Việt Nam thực tế (DHG, Traphaco, Domesco...) |
| `seed-prescriptions.ts` | Tạo đơn thuốc mẫu |
| `seed-purchase-orders.ts` | Tạo đơn đặt hàng mẫu |
| `clean-medicines.ts` | Xóa/sửa dữ liệu thuốc |
| `generate-medical-data.ts` | Sinh dữ liệu y tế |
| `import_csv_to_db.ts` | Import dữ liệu từ CSV |
| `link-medicines-suppliers.ts` | Liên kết thuốc với nhà cung cấp |
| `migrate-barcodes.js` | Migration mã vạch |

### 11.4 Supabase Edge Function

**`recommend-prescription`** (Deno):
- Alternative AI pipeline (không dùng RAG, dùng pure LLM)
- Sử dụng Supabase Storage để lưu audio
- Groq Whisper → Groq Llama-3.1-8B
- Mode: "PURE LLM (No DB Constraint)"

---

## 12. Cách chạy dự án

### Cách 1: Docker (nhanh nhất)

```bash
docker compose up -d
# Truy cập: http://localhost:3000 (Frontend)
#           http://localhost:4000/api/docs (Swagger)
# Dừng: docker compose down
```


## 13. Biến môi trường

### Backend `.env`

```env
NODE_ENV=development
PORT=4000
APP_VERSION=1.0.0

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_GROUP_ID=wdp301-consumers

# MongoDB
MONGODB_URI=mongodb://localhost:27017/wdp301-dev

# JWT
JWT_SECRET=super-secret-key-change-in-production
JWT_EXPIRES_IN=86400s

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_IMAGES_BUCKET=wdp301-images-dev-...
S3_LOGS_BUCKET=wdp301-logs-dev-...
SQS_EMAIL_QUEUE_URL=https://sqs.../wdp301-dev-email
SES_FROM_EMAIL=noreply@yourdomain.com

# AI Service (cho ai-service)
GROQ_API_KEY=gsk_...
COHERE_API_KEY=...
QDRANT_HOST=localhost

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Production `.env` (trên EC2)

```env
# Thêm vào các biến trên
ECR_REGISTRY=264144511221.dkr.ecr.ap-southeast-1.amazonaws.com
IMAGE_TAG=abc12345
NODE_ENV=production
```

---

## 14. Tài khoản test mặc định

Auth Service tự động seed các tài khoản test khi khởi động (mật khẩu: `123456`):

| Email | Role | Mô tả |
|-------|------|-------|
| `admin@vinapharmacy.com` | `admin` | Quản trị hệ thống |
| `director@vinapharmacy.com` | `head_branch` | Giám đốc chi nhánh |
| `warehouse@vinapharmacy.com` | `warehouse` | Quản lý kho |
| `manager@vinapharmacy.com` | `branch` | Quản lý cơ sở |
| `pharmacist@vinapharmacy.com` | `pharmacist` | Dược sĩ bán hàng |
| `user@vinapharmacy.com` | `user` | Khách hàng |

---

## Phụ lục: Các file quan trọng cần biết

| File | Purpose |
|------|---------|
| `backend/package.json` | Backend dependencies + scripts |
| `backend/nest-cli.json` | NestJS monorepo project config |
| `frontend/src/App.tsx` | Toàn bộ routing + role mapping |
| `frontend/src/components/ProtectedRoute.tsx` | Auth guard |
| `frontend/src/layouts/BaseDashboardLayout.tsx` | Base dashboard layout |
| `backend/apps/api-gateway/src/app.module.ts` | Gateway module (tất cả controllers, Kafka clients) |
| `backend/apps/auth-service/src/auth/user.schema.ts` | User entity + enum roles |
| `backend/apps/auth-service/src/auth/auth-ms.controller.ts` | Auth Kafka message handlers |
| `backend/apps/ai-service/routers/prescription.py` | AI prescription pipeline |
| `backend/apps/ai-service/services/llm_service.py` | LLM prompts (kê đơn + tương tác thuốc) |
| `infra/main.tf` | Terraform root module |
| `gitops/charts/app/values.yaml` | Helm default values |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD |
| `docker-compose.yml` | Docker Compose dev stack |
| `docker-compose.prod.yml` | Docker Compose production stack |
| `scripts/deploy-vps.sh` | VPS/K3s deployment script |
