# Non-Functional Requirements

This section specifies the non-functional requirements (NFRs) for the pharmacy management system, describing the system's constraints, external interfaces, and quality attributes.

## 4.1 External Interfaces

### User Interface:
* **Retail/Staff Portals:** Responsive web-based interfaces developed in React and Vite for Admin, Branch Manager, StoreKeeper, and Pharmacist. Designed with clean, professional layouts adhering to modern GUI guidelines, optimized for desktops and tablets.
* **Customer Portal:** A customer-facing web app and a mobile application built with Flutter, providing smooth navigation, easy-to-use search inputs, and touch-optimized checkout steps.

### Hardware Interfaces:
* **Barcode & QR Scanners:** Support for physical USB/Bluetooth handheld scanners at POS counters to scan medicine codes (UC-01, UC-42).
* **Mobile Cameras:** Support for smartphone/tablet camera feeds for mobile barcode/QR scanning (UC-14, UC-22) and AI-based Computer Vision stock counting (UC-15, UC-19).
* **Thermal Receipt Printers:** Integration with retail standard receipt printers at POS counters for automated printing upon transaction completion.

### Software/System Interfaces:
* **API Gateway (NestJS):** Acts as the single HTTP entry point, routing requests to individual microservices and implementing JWT verification and Redis caching.
* **Apache Kafka (KRaft mode):** Serves as the asynchronous messaging backbone, passing event messages (e.g. `order.created`, `inventory.updated`) between microservices.
* **Redis Cache:** Integrated with the API Gateway and microservices to enable ultra-fast read responses for high-frequency queries.
* **Databases:**
  * **Neon Serverless Postgres (Cloud SQL):** Stores highly structured transactional records requiring ACID compliance (Sales Orders, Bills, Batches).
  * **MongoDB Atlas (Cloud NoSQL):** Stores unstructured metadata, user profiles, logs, and prescription files.
* **Payment Gateways:** Integrates with online payment webhooks (Momo, VNPay, bank transfer APIs) to automatically capture and confirm checkout payments.
* **Communication APIs:** Integrates with Zalo OA API, Viber, and SMTP email services for automated invoice delivery (UC-12) and purchase order messaging.

---

## 4.2 Quality Attributes

### 4.2.1 Usability
* **Training Time:**
  * **Cashiers & Pharmacists:** Can complete standard checkouts, scan prescription QRs, and process customer lookups after less than 30 minutes of training.
  * **StoreKeepers:** Can operate stock receiving, AI-assisted counts, and stocktaking audits within 1 hour of training.
  * **Administrators / Branch Managers:** Can manage catalog items, review staff revenue reports, and configure system RBAC with 1 hour of walkthrough training.
* **Task Completion Speed:** Standard operations (e.g., adding to cart, processing payments, checking drug interactions, or registering a supplier GRN) must be completed in under 1 minute or fewer than 4 clicks from the parent dashboard.
* **User-Friendly Layouts:** High contrast warnings (e.g., Red Alerts for expired batches, flashing banners for severe drug interactions) and search features like Vietnamese Natural Language Processing (UC-82) to minimize searching friction.

### 4.2.2 Reliability
* **Availability:** The system must achieve a minimum of **99.9% uptime** (24/7 online availability for the customer portal and retail POS), permitting scheduled off-peak maintenance operations.
* **Error Handling:** Clear, user-friendly errors must display for scan mismatches, database failures, or network interruptions. If a microservice fails, Kafka queues must preserve events and support automated retries without losing transactional states.
* **Data Integrity:** All financial entries, stock allocations, and FIFO deductions must execute under database transactions to prevent race conditions or double-deductions during peak sale periods.
* **Bug Management & SLA:**
  * **Critical Bugs** (e.g., checkout failure, wrong stock count deductions, RBAC bypasses): Must be resolved in production within **4 hours** of report.
  * **Significant Bugs** (e.g., incorrect reporting exports, UI layout distortions on certain browsers): Must be patched within **48 hours**.
  * **Minor Bugs** (e.g., minor typo errors, slow loading of non-essential charts): Must be fixed in the next weekly sprint deployment.

### 4.2.3 Performance
* **Response Time:**
  * **Read Cache-Hits (Redis):** Queries fetching active cache assets (e.g. user authentication checks, medicine details) must load in **< 10ms**.
  * **Standard Transactions (POS/Checkout):** Normal API actions (checkout confirmation, scan validation) must compile in **< 2 seconds**.
  * **Heavy Processing (AI Forecasts/Bulk Imports):** Must process asynchronously in the background, updating status UI in **< 5 seconds**.
* **Capacity:**
  * Support up to **2,000 concurrent active users** across the chain (pharmacists, managers, warehouse staff).
  * Accommodate up to **10,000 active customer portal sessions** simultaneously.
* **Throughput:** The API Gateway and message bus must handle a continuous throughput load of **100 Transactions Per Second (TPS)** without degradation.
* **Resource Efficiency:** Microservices must be optimized to restrict average server CPU and RAM consumption below **70%** during peak processing windows.

---

## 4.3 Security

* **Authentication:** A secure session framework using salted bcrypt password hashing and stateless JSON Web Tokens (JWT) for secure API requests.
* **Data Protection:** Standard SSL/TLS encryption for all data in transit (HTTPS/WSS). Customer personally identifiable information (PII) must be masked in general access profiles.
* **Access Control:** Enforcement of Role-Based Access Control (RBAC) at the gateway level. Staff members cannot access API endpoints outside their authorized group permissions.

---

## 4.4 Maintainability

* **Code Modularity:** Built using a decoupled event-driven microservices architecture (e.g. `auth-service`, `inventory-service`, `orders-service`, `supplier-service`, `user-service`, `ai-service`), allowing isolated upgrades of single services.
* **Automated Testing:** Implementation of unit tests (Jest) for core services and end-to-end integration tests for checkout, payment, and inventory deduction events.
* **Documentation & Logs:** Automated Swagger/OpenAPI documentation for all service endpoints. Comprehensive system audit logs (UC-59) recorded in MongoDB.
