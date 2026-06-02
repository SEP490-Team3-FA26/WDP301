# Hướng Dẫn Chạy Dự Án (Local Development Setup)

Tài liệu này hướng dẫn cách thiết lập và khởi chạy toàn bộ hệ thống dưới local, bao gồm hạ tầng (Message Broker Kafka, Redis Cache), Frontend (Vite) và các dịch vụ Backend (API Gateway, Auth Service).

---

## Cách Khuyến Nghị: Chạy Toàn Bộ Trên Docker (Không Cần `npm install` Cục Bộ) 🐳

Đây là cách tối ưu nhất giúp bạn khởi chạy toàn bộ hệ thống (gồm cả Frontend, Backend, Redis và Kafka) mà không cần cài đặt bất kỳ thư viện Node.js hay package nào trên máy thật của mình.

### Lệnh chạy duy nhất:

Tại thư mục gốc của dự án, chạy lệnh:

```bash
docker compose up
```

*Hệ thống sẽ tự động:*

1. Dựng container và cài đặt các package trong môi trường Docker cô lập (sử dụng volumes để đồng bộ code thời gian thực).
2. Khởi chạy hạ tầng **Kafka** (cổng `9092`) và **Redis** (cổng `6379`).
3. Khởi chạy **Backend** (API Gateway cổng `4000` & Auth Service).
4. Khởi chạy **Frontend App** (cổng `3000`).

Sử dụng Kubernetes + Helm (Nâng cao) ☸️

Cấu hình này phù hợp khi bạn cần kiểm thử tính năng của cluster Kubernetes, ArgoCD hoặc giám sát Prometheus.

### 1. Yêu cầu hệ thống

- **Docker Desktop**, **Minikube** (cấp ít nhất 4-5GB RAM).
- **kubectl**, **Helm** cài sẵn.

### 2. Các bước thực hiện

**Bước 1: Khởi động Cluster**

```bash
minikube start --memory=4096 --cpus=4
```

**Bước 2: Cài đặt hạ tầng (Helm)**
Thêm các Helm chart repository cần thiết và cập nhật:

```bash
kubectl create ns argocd && helm repo add argo https://argoproj.github.io/argo-helm
kubectl create ns kafka && helm repo add bitnami https://charts.bitnami.com/bitnami
kubectl create ns monitoring && helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

Cài đặt các Services:

```bash
# Cài đặt ArgoCD
helm install argocd argo/argo-cd -n argocd

# Cài đặt Kafka (Bắt buộc dùng v29.3.14 để tránh lỗi ImagePull của Bitnami)
helm install my-kafka bitnami/kafka -n kafka --version 29.3.14

# Cài đặt Prometheus Stack
helm install my-prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

**Bước 3: Thiết lập Port-forward (Mở kết nối ra localhost)**
Mở mỗi lệnh dưới đây trên một tab Terminal riêng để duy trì kết nối:

- **Kafka**: `kubectl port-forward svc/my-kafka -n kafka 9092:9092`
- **Prometheus**: `kubectl port-forward svc/my-prometheus-kube-prometh-prometheus -n monitoring 9090:9090`
- **ArgoCD**: `kubectl port-forward svc/argocd-server -n argocd 8080:443`

*Lấy mật khẩu đăng nhập admin của ArgoCD:*

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

**Bước 4: Khởi chạy Backend**

```bash
cd backend
npm install
npm run dev:all
```

---

## 3. Quy trình làm việc hàng ngày (Daily Workflow)

- **Khi bắt đầu làm việc**:
  - Với Docker: `cd backend && npm run infra:up`
  - Với Kubernetes: `minikube start` và chạy lại các lệnh `port-forward`.
- **Khi nghỉ làm (Giải phóng tài nguyên)**:
  - Với Docker: `cd backend && npm run infra:down`
  - Với Kubernetes: `minikube stop` để giải phóng RAM cho máy tính.
