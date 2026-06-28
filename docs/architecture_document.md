# Kiến Trúc Hệ Thống Vi Dịch Vụ Hướng Sự Kiện (Event-Driven Microservices Architecture)

## Hệ Thống WDP301 Enterprise Platform

Tài liệu này mô tả chi tiết kiến trúc kỹ thuật toàn diện cho hệ thống WDP301, chuyển đổi từ mô hình đơn khối (Monolith) sang kiến trúc **Event-Driven Microservices** sử dụng **Apache Kafka**, và **Redis Cache Layer**.

---

## 1. Sơ Đồ Tổng Quan Kiến Trúc (Architecture Topology)

Hệ thống được tổ chức thành các tầng tách biệt nhằm tối ưu hóa tính độc lập, hiệu năng chịu tải cao và khả năng khôi phục sau sự cố.

```mermaid
graph TD
    classDef client fill:#e1f5fe,stroke:#039be5,stroke-width:2px;
    classDef gw fill:#fff3e0,stroke:#fb8c00,stroke-width:2px;
    classDef broker fill:#e8f5e9,stroke:#43a047,stroke-width:2px;
    classDef service fill:#fce4ec,stroke:#d81b60,stroke-width:2px;
    classDef db fill:#eceff1,stroke:#546e7a,stroke-width:2px;

    User[External User / Browser]:::client -->|HTTP/HTTPS| Ingress[Kubernetes Ingress]:::gw

    subgraph K8sCluster["Kubernetes (K8s) Cluster"]
        Ingress -->|Route Frontend| Client[Client / Web App Pod]:::client
        Ingress -->|Route API| GW[API Gateway Pod]:::gw
        Client -->|REST API Requests| GW
        GW <-->|Cache Check / Set| Redis[(Redis Cache Pod)]:::db
        GW -->|Publish Event / Request| Kafka{Apache Kafka Pod}:::broker

        Kafka -->|Consume Event / Reply| UsersService[Users Microservice]:::service
        Kafka -->|Consume Event / Reply| OrdersService[Orders Microservice]:::service
    end

    UsersService <-->|CRUD Operations| MongoDB[(MongoDB Atlas - Cloud NoSQL)]:::db
    OrdersService <-->|SQL Operations| Neon[(Neon Serverless Postgres - Cloud SQL)]:::db

    style K8sCluster fill:#f9f9fb,stroke:#8e24aa,stroke-width:2px,stroke-dasharray: 5 5;
```

---

## 2. Luồng Dữ Liệu Chi Tiết (Data Flow Sequences)

### A. Luồng Đọc Dữ Liệu (Read Query Flow - Cache-Aside Pattern)

Mô hình này giúp giảm thiểu tối đa các truy vấn trực tiếp vào database bằng cách ưu tiên lấy từ bộ nhớ đệm tốc độ cao.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway
    participant Redis as Redis Cache
    participant Kafka as Kafka Broker
    participant US as Users Service
    participant DB as MongoDB

    Client->>GW: GET /api/users/:id
    GW->>Redis: Kiểm tra Key 'user:{id}' (Cache Check)
  
    alt Cache Hit (Có dữ liệu trong Redis)
        Redis-->>GW: Trả về thông tin User
        GW-->>Client: Trả về HTTP 200 OK (Phản hồi < 2ms)
    else Cache Miss (Không có trong Redis)
        Redis-->>GW: Trả về Null / Key Not Found
        GW->>Kafka: Emit Message 'user.get.by.id' (Request Topic)
        Kafka->>US: Consume Message
        US->>DB: Query: findById(id)
        DB-->>US: Trả về dữ liệu từ Disk
        US->>Kafka: Publish Response (Reply Topic)
        Kafka-->>GW: Nhận dữ liệu User
        GW->>Redis: Lưu Key 'user:{id}' (TTL = 1 Hour)
        GW-->>Client: Trả về HTTP 200 OK
    end
```

### B. Luồng Ghi Dữ Liệu (Write Transaction Flow - Event-Driven)

Luồng xử lý ghi áp dụng kiến trúc bất đồng bộ (Asynchronous) giúp Client nhận phản hồi ngay lập tức, trong khi hệ thống chạy xử lý ngầm ở phía sau.

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway
    participant Kafka as Kafka Broker
    participant US as Users Service
    participant DB as MongoDB
    participant Redis as Redis Cache

    Client->>GW: POST /api/users (Create User)
    GW->>Kafka: Emit Event 'user.created' (Topic)
    GW-->>Client: Trả về HTTP 202 Accepted (Xử lý bất đồng bộ thành công)
  
    Note over Kafka, US: Kafka đẩy Event tới Consumer khả dụng trong Group
    Kafka->>US: Consume Event 'user.created'
    US->>DB: Thực hiện insert vào MongoDB
    DB-->>US: Insert Success
    US->>Redis: Ghi đè/Cập nhật hoặc Xóa Cache Key 'user:{id}' (Cache Eviction)
    Note over US, Redis: Đảm bảo tính nhất quán dữ liệu (Cache Consistency)
```

---

## 3. Thành Phần Hệ Thống & Vai Trò (System Component Directory)

| Thành phần               | Công nghệ sử dụng     | Cấu hình & Vai trò chính                                                                                                                                                                                                                             |
| :------------------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API Gateway**      | NestJS REST API           | Điểm truy cập HTTP duy nhất. Xác thực (JWT Auth), kiểm tra/ghi Cache (Redis Store), xuất bản các event lên Kafka. Expose cổng `3000` cho Client kết nối trực tiếp. Không chứa logic nghiệp vụ và không kết nối trực tiếp DB. |
| **Message Broker**   | Apache Kafka (KRaft mode) | Kênh phân phối sự kiện (Event Bus). Lưu trữ bền vững các tin nhắn, đảm bảo hệ thống lỏng lẻo (loose coupling) và có thể mở rộng xử lý song song thông qua Partitioning.                                                        |
| **Cache Layer**      | Redis                     | Bộ nhớ đệm InMemory lưu trữ thực thể (User, Session). Sử dụng chiến lược Cache-Aside và TTL (Time to Live) để tự động làm mới tài nguyên.                                                                                         |
| **Microservices**    | NestJS Microservice       | Dịch vụ chuyên biệt (như `users-service`, `orders-service`). Nhận thông điệp từ Kafka, thực hiện xử lý nghiệp vụ nặng, tương tác trực tiếp với Database.                                                                      |
| **Database (NoSQL)** | MongoDB Atlas             | Hệ quản trị cơ sở dữ liệu phi quan hệ, lưu trữ thực thể động/không cấu trúc (ví dụ: User profile, logs) với hiệu năng ghi cao.                                                                                                     |
| **Database (SQL)**   | Neon Serverless Postgres  | Hệ quản trị cơ sở dữ liệu quan hệ hoàn chỉnh (SQL), lưu trữ các dữ liệu có cấu trúc chặt chẽ, tính giao dịch (ACID) cao (ví dụ: Orders, Billing).                                                                                |

---

## 4. Cấu Hình Triển Khai Hệ Thống (Infrastructure Code)

### A. Docker Compose Môi Trường Cục Bộ (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: wdp301-redis
    ports:
      - "6379:6379"
    command: redis-server --save 60 1 --loglevel warning
    networks:
      - wdp301-network

  # Apache Kafka (Kraft - Không cần Zookeeper)
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: wdp301-kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: 'CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT'
      KAFKA_ADVERTISED_LISTENERS: 'PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092'
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_PROCESS_ROLES: 'broker,controller'
      KAFKA_CONTROLLER_QUORUM_VOTERS: '1@kafka:29093'
      KAFKA_LISTENERS: 'PLAINTEXT://0.0.0.0:29092,CONTROLLER://0.0.0.0:29093,PLAINTEXT_HOST://0.0.0.0:9092'
      KAFKA_INTER_BROKER_LISTENER_NAME: 'PLAINTEXT'
      KAFKA_CONTROLLER_LISTENER_NAMES: 'CONTROLLER'
      KAFKA_LOG_DIRS: '/tmp/kraft-combined-logs'
      CLUSTER_ID: 'MkU3OEVBNTcwNTJENDM2Qk'
    networks:
      - wdp301-network

  # API Gateway Instance
  api-gateway:
    image: wdp301-api-gateway:latest
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - KAFKA_BROKERS=kafka:29092
    networks:
      - wdp301-network

  # Users Microservice Instances
  users-service:
    image: wdp301-users-service:latest
    environment:
      - KAFKA_BROKERS=kafka:29092
      - MONGODB_URI=mongodb://mongodb:27017/wdp301
      - REDIS_HOST=redis
    networks:
      - wdp301-network

networks:
  wdp301-network:
    driver: bridge
```

### B. Cấu Hình Kubernetes Manifests (Production Deployment)

Để triển khai lên môi trường Production (như K8s Cluster), các tài nguyên được cấu hình thông qua các Kubernetes Manifests:

#### 1. API Gateway Deployment & Service (`k8s/api-gateway.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: wdp301
  labels:
    app: api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: wdp301-api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: REDIS_HOST
          value: "redis-service"
        - name: KAFKA_BROKERS
          value: "kafka-service:9092"
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: wdp301
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
  selector:
    app: api-gateway
```

#### 2. Users Service Deployment & Service (`k8s/users-service.yaml`)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-service
  namespace: wdp301
  labels:
    app: users-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: users-service
  template:
    metadata:
      labels:
        app: users-service
    spec:
      containers:
      - name: users-service
        image: wdp301-users-service:latest
        env:
        - name: KAFKA_BROKERS
          value: "kafka-service:9092"
        - name: MONGODB_URI
          value: "mongodb://mongodb-service:27017/wdp301"
        - name: REDIS_HOST
          value: "redis-service"
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "250m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: users-service-service
  namespace: wdp301
spec:
  ports:
  - port: 3001
    targetPort: 3001
  selector:
    app: users-service
```

---

## 5. Pipeline CI/CD & Luồng GitOps (ArgoCD)

```mermaid
graph LR
    Developer[Lập trình viên] -->|Git Push Code| GitHub[Kho lưu trữ App Repo]
  
    subgraph Jenkins CI Pipeline
        GitHub -->|Webhook Trigger| Jenkins[Jenkins Server]
        Jenkins -->|1. Test & Lint| Test[Node.js Unit Test]
        Jenkins -->|2. Build Image| DockerBuild[Docker Daemon]
        DockerBuild -->|3. Push Image| DockerHub[Docker Hub / Registry]
        DockerHub -->|4. Update Tag| GitOpsUpdate[Sửa tag trong values.yaml]
    end

    GitOpsUpdate -->|Commit & Push| GitOpsRepo[GitOps Repo]

    subgraph ArgoCD GitOps
        GitOpsRepo -->|Khai báo K8s Manifests| ArgoCD[ArgoCD Controller]
        ArgoCD -->|Sync & Deploy| K8s[Kubernetes Cluster]
    end
```

### Các giai đoạn (Stages) chính của CI/CD:

1. **Kiểm tra mã nguồn (Checkout & Test):** Jenkins tải mã nguồn từ repo về, chạy đồng thời `npm run lint` và `npm test` cho cả `api-gateway` và `users-service`.
2. **Xây dựng Docker Images (Build Image):** Jenkins đóng gói 2 file Dockerfile tương ứng với 2 dịch vụ, đặt tag ảnh theo định dạng: `<commit-hash>` và `latest`.
3. **Quét bảo mật (Security Scan):** Sử dụng công cụ **Trivy** để kiểm tra mã độc và các lỗ hổng thư viện trong image vừa build.
4. **Đẩy ảnh lên Registry (Push Image):** Đẩy images đã đóng gói thành công lên Docker Hub hoặc AWS ECR.
5. **Cập nhật GitOps Repo:** Tự động sửa cấu hình tệp `values-override.yaml` (dành cho Helm Chart) trong repository gitops để khai báo tag ảnh mới nhất.
6. **Tự động đồng bộ hóa (ArgoCD Synchronization):** ArgoCD phát hiện sự thay đổi trong cấu hình GitOps, kích hoạt tiến trình Rolling Update trên Kubernetes Cluster để thay đổi các pod mà hoàn toàn không gây gián đoạn dịch vụ (Zero Downtime Deployment).

---

> [!NOTE]
> Bản thiết kế kiến trúc này đảm bảo tính chịu tải cao và khả năng khôi phục nhanh chóng cho toàn bộ hệ thống. Mọi thiết lập hạ tầng có thể triển khai cục bộ (Docker Compose) hoặc môi trường production (Kubernetes/EKS).
